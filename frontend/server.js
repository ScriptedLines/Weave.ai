import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import compression from 'compression'
import express from 'express'

const isVercel = Boolean(process.env.VERCEL)
const root = isVercel ? process.cwd() : path.dirname(fileURLToPath(import.meta.url))
const isProduction = process.env.NODE_ENV === 'production' || isVercel
const port = Number(process.env.PORT || (isProduction ? 3000 : 5173))
const clientDir = path.join(root, 'dist/client')
const publicDir = path.join(root, 'public')

const app = express()
app.disable('x-powered-by')
app.use(compression())

app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  next()
})

if (isProduction && !isVercel) {
  app.use(
    express.static(clientDir, {
      index: false,
      maxAge: '1y',
      immutable: true,
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('index.html')) {
          res.setHeader('Cache-Control', 'no-cache')
        }
      },
    }),
  )
  app.use(express.static(publicDir, { index: false }))
}

let vite
let productionAssetsPromise = null

async function getProductionAssets() {
  if (!productionAssetsPromise) {
    productionAssetsPromise = (async () => {
      const currentDir = path.dirname(fileURLToPath(import.meta.url))
      const cwd = process.cwd()

      const templateCandidates = [
        path.join(clientDir, 'index.html'),
        path.join(currentDir, 'dist/client/index.html'),
        path.join(cwd, 'dist/client/index.html'),
        path.join(cwd, 'frontend/dist/client/index.html'),
      ]

      let template = null
      for (const candidate of templateCandidates) {
        try {
          template = await fs.readFile(candidate, 'utf-8')
          break
        } catch {}
      }

      if (!template) {
        throw new Error(`SSR template index.html not found. Checked: ${templateCandidates.join(', ')}`)
      }

      const serverEntryCandidates = [
        './dist/server/entry-server.js',
        path.join(currentDir, 'dist/server/entry-server.js'),
        path.join(cwd, 'dist/server/entry-server.js'),
        path.join(cwd, 'frontend/dist/server/entry-server.js'),
      ]

      let render = null
      for (const candidate of serverEntryCandidates) {
        try {
          const mod = await import(candidate)
          if (typeof mod.render === 'function') {
            render = mod.render
            break
          }
        } catch {}
      }

      if (typeof render !== 'function') {
        throw new Error('SSR render function not found in dist/server/entry-server.js')
      }

      return { template, render }
    })()
  }
  return productionAssetsPromise
}

async function createDevelopmentServer() {
  const { createServer } = await import('vite')
  vite = await createServer({
    root,
    server: { middlewareMode: true },
    appType: 'custom',
  })
  app.use(vite.middlewares)
}

app.use(async (req, res, next) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    next()
    return
  }

  if (
    req.path.startsWith('/assets/') ||
    req.path.startsWith('/static/') ||
    req.path === '/favicon.svg'
  ) {
    next()
    return
  }

  try {
    const url = req.originalUrl
    let template
    let render

    if (isProduction) {
      const assets = await getProductionAssets()
      template = assets.template
      render = assets.render
    } else {
      template = await fs.readFile(path.join(root, 'index.html'), 'utf-8')
      template = await vite.transformIndexHtml(url, template)
      render = (await vite.ssrLoadModule('/src/entry-server.tsx')).render
    }

    try {
      const appHtml = render(url)
      const html = template.replace('<!--app-html-->', appHtml)
      res.status(200).set({ 'Content-Type': 'text/html; charset=utf-8' }).end(html)
    } catch (ssrError) {
      console.error(`[SSR] Rendering error on ${url}, falling back to SPA shell:`, ssrError)
      const fallbackHtml = template.replace('<!--app-html-->', '')
      res.status(200).set({ 'Content-Type': 'text/html; charset=utf-8' }).end(fallbackHtml)
    }
  } catch (error) {
    vite?.ssrFixStacktrace?.(error)
    next(error)
  }
})

app.use((error, _req, res, _next) => {
  console.error('[Server Error]:', error)
  if (!res.headersSent) {
    res.status(500).type('text/plain').end('Internal Server Error')
  }
})

if (!isVercel) {
  async function start() {
    if (isProduction) {
      await getProductionAssets()
    } else {
      await createDevelopmentServer()
    }

    app.listen(port, () => {
      console.log(`SSR server listening on http://localhost:${port}`)
    })
  }

  start().catch(error => {
    console.error('Failed to start server:', error)
    process.exit(1)
  })
}

export default app
