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

type GlobalConfigStore = SerializableSubscriptionState<{
  state: {
    userName: string
    delayed?: Promise<string>
  }
  actions: {
    setName: (value: string) => void
  }
}>

const globalConfigStore = () => {
  return getStoreState<GlobalConfigStore>(
    'globalConfig',
    (update, hydrated) => {
      const state = {
        userName: hydrated?.userName ?? 'joe',
        delayed: undefined,
      }

      return {
        state,
        actions: {
          setName: (value: string) => {
            state.delayed = delayed(5000)
            update()
          },
        },
      }
    },
  )
}

const UserComp = () => {
  const store = use(globalConfigStore())

  store.subscribeThisComponentToStateUpdates()

  console.log(this)

  return (
    <div>
      {store?.state.userName} delayed {store.state.delayed}
      <button
        onClick={() => {
          console.log('click')
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
