import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import compression from 'compression'
import express from 'express'

const isVercel = Boolean(process.env.VERCEL)
const root = path.dirname(fileURLToPath(import.meta.url))
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

app.use(
  express.static(clientDir, {
    index: false,
    maxAge: '1y',
    immutable: true,
  }),
)
app.use(express.static(publicDir, { index: false }))

let vite = null
let cachedTemplate = null
let cachedRender = null

async function loadTemplate() {
  if (cachedTemplate) return cachedTemplate

  const templateCandidates = [
    path.join(root, 'dist/client/index.html'),
    path.join(root, 'dist/index.html'),
    path.join(process.cwd(), 'dist/client/index.html'),
    path.join(process.cwd(), 'dist/index.html'),
    path.join(process.cwd(), 'frontend/dist/client/index.html'),
    '/var/task/dist/client/index.html',
    '/var/task/dist/index.html',
    '/var/task/frontend/dist/client/index.html',
  ]

  for (const candidate of templateCandidates) {
    try {
      cachedTemplate = await fs.readFile(candidate, 'utf-8')
      if (cachedTemplate) return cachedTemplate
    } catch {}
  }

  try {
    cachedTemplate = await fs.readFile(path.join(root, 'index.html'), 'utf-8')
    if (cachedTemplate) return cachedTemplate
  } catch {}

  return null
}

async function loadRenderFunction() {
  if (cachedRender) return cachedRender

  const serverEntryCandidates = [
    path.join(root, 'dist/server/entry-server.js'),
    path.join(process.cwd(), 'dist/server/entry-server.js'),
    path.join(process.cwd(), 'frontend/dist/server/entry-server.js'),
    '/var/task/dist/server/entry-server.js',
    '/var/task/frontend/dist/server/entry-server.js',
  ]

  for (const candidate of serverEntryCandidates) {
    try {
      const fileUrl = pathToFileURL(candidate).href
      const mod = await import(fileUrl)
      if (typeof mod.render === 'function') {
        cachedRender = mod.render
        return cachedRender
      }
    } catch {}
  }

  return null
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

  const url = req.originalUrl

  try {
    let template = ''
    let render = null

    if (isProduction) {
      template = await loadTemplate()
      render = await loadRenderFunction()
    } else {
      template = await fs.readFile(path.join(root, 'index.html'), 'utf-8')
      template = await vite.transformIndexHtml(url, template)
      render = (await vite.ssrLoadModule('/src/entry-server.tsx')).render
    }

    if (!template) {
      next()
      return
    }

    let appHtml = ''
    if (typeof render === 'function') {
      try {
        appHtml = render(url) || ''
      } catch (ssrError) {
        console.warn(`[SSR] Render warning on ${url}, falling back to SPA shell:`, ssrError?.message || ssrError)
      }
    }

    const html = template.replace('<!--app-html-->', appHtml)
    res.status(200).set({ 'Content-Type': 'text/html; charset=utf-8' }).end(html)
  } catch (error) {
    console.error('[Server Error] Exception handling request:', error)
    if (cachedTemplate) {
      const fallbackHtml = cachedTemplate.replace('<!--app-html-->', '')
      res.status(200).set({ 'Content-Type': 'text/html; charset=utf-8' }).end(fallbackHtml)
      return
    }
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
      await loadTemplate()
      await loadRenderFunction()
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
