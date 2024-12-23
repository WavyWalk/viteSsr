import { renderToPipeableStream } from 'react-dom/server'
import App from './App.tsx'
import { Request, Response } from 'express'
import { serverAsyncStorage } from './ServerAsyncStorage.ts'
import { serializeStoreStateOnNode } from './getStoreState.ts'
import { Writable } from 'node:stream'

type Awaited<T> = T extends Promise<infer U> ? Awaited<U> : T

type ResolveNestedPromises<T> = T extends Function
  ? T
  : T extends Array<infer U>
    ? Array<ResolveNestedPromises<Awaited<U>>>
    : T extends object
      ? { [K in keyof T]: ResolveNestedPromises<Awaited<T[K]>> }
      : T

async function resolveNestedPromises<T>(
  input: T,
  seen = new WeakMap(),
): Promise<ResolveNestedPromises<T>> {
  if (input instanceof Promise) {
    return resolveNestedPromises(await input, seen) as ResolveNestedPromises<T>
  }

  if (Array.isArray(input)) {
    if (seen.has(input)) {
      return seen.get(input) as ResolveNestedPromises<T>
    }
    const resolvedArray: any[] = []
    seen.set(input, resolvedArray)
    for (const item of input) {
      resolvedArray.push(await resolveNestedPromises(item, seen))
    }
    return resolvedArray as ResolveNestedPromises<T>
  }

  if (input !== null && typeof input === 'object') {
    if (seen.has(input)) {
      return seen.get(input) as ResolveNestedPromises<T>
    }
    const resolvedObject: any = {}
    seen.set(input, resolvedObject)
    const entries = Object.entries(input)
    for (const [key, value] of entries) {
      resolvedObject[key] = await resolveNestedPromises(value, seen)
    }
    return resolvedObject as ResolveNestedPromises<T>
  }

  // If it's a primitive value, return it as is
  return input as ResolveNestedPromises<T>
}

export const render = (_req: Request, res: Response, template: string) => {
  return new Promise((resolve) => {
    serverAsyncStorage.run(new Map(), async () => {
      const buffers = []

      // Create a writable stream to accumulate the HTML chunks as Buffers
      const writable = new Writable({
        write(chunk, _, callback) {
          buffers.push(Buffer.from(chunk))
          callback()
        },
      })

      const stream = renderToPipeableStream(<App />, {
        onAllReady: async () => {
          const store = serverAsyncStorage.getStore()
          await resolveNestedPromises(store)

          const [uptoDehydrated, afterDehydrated] = template.split(
            '<!--dehydrated-state-->',
          )
          const [opening, closing] = afterDehydrated.split('<!--ssr-outlet-->')

          res.status(200).set({ 'Content-Type': 'text/html' })
          res.write(uptoDehydrated)
          res.write(
            `<script>window.__SERVER_STATE__ = new Map(Object.entries(${serializeStoreStateOnNode(store)}))</script>`,
          )
          res.write(opening)
          stream.pipe(writable)
          const fullBuffer = Buffer.concat(buffers)
          const html = fullBuffer.toString('utf-8')

          res.write(html)

          res.write(closing)
          res.end()

          resolve(undefined)
        },
      })
    })
  })
}
