// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { useFetch } from '../useFetch'

type Deferred = { resolve: (v: unknown) => void }

function setup() {
  const pending: Deferred[] = []
  const service = (_signal: AbortSignal) =>
    new Promise((resolve) => pending.push({ resolve: (v) => resolve({ data: v }) })) as never
  let api!: ReturnType<typeof useFetch>
  mount(defineComponent({
    setup() {
      api = useFetch(service, { immediate: false })
      return () => null
    },
  }))
  return { api, pending }
}

describe('useFetch', () => {
  it('theNewestOfOverlappingRequestsWinsEvenIfAnOlderOneAnswersLast', async () => {
    const { api, pending } = setup()
    void api.execute()
    void api.execute()
    pending[1]!.resolve('new')
    await flushPromises()
    pending[0]!.resolve('old')
    await flushPromises()
    expect(api.data.value).toBe('new')
    expect(api.isLoading.value).toBe(false)
  })

  it('anOlderRequestFinishingDoesNotClearTheLoadingFlagOfANewerOne', async () => {
    const { api, pending } = setup()
    void api.execute()
    void api.execute()
    pending[0]!.resolve('old')
    await flushPromises()
    expect(api.isLoading.value).toBe(true)
    expect(api.data.value).toBeNull()
    pending[1]!.resolve('new')
    await flushPromises()
    expect(api.data.value).toBe('new')
    expect(api.isLoading.value).toBe(false)
  })
})
