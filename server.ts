import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import express, { Request, Response, NextFunction } from 'express'
import { createServer as createViteServer, type ViteDevServer } from 'vite'
import { serverAsyncStorage } from './src/ServerAsyncStorage'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

async function renderSsr(
  req: Request,
  vite: ViteDevServer,
  res: Response,
  next: NextFunction,
) {
  const url = req.originalUrl

  try {
    // 1. Read index.html
    let template = fs.readFileSync(
      path.resolve(__dirname, 'index.html'),
      'utf-8',
    )

    // 2. Apply Vite HTML transforms. This injects the Vite HMR client,
    //    and also applies HTML transforms from Vite plugins, e.g. global
    //    preambles from @vitejs/plugin-react
    template = await vite.transformIndexHtml(url, template)

    // 3. Load the server entry. ssrLoadModule automatically transforms
    //    ESM source code to be usable in Node.js! There is no bundling
    //    required, and provides efficient invalidation similar to HMR.
    const { render } = await vite.ssrLoadModule('/src/entry-server.tsx')

    render(req, res, template)
  } catch (e) {
    // If an error is caught, let Vite fix the stack trace so it maps back
    // to your actual source code.
    vite.ssrFixStacktrace(e as Error)
    next(e)
  }
}

async function createServer() {
  const app = express()

  // Create Vite server in middleware mode and configure the app type as
  // 'custom', disabling Vite's own HTML serving logic so parent server
  // can take control
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'custom',
  })

  // Use vite's connect instance as middleware. If you use your own
  // express router (express.Router()), you should use router.use
  // When the server restarts (for example after the user modifies
  // vite.config.js), `vite.middlewares` is still going to be the same
  // reference (with a new internal stack of Vite and plugin-injected
  // middlewares). The following is valid even after restarts.
  app.use(vite.middlewares)

  app.use('*', async (req, res, next) => {
    await renderSsr(req, vite, res, next)
  })

  console.log('listening on http://localhost:3000')
  app.listen(3000)
}

createServer()
