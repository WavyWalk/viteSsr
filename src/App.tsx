import './App.css'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import {
  getStoreState,
  SerializableSubscriptionState,
} from './getStoreState.ts'
import { use } from 'react'
import { PromisifiedState, promisify } from './promisify.tsx'
import fs from 'node:fs'

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

const globalConfigStore = () => {
  return getStoreState<GlobalConfigStore>(
    'globalConfig',
    (update, hydrated) => {
      if (import.meta.env.SSR) {
        console.log(fs.existsSync('/foo.tmp'))
      }

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
      {store?.state.userName} joe {store.state.delayed?.value}
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
        <UserComp />
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
    </>
  )
}

export default App
