// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { defineComponent } from 'vue'

import AdminLayout from '../AdminLayout.vue'
import { useAuthStore } from '@/stores/auth'

const Blank = defineComponent({ template: '<div />' })

let wrapper: VueWrapper | undefined

function stubDesktop(matches: boolean) {
    window.matchMedia = vi.fn().mockImplementation(() => ({
        matches,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
    })) as unknown as typeof window.matchMedia
}

async function mountAt(path: string, permissions = ['problem:update', 'user:read', 'role:read']) {
    setActivePinia(createPinia())
    useAuthStore().user = {
        id: 'me', name: 'Binh Tran', username: 'binh', email: 'b@x.io', roles: [],
        permissions,
    } as never
    const router = createRouter({
        history: createMemoryHistory(),
        routes: [
            { path: '/problems', component: Blank },
            {
                path: '/admin',
                component: AdminLayout,
                children: [
                    { path: '', name: 'AdminDashboard', component: Blank },
                    { path: 'problems', name: 'AdminProblems', component: Blank },
                    { path: 'problems/:slug', name: 'AdminProblemDetail', component: Blank },
                    { path: 'submissions', name: 'AdminSubmissions', component: Blank },
                    { path: 'contests', name: 'AdminContests', component: Blank },
                    { path: 'users', name: 'AdminUsers', component: Blank },
                    { path: 'roles', name: 'AdminRoles', component: Blank },
                ],
            },
        ],
    })
    await router.push(path)
    await router.isReady()
    wrapper = mount({ template: '<RouterView />' }, { global: { plugins: [router] }, attachTo: document.body })
    await flushPromises()
    return wrapper
}

const navLinks = () => wrapper!.findAll('nav[aria-label="Admin navigation"] a')
const collapseButton = () => wrapper!.findAll('aside button').find((b) => b.attributes('aria-expanded') !== undefined)!

beforeEach(() => {
    localStorage.clear()
    stubDesktop(true)
})

afterEach(() => {
    wrapper?.unmount()
    wrapper = undefined
    document.body.innerHTML = ''
})

describe('AdminLayout', () => {
    it('sentenceCaseGroupsAndActiveSection', async () => {
        await mountAt('/admin/problems/two-sum')
        const groups = wrapper!.findAll('nav[aria-label="Admin navigation"] > div > span').map((s) => s.text())
        expect(groups).toEqual(['Overview', 'Content', 'Access'])
        // A sub-page keeps its section current.
        const problems = navLinks().find((a) => a.text() === 'Problems')!
        expect(problems.attributes('aria-current')).toBe('page')
        expect(problems.classes()).toContain('bg-primary-soft')
        expect(problems.classes()).toContain('text-info-ink')
        const dashboard = navLinks().find((a) => a.text() === 'Dashboard')!
        expect(dashboard.attributes('aria-current')).toBeUndefined()
    })

    it('collapseToRailAndBack', async () => {
        await mountAt('/admin/users')
        expect(wrapper!.get('aside').classes()).toContain('w-[232px]')
        expect(collapseButton().text()).toBe('Collapse')

        await collapseButton().trigger('click')
        expect(localStorage.getItem('admin.sidebar')).toBe('1')
        expect(wrapper!.get('aside').classes()).toContain('w-14')
        // Labels stay readable to assistive tech; group names give way to separators.
        const users = navLinks().find((a) => a.text() === 'Users')!
        expect(users.get('span').classes()).toContain('sr-only')
        expect(wrapper!.findAll('nav[aria-label="Admin navigation"] > div > span').every((s) => s.text() === '')).toBe(true)

        await collapseButton().trigger('click')
        expect(localStorage.getItem('admin.sidebar')).toBe('0')
        expect(wrapper!.get('aside').classes()).toContain('w-[232px]')
    })

    it('drawerWidthsNeverRail', async () => {
        localStorage.setItem('admin.sidebar', '1')
        stubDesktop(false)
        await mountAt('/admin/users')
        // Below 1024 px the drawer always shows labels, whatever was remembered.
        expect(wrapper!.get('aside').classes()).toContain('w-[232px]')
        const users = navLinks().find((a) => a.text() === 'Users')!
        expect(users.get('span').classes()).not.toContain('sr-only')
    })

    it('topBarHasCrumbsAndAccountMenuOnly', async () => {
        await mountAt('/admin/problems/two-sum')
        const crumbs = wrapper!.findAll('header nav[aria-label="Breadcrumb"] li').map((li) => li.text())
        expect(crumbs).toEqual(['Admin', 'Problems', 'two-sum'])
        const headerButtons = wrapper!.findAll('header button').map((b) => b.attributes('aria-label'))
        expect(headerButtons).toEqual(['Open navigation', 'Account menu for Binh Tran'])
    })

    it('submissionsInContentWithItsCrumb', async () => {
        await mountAt('/admin/problems')
        expect(navLinks().map((a) => a.text())).not.toContain('Submissions')
        wrapper!.unmount()

        await mountAt('/admin/submissions', ['problem:update', 'submission:read_any'])
        const content = wrapper!.get('nav[aria-label="Admin navigation"] ul[aria-label="Content"]')
        expect(content.findAll('a').map((a) => a.text())).toEqual(['Problems', 'Submissions'])
        const submissions = navLinks().find((a) => a.text() === 'Submissions')!
        expect(submissions.attributes('href')).toBe('/admin/submissions')
        expect(submissions.attributes('aria-current')).toBe('page')
        const crumbs = wrapper!.findAll('header nav[aria-label="Breadcrumb"] li').map((li) => li.text())
        expect(crumbs).toEqual(['Admin', 'Submissions'])
    })

    it('contestsInContentWithItsCrumb', async () => {
        await mountAt('/admin/problems')
        expect(navLinks().map((a) => a.text())).not.toContain('Contests')
        wrapper!.unmount()

        await mountAt('/admin/contests', ['problem:update', 'submission:read_any', 'contest:update'])
        const content = wrapper!.get('nav[aria-label="Admin navigation"] ul[aria-label="Content"]')
        expect(content.findAll('a').map((a) => a.text())).toEqual(['Problems', 'Contests', 'Submissions'])
        const contests = navLinks().find((a) => a.text() === 'Contests')!
        expect(contests.attributes('href')).toBe('/admin/contests')
        expect(contests.attributes('aria-current')).toBe('page')
        const crumbs = wrapper!.findAll('header nav[aria-label="Breadcrumb"] li').map((li) => li.text())
        expect(crumbs).toEqual(['Admin', 'Contests'])
    })
})
