import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import {
  getStoreState,
  SerializableSubscriptionState,
} from './getStoreState.ts'
import { Suspense, use } from 'react'

if (!import.meta.env.SSR) {
  window.__STORE_PROMISES__ ??= new Map()
}

const delayed = async (ms: number, value = 'joe') => {
  return new Promise<string>((resolve) => {
    return setTimeout(() => {
      if (import.meta.env.SSR) {
        resolve(value)
      } else {
        resolve(value)
      }
    }, ms)
  })
}

type GlobalConfigStore = SerializableSubscriptionState<{
  state: {
    userName: string
    delayed: PromisifiedState
  }
  actions: Readonly<{
    setName: (value: string) => void
  }>
}>

export type PromisifiedState = {
  promise: Promise<unknown>
  loading: boolean
  value?: any
  error?: any
  settled: boolean
}

export const promisify = (
  hydrated: PromisifiedState | undefined,
  update: () => void,
  fetcher: () => Promise<unknown>,
): PromisifiedState => {
  const valueToUse = hydrated ?? {
    promise: fetcher()
      .then((it) => {
        Object.assign(valueToUse, {
          value: it,
          loading: false,
          error: false,
          settled: true,
        })
        update()
      })
      .catch((e) => {
        Object.assign(valueToUse, {
          value: undefined,
          loading: false,
          error: e,
          settled: true,
        })
        update()
      }),
    loading: true,
    error: false,
    value: undefined,
    settled: false,
  }

  if (!import.meta.env.SSR) {
    if (valueToUse.settled && Object.keys(valueToUse.promise).length === 0) {
      valueToUse.promise = Promise.resolve(valueToUse.value)
    }

    if (!valueToUse.settled && Object.keys(valueToUse.promise).length === 0) {
      valueToUse.promise = Promise.resolve(undefined)
    }
  }

  if (!valueToUse.promise && !valueToUse.settled) {
    valueToUse.loading = true
    valueToUse.settled = false
    valueToUse.promise = fetcher()
      .then((it) => {
        valueToUse.value = it
        valueToUse.loading = false
        valueToUse.error = false
        valueToUse.settled = true
        update()
      })
      .catch((e) => {
        valueToUse.value = undefined
        valueToUse.loading = false
        valueToUse.error = e
        valueToUse.settled = true
        update()
      })
  }

  return valueToUse
}

const globalConfigStore = () => {
  return getStoreState<GlobalConfigStore>(
    'globalConfig',
    (update, hydrated) => {
      const state: GlobalConfigStore['state'] = {
        userName: hydrated?.userName ?? 'joe',
        delayed: promisify(hydrated?.delayed, update, () =>
          delayed(500, 'hydro'),
        ),
      }

      const actions: GlobalConfigStore['actions'] = {
        setName: (name: string) => {
          state.userName = name
          state.delayed = promisify(undefined, update, () =>
            delayed(200, 'call bitch'),
          )
          update()
        },
      }

      return {
        state,
        actions,
      }
    },
  )
}

const UserComp = () => {
  const store = use(globalConfigStore())
  store.subscribeThisComponentToStateUpdates()
  if (import.meta.env.SSR) {
    use(store.state.delayed.promise)
  }

  return (
    <div>
      {store?.state.userName} asd as wer delayed {store.state.delayed?.value}
      <button
        onClick={() => {
          store?.actions.setName('Chewbie')
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
        <Suspense fallback={'loading'}>
          <UserComp />
        </Suspense>
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
    </>
  )
}

export default App
