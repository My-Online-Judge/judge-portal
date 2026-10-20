// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import DifficultyBadge from '../DifficultyBadge.vue'

describe('DifficultyBadge', () => {
  it('difficultyBadgeBars', () => {
    const w = mount(DifficultyBadge, { props: { level: 2 } })
    expect(w.text()).toContain('Medium')
    expect(w.findAll('[data-bar]')).toHaveLength(3)
    expect(w.findAll('[data-bar="filled"]')).toHaveLength(2)
  })

  it('difficultyBadgeUnknown', () => {
    const w = mount(DifficultyBadge, { props: { level: 9 } })
    expect(w.text()).toContain('Unknown')
    expect(w.findAll('[data-bar="filled"]')).toHaveLength(0)
  })
})
