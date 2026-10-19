// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

const h = vi.hoisted(() => ({
    getProblems: vi.fn(),
    list: vi.fn(),
    getJudgeServers: vi.fn(),
    listBans: vi.fn(),
}))

vi.mock('@/services/problemService', () => ({ default: { getProblems: h.getProblems } }))
vi.mock('@/services/userService', () => ({ default: { list: h.list } }))
vi.mock('@/services/judgeServerService', () => ({ default: { getJudgeServers: h.getJudgeServers } }))
vi.mock('@/services/securityService', () => ({ default: { listBans: h.listBans } }))

import AdminDashboardPage from '../AdminDashboardPage.vue'
import StatCell from '@/components/common/StatCell.vue'
import { useAuthStore } from '@/stores/auth'

const page = (totalElements: number) => ({ page: 0, size: 5, totalElements, totalPages: 1, hasNext: false, hasPrev: false })
const server = (hostname: string, alive: boolean) => ({
    hostname, ip: '10.0.0.1', judgerVersion: '2.1.0', cpuCore: 8, cpuUsage: 38, memoryUsage: 61,
    serviceUrl: 'http://10.0.0.1:8080', lastHeartbeat: new Date().toISOString(), taskNumber: 3, disabled: false, alive,
})

let wrapper: VueWrapper | undefined

async function mountPage() {
    setActivePinia(createPinia())
    useAuthStore().user = {
        id: 'me', permissions: ['problem:create', 'user:read', 'judgeserver:read', 'ban:read'],
    } as never
    wrapper = mount(AdminDashboardPage, {
        attachTo: document.body,
        global: { stubs: { RouterLink: { props: ['to'], template: '<a><slot /></a>' } } },
    })
    await flushPromises()
    return wrapper
}

const cell = (label: string) => wrapper!.findAllComponents(StatCell).find((c) => c.props('label') === label)!

beforeEach(() => {
    h.getProblems.mockImplementation((_signal: AbortSignal, params: { status?: string }) =>
        Promise.resolve({
            data: params?.status === 'INACTIVE'
                ? { data: [], pagination: page(3) }
                : { data: [], pagination: page(77) },
        }),
    )
    h.list.mockRejectedValue(new Error('boom'))
    h.getJudgeServers.mockResolvedValue({ data: { data: [server('judge-01', true), server('judge-02', false)] } })
    h.listBans.mockResolvedValue({ data: { data: [], pagination: page(4) } })
})

afterEach(() => {
    wrapper?.unmount()
    wrapper = undefined
    document.body.innerHTML = ''
    vi.clearAllMocks()
})

describe('AdminDashboardPage', () => {
    it('statCellsLoadAndFailOnTheirOwn', async () => {
        await mountPage()
        expect(cell('Problems').text()).toContain('77')
        expect(cell('Problems').text()).toContain('74 active, 3 inactive')
        expect(cell('Judge servers').text()).toContain('1/ 2 online')
        expect(cell('Judge servers').text()).toContain('judge-02 offline')
        expect(cell('Active bans').text()).toContain('4')
        // Only the users cell failed, and it offers its own retry.
        expect(wrapper!.findAll('[role="alert"]')).toHaveLength(1)
        expect(cell('Users').text()).toContain('Could not load.')
        h.list.mockResolvedValue({ data: { data: [], pagination: page(1248) } })
        await wrapper!.get('button[aria-label="Retry loading Users"]').trigger('click')
        await flushPromises()
        expect(cell('Users').text()).toContain('1,248')
    })

    it('healthTableLeadsWithOfflineServers', async () => {
        await mountPage()
        const rows = wrapper!.findAll('table tbody tr')
        expect(rows[0]!.text()).toContain('judge-02')
        expect(rows[0]!.classes()).toContain('row-warn')
        expect(rows[0]!.text()).toContain('Offline')
        // Offline rows show no load numbers; online rows show numbers, not meters.
        expect(rows[0]!.findAll('td.num').slice(0, 3).map((td) => td.text())).toEqual(['-', '-', '-'])
        expect(rows[1]!.text()).toContain('Online')
        expect(rows[1]!.findAll('td.num').slice(0, 3).map((td) => td.text())).toEqual(['38%', '61%', '3'])
    })
})
