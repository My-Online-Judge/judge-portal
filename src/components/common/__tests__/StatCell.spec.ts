// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import StatCell from '../StatCell.vue'

describe('StatCell', () => {
  it('loadingShowsTwoSkeletonBars', () => {
    const w = mount(StatCell, { props: { label: 'Users', value: 42, loading: true } })
    expect(w.findAll('.sk')).toHaveLength(2)
    expect(w.text()).not.toContain('42')
    expect(w.attributes('aria-busy')).toBe('true')
  })

  it('errorShowsUnavailableAndRetryEmits', async () => {
    const w = mount(StatCell, { props: { label: 'Active bans', error: true } })
    expect(w.text()).toContain('Unavailable')
    expect(w.find('[role="alert"]').exists()).toBe(true)
    const retry = w.find('button')
    expect(retry.attributes('aria-label')).toBe('Retry loading Active bans')
    await retry.trigger('click')
    expect(w.emitted('retry')).toHaveLength(1)
  })

  it('valueRendersWithSuffixAndContext', () => {
    const w = mount(StatCell, {
      props: { label: 'Judge servers', value: 2, suffix: '/ 2 online', context: 'Last heartbeat 4 s ago' },
    })
    expect(w.text()).toContain('2')
    expect(w.text()).toContain('/ 2 online')
    expect(w.text()).toContain('Last heartbeat 4 s ago')
    expect(w.findAll('.sk')).toHaveLength(0)
  })
})
