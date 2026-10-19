// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'
import PaginationFooter from '../PaginationFooter.vue'
import type { Pagination } from '@/types/common'

let wrapper: VueWrapper | undefined

function pagination(over: Partial<Pagination> = {}): Pagination {
  const base = { page: 1, size: 20, totalElements: 137, totalPages: 7, hasPrev: true, hasNext: true, prevPage: 0, nextPage: 2 }
  return { ...base, ...over }
}

function mountFooter(p: Pagination) {
  wrapper = mount(PaginationFooter, { attachTo: document.body, props: { pagination: p } })
  return wrapper
}

afterEach(() => {
  wrapper?.unmount()
  wrapper = undefined
  document.body.innerHTML = ''
})

describe('PaginationFooter', () => {
  it('labelShowsRange', () => {
    const w = mountFooter(pagination())
    expect(w.text()).toContain('Showing 21 to 40 of 137 results')
  })

  it('zeroResultsShowsNoResultsAndNoControls', () => {
    const w = mountFooter(pagination({ page: 0, totalElements: 0, totalPages: 0, hasPrev: false, hasNext: false }))
    expect(w.text()).toContain('No results')
    expect(w.text()).not.toContain('Showing')
    expect(w.find('nav').exists()).toBe(false)
    expect(w.find('[role="combobox"]').exists()).toBe(false)
  })

  it('singlePageHidesPageButtons', () => {
    const w = mountFooter(pagination({ page: 0, totalElements: 5, totalPages: 1, hasPrev: false, hasNext: false }))
    expect(w.text()).toContain('Showing 1 to 5 of 5 results')
    expect(w.find('nav').exists()).toBe(false)
    expect(w.find('[role="combobox"]').exists()).toBe(true)
  })

  it('oneChangePagePerClick', async () => {
    const w = mountFooter(pagination())
    const next = w.get('[data-slot="pagination-next"]')
    await next.trigger('click')
    await nextTick()
    expect(w.emitted('change-page')).toEqual([[2]])

    const page5 = w.findAll('button').find((b) => b.text() === '5')!
    await page5.trigger('click')
    await nextTick()
    expect(w.emitted('change-page')).toEqual([[2], [4]])
  })

  it('sizeSelectEmitsUpdateSize', async () => {
    const w = mountFooter(pagination())
    await w.getComponent({ name: 'Select' }).vm.$emit('update:modelValue', '50')
    expect(w.emitted('update:size')).toEqual([[50]])
  })
})
