import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import { SubscriptionState } from './SubscriptionState.ts'
import { use } from 'react'

export type StateEntry = {
  state: unknown
  initialized: boolean
}

const getStore = async (): Promise<Map<string, StateEntry | undefined>> => {
  if (import.meta.env.SSR) {
    const store = await import('./ServerAsyncStorage.ts')
      .then((module) => module.serverAsyncStorage)
      .then((serverAsyncStorage) => {
        return serverAsyncStorage.getStore()
      })

    if (!store) {
      throw new Error('Store not found')
    }

    return store as unknown as Map<string, StateEntry | undefined>
  } else {
    window.__STORES__ ??= new Map()
    return window.__STORES__
  }
}

class SerializableSubscriptionState<T> extends SubscriptionState {
  state?: T = undefined

  initialized = false

  update = () => {
    console.log()
    this._update()
  }
}

async function initState<X, T = Record<string, unknown>>(
  store: Map<string, StateEntry | undefined>,
  key: string,
  initializer: (update: SubscriptionState['update'], hydratedState: T) => X,
): Promise<X & SerializableSubscriptionState<T>> {
  const value = store.get(key)

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

  const userState = initializer(subscriptionState.update, hydratedState as T)

  Object.assign(subscriptionState, userState)
  // @ts-expect-error -- alls good
  store.set(key, subscriptionState)
  subscriptionState.initialized = true

  return subscriptionState as X & SerializableSubscriptionState<T>
}

if (!import.meta.env.SSR) {
  window.__STORE_PROMISES__ ??= new Map()
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function storeState<X, T = Record<string, any>>(
  key: string,
  initializer: (update: SubscriptionState['update'], hydratedState: T) => X,
): Promise<X & SerializableSubscriptionState<T>> {
  if (import.meta.env.SSR) {
    return getStore().then((store) => {
      return initState(store, key, initializer)
    })
  } else {
    window.__STORES__ ??= new Map()
    if (!window.__STORES__.has(key)) {
      // @ts-expect-error -- alls good
      window.__STORES__.set(key, initState(window.__STORES__, key, initializer))
    }
    // @ts-expect-error -- alls good
    return window.__STORES__.get(key) as Promise<
      X & SerializableSubscriptionState<T>
    >
  }
}

const delayed = async (ms: number) => {
  return new Promise<string>((resolve) => {
    console.log('running promise')
    return setTimeout(() => {
      if (import.meta.env.SSR) {
        resolve('done')
      } else {
        resolve('client doen')
      }
    }, ms)
  })
}

const globalConfigStore = () => {
  return storeState('globalConfig', (update, hydrated) => {
    const state = {
      userName: hydrated?.userName ?? 'joe',
      delayed: delayed(500),
    }

    return {
      state,
      setName: (value: string) => {
        state.userName = value
        update()
      },
    }
  })
}

const UserComp = () => {
  const state = use(globalConfigStore())

  state.subscribeToUpdates()

  return (
    <div>
      {state?.state?.userName} delayed : {state.state.delayed}
      <button
        onClick={() => {
          state?.setName?.('Chewbie')
        }}
      >
        change
      </button>{' '}
    </div>
  )
}

function App() {
  return (
    <>
      <div>
        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React</h1>
      <div className="card">
        <UserComp />
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
    </>
  )
}

export default App
