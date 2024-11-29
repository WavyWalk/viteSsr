import { StateEntry } from './src/App.tsx'

export {} // Ensure this file is treated as a module

declare global {
  interface Window {
    __STORE_PROMISES__: Map<string, unknown>
    __STORES__: Map<string, StateEntry | undefined>
  }
}
