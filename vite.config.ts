import { copyFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import type { Plugin } from 'vite'
import react from '@vitejs/plugin-react'

// Match the BrowserRouter routes, not assets: Pages rewrites also override files.
const pagesRoutes = [
  '',
  'logic-and-math-games',
  'logic-and-math-games/quick-math',
  'logic-and-math-games/sequences',
  'logic-and-math-games/radix-rush',
  'logic-and-math-games/tape-recall',
  'logic-and-math-games/foldsight',
  'logic-and-math-games/magnitude-forge',
  'market-games',
  'market-games/hidden-spread',
  'market-games/basket-edge',
  'market-games/venue-gap',
  'market-games/delta-shield',
  'open-questions',
  'guide',
  'statistics',
  'statistics/:gameId',
]

function cloudflarePagesRoutes() {
  let base: string
  let outputDirectory: string
  return {
    name: 'cloudflare-pages-routes',
    configResolved(config) {
      base = config.base
      outputDirectory = resolve(config.root, config.build.outDir)
    },
    generateBundle(_options, bundle) {
      const packages = Object.values(bundle).flatMap(chunk => chunk.type === 'chunk'
        ? Object.entries(chunk.modules).filter(([, info]) => info.renderedLength !== 0)
          .flatMap(([id]) => id.replaceAll('\\', '/').match(/\/node_modules\/((?:@[^/]+\/)?[^/]+)/g)?.slice(-1).map(path => path.slice('/node_modules/'.length)) ?? [])
        : [])
      this.emitFile({ type: 'asset', fileName: '_bundled-packages.json', source: JSON.stringify([...new Set(packages)].sort()) })
      const paths = pagesRoutes.flatMap((route) => {
        const path = `${base}${route}`
        return route ? [path, `${path}/`] : [base.replace(/\/$/, '') || '/', base]
      })
      this.emitFile({
        type: 'asset',
        fileName: '_redirects',
        source: `${[...new Set(paths)].map((path) => `${path} ${base}app 200`).join('\n')}\n`,
      })
    },
    writeBundle() {
      // Rewrite to its extensionless URL: Pages redirects .html and index.html.
      copyFileSync(resolve(outputDirectory, 'index.html'), resolve(outputDirectory, 'app.html'))
    },
  } satisfies Plugin
}

export default defineConfig({ plugins: [react(), cloudflarePagesRoutes()] })
