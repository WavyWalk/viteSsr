import { use } from 'react'
import { SerializableSubscriptionState } from './getStoreState.ts'

function isPlainObject(obj) {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    Object.getPrototypeOf(obj) === Object.prototype
  )
}

const usePromises = <T extends SerializableSubscriptionState>(store: T) => {
  for (const storeElement of Object.values(store.state)) {
    if (isPlainObject(storeElement) && 'promise' in storeElement) {
      use(storeElement.promise)
    }
  }
}

export const useIsomorphic = <T>(store: Promise<T>): T => {
  if (import.meta.env.SSR) {
    const awaited = use(store)
    // eslint-disable-next-line react-hooks/rules-of-hooks
    usePromises(awaited as SerializableSubscriptionState)

    return awaited
  } else {
    return (
      use(store) as SerializableSubscriptionState
    ).subscribeThisComponentToStateUpdates() as T
  }
}
