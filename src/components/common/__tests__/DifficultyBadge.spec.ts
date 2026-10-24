// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import DifficultyBadge from '../DifficultyBadge.vue'

describe('DifficultyBadge', () => {
  it('difficultyBadgeBars', () => {
    const w = mount(DifficultyBadge, { props: { level: 2 } })
    expect(w.text()).toContain('Medium')
  })

  it('difficultyBadgeUnknown', () => {
    const w = mount(DifficultyBadge, { props: { level: 9 } })
    expect(w.text()).toContain('Unknown')
  })

  it('rendersTextWithoutGlyph', () => {
    const w = mount(DifficultyBadge, { props: { level: 2 } })
    expect(w.text()).toBe('Medium')
    expect(w.find('svg').exists()).toBe(false)
    expect(w.classes()).toContain('text-warning-ink')
    expect(w.classes()).toContain('font-medium')
    // Text only: the root holds the label and no child element at all.
    expect(w.element.children.length).toBe(0)
  })
})
