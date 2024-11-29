import { AsyncLocalStorage } from 'node:async_hooks'

export const serverAsyncStorage = new AsyncLocalStorage<Map<string, string>>()
