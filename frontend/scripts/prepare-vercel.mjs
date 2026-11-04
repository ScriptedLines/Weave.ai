import { cp, mkdir, rm } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const frontendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const source = path.join(frontendDir, 'dist', 'client', 'assets')
const target = path.join(frontendDir, 'public', 'assets')
const htmlSource = path.join(frontendDir, 'dist', 'client', 'index.html')
const htmlTarget = path.join(frontendDir, 'dist', 'index.html')
const command = process.argv[2]

if (command === 'clean') {
  await rm(target, { recursive: true, force: true })
} else if (command === 'copy') {
  await rm(target, { recursive: true, force: true })
  await mkdir(target, { recursive: true })
  await cp(source, target, { recursive: true })
  try {
    await cp(htmlSource, htmlTarget)
  } catch {}
  console.log(`Copied ${path.relative(frontendDir, source)} to ${path.relative(frontendDir, target)}`)
} else {
  console.error('Usage: node scripts/prepare-vercel.mjs <clean|copy>')
  process.exit(1)
}
