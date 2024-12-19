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
  window.__STORES__ ??= new Map()
  return window.__STORES__
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
  },
> extends SubscriptionState {
  state!: T['state']
  actions!: T['actions']

  initialized = false

  update = (state?: T) => {
    this.state = state ?? this.state
    console.log(this)
    this._update()
  }
}

async function initState<X, T = Record<string, unknown>>(
  rootStore: Map<string, StateEntry | undefined>,
  key: string,
  initializer: (update: SubscriptionState['update'], hydratedState: T) => X,
): Promise<X & SerializableSubscriptionState<T>> {
  const value = rootStore.get(key)

  if (value?.initialized) {
    return value as X & SerializableSubscriptionState<T>
  }

  let hydratedState
  if (import.meta.env.SSR) {
    hydratedState = undefined
  } else {
    hydratedState = value?.state
  }

  const subscriptionState = new SerializableSubscriptionState()
  subscriptionState.state = hydratedState as unknown

  const initializedState = initializer(
    subscriptionState.update,
    hydratedState as T,
  )

  Object.assign(subscriptionState, initializedState)
  // @ts-expect-error -- all's good we're coolin'
  rootStore.set(key, subscriptionState)
  subscriptionState.initialized = true

  return subscriptionState as X & SerializableSubscriptionState<T>
}

const initOrReuseStoreStateInNode = <FINAL_STATE_TYPE, STATE_TYPE>(
  key: string,
  initializer: (
    update: SubscriptionState['update'],
    hydratedState: STATE_TYPE,
  ) => FINAL_STATE_TYPE,
) =>
  getRootStore().then((store) => {
    return initState(store, key, initializer)
  })

const initOrReuseStoreStateInBrowser = <FINAL_STATE_TYPE, STATE_TYPE>(
  key: string,
  initializer: (
    update: SubscriptionState['update'],
    hydratedState: STATE_TYPE,
  ) => FINAL_STATE_TYPE,
) => {
  window.__STORES__ ??= new Map()
  if (!window.__STORES__.has(key)) {
    // @ts-expect-error -- alls good
    window.__STORES__.set(key, initState(window.__STORES__, key, initializer))
  }
  // @ts-expect-error -- alls good
  return window.__STORES__.get(key) as Promise<
    FINAL_STATE_TYPE & SerializableSubscriptionState<STATE_TYPE>
  >
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
    return initOrReuseStoreStateInNode(key, factory) as unknown as Promise<T>
  } else {
    return initOrReuseStoreStateInBrowser(key, factory) as unknown as Promise<T>
  }
}
