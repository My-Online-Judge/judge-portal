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

  it('rendersTextWithoutGlyph', () => {
    const w = mount(DifficultyBadge, { props: { level: 2 } })
    expect(w.text()).toBe('Medium')
    expect(w.find('svg').exists()).toBe(false)
    expect(w.classes()).toContain('text-warning-ink')
    expect(w.classes()).toContain('font-medium')
    // Text only: no visible element besides the label.
    const visible = Array.from(w.element.children).filter((c) => !c.hasAttribute('hidden'))
    expect(visible).toHaveLength(0)
  })
})
