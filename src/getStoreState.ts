/* eslint-disable @typescript-eslint/no-explicit-any */

import { SubscriptionState } from './SubscriptionState.ts'

export type StateEntry = {
  state: unknown
  initialized: boolean
}

async function getRootStoreInNode() {
  const store = await import('./ServerAsyncStorage.ts')
    .then((module) => module.serverAsyncStorage)
    .then((serverAsyncStorage) => {
      return serverAsyncStorage.getStore()
    })

  if (!store) {
    throw new Error('Store not found')
  }

  return store as unknown as Map<string, StateEntry | undefined>
}

const getStoreRootStoreInBrowser = () => {
  window.__SERVER_STATE__ ??= new Map()
  return window.__SERVER_STATE__
}

const getRootStore = async (): Promise<Map<string, StateEntry | undefined>> => {
  if (import.meta.env.SSR) {
    return await getRootStoreInNode()
  } else {
    return getStoreRootStoreInBrowser()
  }
}

export class SerializableSubscriptionState<
  T extends {
    state: Record<string, unknown>
    actions: Record<string, CallableFunction>
  } = { state: Record<string, any>; actions: Record<string, CallableFunction> },
> extends SubscriptionState {
  state!: T['state']
  actions!: T['actions']

  initialized = false

  update = (state?: T) => {
    this.state = state ?? this.state
    this._update()
  }
}

const initState = async (
  stateValue: StateEntry,
  initializer: (
    update: SerializableSubscriptionState['update'],
    hydratedState: SerializableSubscriptionState['state'],
  ) => Omit<
    SerializableSubscriptionState,
    'update' | 'initialized' | 'subscribeThisComponentToStateUpdates'
  >,
): Promise<SerializableSubscriptionState> => {
  let hydratedState
  if (import.meta.env.SSR) {
    hydratedState = undefined
  } else {
    hydratedState = stateValue?.state
  }

  const subscriptionState = new SerializableSubscriptionState()

  const initializedState = initializer(
    subscriptionState.update,
    hydratedState as SerializableSubscriptionState['state'],
  )

  Object.assign(subscriptionState, initializedState)

  return subscriptionState as SerializableSubscriptionState
}

const initOrReuseStoreStateInNode = (
  key: string,
  initializer: (
    update: SerializableSubscriptionState['update'],
    hydratedState: SerializableSubscriptionState['state'],
  ) => Omit<
    SerializableSubscriptionState,
    'update' | 'initialized' | 'subscribeThisComponentToStateUpdates'
  >,
) =>
  getRootStore().then((store) => {
    return initState(store.get('key')!, initializer).then((state) => {
      store.set(key, state)
      return state
    })
  })

const initOrReuseStoreStateInBrowser = (
  key: string,
  initializer: (
    update: SerializableSubscriptionState<any>['update'],
    hydratedState: SerializableSubscriptionState<any>['state'],
  ) => Omit<
    SerializableSubscriptionState,
    'update' | 'initialized' | 'subscribeThisComponentToStateUpdates'
  >,
): Promise<unknown> => {
  window.__SERVER_STATE__ ??= new Map()
  window.__STORE_INSTANCES__ ??= new Map()

  const serverState = window.__SERVER_STATE__.get(key)
  const valueOnStore = window.__STORE_INSTANCES__.get(key)

  if (!valueOnStore) {
    window.__STORE_INSTANCES__.set(key, initState(serverState!, initializer))
  }
  return window.__STORE_INSTANCES__.get(key) as unknown as Promise<unknown>
}

export const getStoreState = <T extends SerializableSubscriptionState<any>>(
  key: string,
  factory: (
    update: (state?: T['state']) => void,
    hydrated?: T['state'] | undefined,
  ) => Omit<
    T,
    'update' | 'initialized' | 'subscribeThisComponentToStateUpdates'
  >,
): Promise<T> => {
  if (import.meta.env.SSR) {
    return initOrReuseStoreStateInNode(key, factory) as Promise<T>
  } else {
    return initOrReuseStoreStateInBrowser(key, factory) as Promise<T>
  }
}

export const serializeStoreStateOnNode = (
  store: Map<string, SerializableSubscriptionState | undefined> | undefined,
): string => {
  const serializedStore: Record<string, StateEntry> = {}

  if (!store) {
    return '{}'
  }

  store.forEach((value, key) => {
    if (value) {
      serializedStore[key] = {
        state: value.state,
        initialized: false,
      }
    }
  })

  return JSON.stringify(serializedStore)
}
