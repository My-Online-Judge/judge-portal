// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ListStateShell from '../ListStateShell.vue'

const slots = { default: '<p data-test="rows">rows</p>' }
function mountShell(props: Record<string, unknown>, s: Record<string, string> = slots) {
  return mount(ListStateShell, { props: { loading: false, hasData: false, empty: false, ...props }, slots: s })
}

describe('ListStateShell', () => {
  it('firstLoadShowsSkeleton', () => {
    const w = mountShell({ loading: true }, { ...slots, skeleton: '<i data-test="sk" />' })
    expect(w.find('[data-test="sk"]').exists()).toBe(true)
    expect(w.find('[data-test="rows"]').exists()).toBe(false)
  })

  it('defaultSkeletonRenders', () => {
    const w = mountShell({ loading: true })
    expect(w.find('[data-test="rows"]').exists()).toBe(false)
    expect(w.find('.sk').exists()).toBe(true)
  })

  it('errorWithoutDataShowsErrorCard', () => {
    const w = mountShell({ error: 'boom' })
    expect(w.text()).toContain("Couldn't load")
    expect(w.find('[data-test="rows"]').exists()).toBe(false)
  })

  it('emptyShowsEmptyCard', () => {
    const w = mountShell({ hasData: true, empty: true }, { ...slots, empty: '<b data-test="em" />' })
    expect(w.find('[data-test="em"]').exists()).toBe(true)
    expect(w.find('[data-test="rows"]').exists()).toBe(false)
  })

  it('refetchKeepsRowsDimmedAndBusy', () => {
    const w = mountShell({ loading: true, hasData: true, error: 'x' })
    expect(w.find('[data-test="rows"]').exists()).toBe(true)
    const wrap = w.get('[aria-busy="true"]')
    expect(wrap.classes()).toContain('ls-refetching')
  })

  it('errorWithDataShowsInlineBannerAboveRows', async () => {
    const w = mountShell({ hasData: true, error: 'x' })
    const banner = w.get('[role="alert"]')
    expect(banner.text()).toContain("Couldn't refresh")
    expect(w.find('[data-test="rows"]').exists()).toBe(true)
    await banner.get('button').trigger('click')
    expect(w.emitted('retry')).toHaveLength(1)
  })

  it('noBannerWithoutError', () => {
    expect(mountShell({ hasData: true }).find('[role="alert"]').exists()).toBe(false)
  })

  it('idleRendersDefaultNotBusy', () => {
    const w = mountShell({ hasData: true })
    expect(w.get('[data-test="rows"]').exists()).toBe(true)
    expect(w.get('[aria-busy]').attributes('aria-busy')).toBe('false')
  })

  it('retryEmitted', async () => {
    const w = mountShell({ error: 'boom' })
    await w.get('button').trigger('click')
    expect(w.emitted('retry')).toHaveLength(1)
  })

  it('errorSlotReceivesRetry', async () => {
    const w = mountShell({ error: 'boom' }, { ...slots, error: '<template #error="{ retry }"><button data-test="r" @click="retry">r</button></template>' })
    await w.get('[data-test="r"]').trigger('click')
    expect(w.emitted('retry')).toHaveLength(1)
  })

  it('skeletonRendersRequestedRows', () => {
    const w = mountShell({ loading: true, rows: 6 })
    expect(w.findAll('.sk')).toHaveLength(6)
  })

  it('refetchShowsProgressbarAndKeepsRows', () => {
    const w = mountShell({ loading: true, hasData: true })
    const bar = w.get('[role="progressbar"]')
    expect(bar.attributes('aria-label')).toBe('Refreshing')
    expect(w.find('[data-test="rows"]').exists()).toBe(true)
    expect(w.get('[aria-busy="true"]').exists()).toBe(true)
    expect(mountShell({ hasData: true }).find('[role="progressbar"]').exists()).toBe(false)
  })

  it('filteredEmptyEmitsClearFilters', async () => {
    const w = mountShell({ hasData: true, empty: true, filtered: true, filterSummary: 'quy hoạch' })
    expect(w.text()).toContain('No results match quy hoạch')
    await w.get('button').trigger('click')
    expect(w.emitted('clear-filters')).toHaveLength(1)
  })

  it('errorWithDataStripCopy', () => {
    const w = mountShell({ hasData: true, error: 'x' })
    expect(w.get('[role="alert"]').text()).toContain("Couldn't refresh. Showing the last results.")
  })
})
