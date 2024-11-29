import { renderToPipeableStream } from 'react-dom/server'
import App from './App.tsx'
import { Request, Response } from 'express'
import { serverAsyncStorage } from './ServerAsyncStorage.ts'

export const render = (_req: Request, res: Response, template: string) => {
  return new Promise(() => {
    serverAsyncStorage.run(new Map(), () => {
      const stream = renderToPipeableStream(<App />, {
        onAllReady: async () => {
          const store = serverAsyncStorage.getStore()
          console.log(store?.get('foo'))

          const [uptoDehydrated, afterDehydrated] = template.split(
            '<!--dehydrated-state-->',
          )
          const [opening, closing] = afterDehydrated.split('<!--ssr-outlet-->')

          res.status(200).set({ 'Content-Type': 'text/html' })
          res.write(uptoDehydrated)
          res.write('<script>window.__DEHYDTRATED_STATE__ = {foo: 1}</script>')
          res.write(opening)
          stream.pipe(res)
          res.write(closing)
          res.end()
        },
      })
    })
  })
}
