// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import PageHeader from '../PageHeader.vue'

const stubs = { RouterLink: { props: ['to'], template: '<a :href="String(to)"><slot /></a>' } }

describe('PageHeader', () => {
  it('pageHeaderMarksLastCrumbCurrent', () => {
    const w = mount(PageHeader, {
      props: {
        title: 'Edit problem',
        breadcrumbs: [{ label: 'Problems', to: '/admin/problems' }, { label: 'two-sum', mono: true }],
      },
      global: { stubs },
    })
    const current = w.findAll('[aria-current="page"]')
    expect(current).toHaveLength(1)
    expect(current[0].text()).toBe('two-sum')
    expect(w.find('a').text()).toBe('Problems')
    expect(w.findAll('h1')).toHaveLength(1)
  })

  it('pageHeaderRendersActionsSlot', () => {
    const w = mount(PageHeader, {
      props: { title: 'Users', description: 'Manage accounts.' },
      slots: { actions: '<button id="act">New user</button>' },
    })
    expect(w.find('#act').exists()).toBe(true)
    expect(w.text()).toContain('Manage accounts.')
  })
})
