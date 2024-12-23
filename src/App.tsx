import './App.css'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import {
  getStoreState,
  SerializableSubscriptionState,
} from './getStoreState.ts'
import { Suspense } from 'react'
import { PromisifiedState, promisify } from './promisify.tsx'
import { useIsomorphic } from './useIsomorphic.ts'

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
      const state: GlobalConfigStore['state'] = {
        userName: hydrated?.userName ?? 'joe',
        delayed: promisify(hydrated?.delayed, update, async () =>
          delayed(500, 'hydro'),
        ),
      }

      const actions: GlobalConfigStore['actions'] = {
        setName: async (name: string) => {
          state.userName = name
          state.delayed = promisify(state.delayed, update, () =>
            delayed(5000, 'call bitch'),
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

type DependentState = SerializableSubscriptionState<{
  state: { delayedFromGlobalDependent: PromisifiedState; other: string }
  actions: {}
}>

const someStore = () => {
  return getStoreState<DependentState>('dependent', (update, hydrated) => {
    return {
      state: {
        other: 'Other',
        delayedFromGlobalDependent: promisify(
          hydrated?.delayedFromGlobalDependent,
          update,
          async () => {
            const global = await globalConfigStore()
            await global.state.delayed.promise

            return global.state.delayed.value + '-fromOther'
          },
        ),
      },
      actions: {},
    }
  })
}

const UserComp = () => {
  const store = useIsomorphic(globalConfigStore())
  const otherStore = useIsomorphic(someStore())

  return (
    <div>
      {JSON.stringify(store?.state, null, 2)}
      {JSON.stringify(otherStore?.state, null, 2)}
      {/*{otherStore.state.delayedFromGlobalDependent?.value}*/}
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

const Account = () => {
  const otherStore = useIsomorphic(globalConfigStore())

  return (
    <div>
      <p>Account</p>
      <p>{otherStore.state.userName}</p>
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
        <Suspense>
          <UserComp />
          <Account />
        </Suspense>
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
    </>
  )
}

export default App
