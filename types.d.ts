import {
  SerializableSubscriptionState,
  StateEntry,
} from './src/getStoreState.ts'

export {} // Ensure this file is treated as a module

declare global {
  interface Window {
    __STORE_PROMISES__: Map<string, unknown>
    __SERVER_STATE__: Map<string, StateEntry | undefined>
    __STORE_INSTANCES__: Map<string, Promise<SerializableSubscriptionState>>
  }
}
