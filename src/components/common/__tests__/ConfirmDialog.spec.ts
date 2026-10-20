// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'
import ConfirmDialog from '../ConfirmDialog.vue'

let wrapper: VueWrapper | undefined

function mountDialog(props: Record<string, unknown> = {}) {
  wrapper = mount(ConfirmDialog, {
    attachTo: document.body,
    props: {
      open: true,
      title: 'Delete user “bob”?',
      description: 'They can no longer sign in.',
      confirmLabel: 'Delete',
      ...props,
    },
  })
  return wrapper
}

const button = (text: string) =>
  [...document.body.querySelectorAll('button')].find((b) => b.textContent?.trim() === text) as HTMLButtonElement

afterEach(() => {
  wrapper?.unmount()
  wrapper = undefined
  document.body.innerHTML = ''
})

describe('ConfirmDialog', () => {
  it('rendersTitleDescriptionAndLabel', async () => {
    mountDialog()
    await nextTick()
    expect(document.body.textContent).toContain('Delete user “bob”?')
    expect(document.body.textContent).toContain('They can no longer sign in.')
    expect(button('Delete')).toBeTruthy()
    expect(button('Cancel')).toBeTruthy()
  })

  it('emitsConfirmOnce', async () => {
    const w = mountDialog()
    await nextTick()
    button('Delete').click()
    await w.setProps({ busy: true })
    button('Delete').click()
    await nextTick()
    expect(w.emitted('confirm')).toHaveLength(1)
  })

  it('cancelEmitsClose', async () => {
    const w = mountDialog()
    await nextTick()
    button('Cancel').click()
    await nextTick()
    expect(w.emitted('update:open')?.[0]).toEqual([false])
  })

  it('busyBlocksClose', async () => {
    const w = mountDialog({ busy: true })
    await nextTick()
    const content = document.body.querySelector('[role="alertdialog"]') as HTMLElement
    content.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    button('Cancel').click()
    await nextTick()
    expect(button('Cancel').disabled).toBe(true)
    expect(button('Delete').disabled).toBe(true)
    expect(w.emitted('update:open')).toBeUndefined()
  })

  it('focusStartsOnCancel', async () => {
    mountDialog()
    await nextTick()
    await new Promise((r) => setTimeout(r, 20))
    expect(document.activeElement).toBe(button('Cancel'))
  })

  it('confirmDialogFocusesCancel', async () => {
    mountDialog()
    await nextTick()
    await new Promise((r) => setTimeout(r, 20))
    expect(document.activeElement).toBe(button('Cancel'))
    expect(document.body.querySelector('[data-slot="confirm-icon"]')).toBeTruthy()
    expect(document.body.querySelector('[data-slot="confirm-icon"]')?.hasAttribute('tabindex')).toBe(false)
  })

  it('toneWinsOverDestructive', async () => {
    mountDialog({ destructive: true, tone: 'neutral' })
    await nextTick()
    expect(document.body.querySelector('[data-slot="confirm-icon"]')?.getAttribute('data-tone')).toBe('neutral')
  })
})
