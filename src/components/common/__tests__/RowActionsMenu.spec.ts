// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'
import { Pencil, Trash2 } from 'lucide-vue-next'
import RowActionsMenu from '../RowActionsMenu.vue'
import type { RowAction } from '../rowActions'

let wrapper: VueWrapper | undefined

async function open(items: RowAction[], label = 'bob') {
  wrapper = mount(RowActionsMenu, { attachTo: document.body, props: { items, label } })
  const trigger = wrapper.get('button')
  await trigger.trigger('click')
  await nextTick()
  await nextTick()
  return trigger
}

afterEach(() => {
  wrapper?.unmount()
  wrapper = undefined
  document.body.innerHTML = ''
})

describe('RowActionsMenu', () => {
  it('destructiveItemsRenderLastAfterSeparator', async () => {
    await open([
      { label: 'Delete…', icon: Trash2, onSelect: vi.fn(), destructive: true },
      { label: 'Edit', icon: Pencil, onSelect: vi.fn() },
      { label: 'Roles', icon: Pencil, onSelect: vi.fn() },
      { label: 'Disable…', icon: Trash2, onSelect: vi.fn(), destructive: true },
    ])
    const menu = document.body.querySelector('[role="menu"]') as HTMLElement
    const kids = [...menu.children].map((c) =>
      c.getAttribute('role') === 'separator' ? '|' : c.textContent?.trim(),
    )
    expect(kids).toEqual(['Edit', 'Roles', '|', 'Delete…', 'Disable…'])
    const del = [...menu.querySelectorAll('[role="menuitem"]')].find((e) => e.textContent?.includes('Delete'))!
    expect(del.className).toContain('text-destructive')
  })

  it('ariaLabelUsesLabel', () => {
    wrapper = mount(RowActionsMenu, {
      attachTo: document.body,
      props: { items: [{ label: 'Edit', icon: Pencil, onSelect: vi.fn() }], label: 'bob' },
    })
    expect(wrapper.get('button').attributes('aria-label')).toBe('Actions for bob')
  })

  it('selectCallsHandler', async () => {
    const onSelect = vi.fn()
    await open([{ label: 'Edit', icon: Pencil, onSelect }])
    const item = document.body.querySelector('[role="menuitem"]') as HTMLElement
    item.click()
    await nextTick()
    expect(onSelect).toHaveBeenCalledTimes(1)
  })
})
