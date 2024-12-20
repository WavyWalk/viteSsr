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
