// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h, ref, vShow, withDirectives } from 'vue'
import { revealConsole } from '@/lib/consoleReveal'

describe('revealConsole', () => {
  it('revealSwitchesToCodeThenScrolls', async () => {
    // The mobile layout: the console sits in the Code view, hidden with v-show while Problem is shown.
    const view = ref<'problem' | 'code'>('problem')
    const w = mount(
      defineComponent(() => () => withDirectives(h('div', { id: 'console' }), [[vShow, view.value === 'code']])),
      { attachTo: document.body },
    )
    const el = w.get('#console').element as HTMLElement
    const displayWhenScrolled: string[] = []
    el.scrollIntoView = vi.fn(() => displayWhenScrolled.push(el.style.display))

    await revealConsole(() => (view.value = 'code'), () => el)

    expect(view.value).toBe('code')
    expect(el.scrollIntoView).toHaveBeenCalledWith({ block: 'nearest' })
    // It scrolled only after the DOM showed the console.
    expect(displayWhenScrolled).toEqual([''])
    w.unmount()
  })

  it('scrolls straight to the console when nothing hides it', async () => {
    const el = { scrollIntoView: vi.fn() } as unknown as HTMLElement

    await revealConsole(undefined, () => el)

    expect(el.scrollIntoView).toHaveBeenCalledOnce()
  })
})
