import { AsyncLocalStorage } from 'node:async_hooks'
import { SerializableSubscriptionState } from './getStoreState.ts'

export const serverAsyncStorage = new AsyncLocalStorage<
  Map<string, SerializableSubscriptionState | undefined>
>()
