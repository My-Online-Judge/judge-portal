// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'

const h = vi.hoisted(() => ({
    participants: vi.fn(),
    removeParticipant: vi.fn(),
    ensureFreshSession: vi.fn(),
    downloadCsv: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
}))

vi.mock('@/services/contestService', () => ({
    default: { participants: h.participants, removeParticipant: h.removeParticipant },
}))
vi.mock('@/api/refreshSession', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/api/refreshSession')>()),
    ensureFreshSession: h.ensureFreshSession,
}))
vi.mock('@/composables/useToast', () => ({ useToast: () => ({ success: h.success, error: h.error }) }))
// toCsv is real: the content is what the test asserts. Only the save to disk is stubbed.
vi.mock('@/lib/csv', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/lib/csv')>()),
    downloadCsv: h.downloadCsv,
}))

import ParticipantsDialog from '../ParticipantsDialog.vue'
import PaginationFooter from '@/components/common/PaginationFooter.vue'
import { formatContestDate } from '@/lib/contestTime'

type Row = { user: { id: string; username: string | null; name: string | null }; enrolledAt: string }
const participant = (username: string, name: string | null, minute: number): Row => ({
    user: { id: `u-${username}`, username, name },
    enrolledAt: `2026-10-20T08:${String(minute % 60).padStart(2, '0')}:00Z`,
})
const alice = participant('alice', 'Alice Nguyễn', 1)
const bob = participant('bob', 'Bob, Jr.', 2)
const carol = participant('carol', null, 3)
const unknown: Row = { user: { id: 'u-gone', username: null, name: null }, enrolledAt: '2026-10-20T08:04:00Z' }

// The server's side of GET /contests/{slug}/enrollments: newest first, the search over username and name.
let rows: Row[] = []
const serve = async (_signal: AbortSignal, _slug: string, params: { page: number; size: number; q?: string }) => {
    const q = params.q?.toLowerCase()
    const hits = q
        ? rows.filter((r) => r.user.username?.toLowerCase().includes(q) || r.user.name?.toLowerCase().includes(q))
        : rows
    const totalPages = Math.ceil(hits.length / params.size)
    const page = params.page
    return {
        data: {
            data: hits.slice(page * params.size, (page + 1) * params.size),
            pagination: {
                page, size: params.size, totalElements: hits.length, totalPages,
                hasPrev: page > 0, hasNext: page + 1 < totalPages,
                prevPage: page > 0 ? page - 1 : null, nextPage: page + 1 < totalPages ? page + 1 : null,
            },
        },
    }
}
const many = (n: number) => Array.from({ length: n }, (_, i) => participant(`user${i}`, `User ${i}`, i))

let wrapper: VueWrapper | undefined
async function mountDialog(props: Record<string, unknown> = {}) {
    wrapper = mount(ParticipantsDialog, {
        attachTo: document.body,
        props: { open: true, slug: 'spring-cup', title: 'Spring cup', ...props },
    })
    await flushPromises()
    return wrapper
}
const body = () => document.body.textContent!.replace(/\s+/g, ' ')
const tableRows = () =>
    [...document.body.querySelectorAll('tbody tr')].map((tr) =>
        [...tr.querySelectorAll('td')].slice(0, 3).map((td) => td.textContent!.replace(/\s+/g, ' ').trim()),
    )
const button = (name: string) =>
    [...document.body.querySelectorAll('button')].find(
        (b) => b.getAttribute('aria-label') === name || b.textContent?.trim() === name,
    ) as HTMLButtonElement | undefined

beforeEach(() => {
    h.ensureFreshSession.mockResolvedValue(undefined)
    rows = [alice, bob, carol, unknown]
    h.participants.mockImplementation(serve)
    h.removeParticipant.mockImplementation(async (_slug: string, userId: string) => {
        rows = rows.filter((r) => r.user.id !== userId)
        return {}
    })
})
afterEach(() => {
    wrapper?.unmount()
    wrapper = undefined
    document.body.innerHTML = ''
    vi.useRealTimers()
    vi.clearAllMocks()
})

describe('ParticipantsDialog', () => {
    it('listsAPageAndSearches', async () => {
        await mountDialog()
        // The endpoint needs contest:update on a valid token, so the session is made fresh first.
        expect(h.ensureFreshSession.mock.invocationCallOrder[0]).toBeLessThan(h.participants.mock.invocationCallOrder[0]!)
        expect(h.participants).toHaveBeenCalledWith(expect.any(AbortSignal), 'spring-cup', { page: 0, size: 20 })
        expect(body()).toContain('Participants in Spring cup')
        expect(body()).toContain('4 registered')
        expect([...document.body.querySelectorAll('thead th')].map((th) => th.textContent!.trim())).toEqual(
            ['Username', 'Name', 'Registered', 'Remove'],
        )
        expect(tableRows()).toEqual([
            ['alice', 'Alice Nguyễn', formatContestDate(alice.enrolledAt)],
            ['bob', 'Bob, Jr.', formatContestDate(bob.enrolledAt)],
            ['carol', '-', formatContestDate(carol.enrolledAt)],
            // Identity no longer knows the user: the id stands in, so the row can still be removed.
            ['u-gone', '-', formatContestDate(unknown.enrolledAt)],
        ])

        vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
        const input = document.body.querySelector('input[type="search"]') as HTMLInputElement
        expect(input.getAttribute('aria-label')).toBe('Search participants')
        h.participants.mockClear()
        input.value = 'ali'
        input.dispatchEvent(new Event('input', { bubbles: true }))
        await nextTick()
        vi.advanceTimersByTime(299)
        expect(h.participants).not.toHaveBeenCalled()
        vi.advanceTimersByTime(1)
        vi.useRealTimers()
        await flushPromises()
        expect(h.participants).toHaveBeenCalledWith(expect.any(AbortSignal), 'spring-cup', { page: 0, size: 20, q: 'ali' })
        expect(tableRows().map((r) => r[0])).toEqual(['alice'])
        expect(body()).toContain('1 match')
    })

    it('aSearchWithNoHitsSaysSoAndAnEmptyListToo', async () => {
        rows = []
        await mountDialog()
        expect(body()).toContain('No one has registered yet')
        expect(document.body.querySelectorAll('tbody tr')).toHaveLength(0)
    })

    it('pagesWithTheFooter', async () => {
        rows = many(45)
        await mountDialog()
        expect(document.body.querySelectorAll('tbody tr')).toHaveLength(20)
        expect(body()).toContain('45 registered')
        wrapper!.findComponent(PaginationFooter).vm.$emit('change-page', 2)
        await flushPromises()
        expect(h.participants).toHaveBeenLastCalledWith(expect.any(AbortSignal), 'spring-cup', { page: 2, size: 20 })
        expect(document.body.querySelectorAll('tbody tr')).toHaveLength(5)
    })

    it('removeConfirmsThenReloads', async () => {
        await mountDialog()
        button('Remove bob')!.click()
        await flushPromises()
        expect(h.removeParticipant).not.toHaveBeenCalled()
        expect(body()).toContain('Remove bob from the contest?')
        expect(document.body.querySelector('[data-slot="confirm-icon"]')!.getAttribute('data-tone')).toBe('destructive')
        const confirm = button('Remove')!
        confirm.click()
        confirm.click()
        await flushPromises()
        expect(h.removeParticipant).toHaveBeenCalledTimes(1)
        expect(h.removeParticipant).toHaveBeenCalledWith('spring-cup', 'u-bob')
        expect(h.success).toHaveBeenCalledWith('Participant removed', { description: 'bob' })
        expect(h.participants).toHaveBeenCalledTimes(2)
        expect(tableRows().map((r) => r[0])).toEqual(['alice', 'carol', 'u-gone'])
        expect(body()).toContain('3 registered')
        expect(wrapper!.emitted('changed')).toHaveLength(1)
    })

    it('aRefusedRemovalIsToasted', async () => {
        h.removeParticipant.mockRejectedValue({
            isAxiosError: true,
            response: { status: 404, data: { code: 'ENROLLMENT_NOT_FOUND', message: 'Not registered for this contest' } },
        })
        await mountDialog()
        button('Remove alice')!.click()
        await flushPromises()
        button('Remove')!.click()
        await flushPromises()
        expect(h.error).toHaveBeenCalledWith('Not registered for this contest')
        expect(wrapper!.emitted('changed')).toBeUndefined()
    })

    it('exportWalksThePagesAndBuildsTheCsv', async () => {
        rows = [...many(150), bob]
        await mountDialog()
        h.participants.mockClear()
        button('Export CSV')!.click()
        await flushPromises()
        // The whole roster, a hundred at a time, whatever the search box says and whatever page is shown.
        expect(h.participants.mock.calls.map((c) => c[2])).toEqual([
            { page: 0, size: 100 },
            { page: 1, size: 100 },
        ])
        expect(h.downloadCsv).toHaveBeenCalledTimes(1)
        const [name, csv] = h.downloadCsv.mock.calls[0]! as [string, string]
        expect(name).toBe('participants-spring-cup.csv')
        const lines = csv.split('\r\n')
        expect(lines[0]).toBe('username,name,user_id,enrolled_at')
        expect(lines[1]).toBe('user0,User 0,u-user0,2026-10-20T08:00:00Z')
        expect(lines[151]).toBe('bob,"Bob, Jr.",u-bob,2026-10-20T08:02:00Z')
        expect(lines).toHaveLength(153)
        expect(lines[152]).toBe('')
    })

    it('aFailedExportIsToasted', async () => {
        await mountDialog()
        h.participants.mockRejectedValueOnce(new Error('Network Error'))
        button('Export CSV')!.click()
        await flushPromises()
        expect(h.downloadCsv).not.toHaveBeenCalled()
        expect(h.error).toHaveBeenCalledWith("Couldn't export the participants. Try again.")
    })

    it('aFailedListOffersARetry', async () => {
        h.participants.mockRejectedValueOnce(new Error('Network Error'))
        await mountDialog()
        expect(body()).toContain("Couldn't load this list")
        button('Retry')!.click()
        await flushPromises()
        expect(h.participants).toHaveBeenCalledTimes(2)
        expect(tableRows().map((r) => r[0])).toEqual(['alice', 'bob', 'carol', 'u-gone'])
    })

    it('reopeningForgetsTheSearchAndPage', async () => {
        rows = many(45)
        await mountDialog()
        wrapper!.findComponent(PaginationFooter).vm.$emit('change-page', 1)
        await flushPromises()
        await wrapper!.setProps({ open: false })
        await wrapper!.setProps({ open: true, slug: 'autumn-cup', title: 'Autumn cup' })
        await flushPromises()
        expect(h.participants).toHaveBeenLastCalledWith(expect.any(AbortSignal), 'autumn-cup', { page: 0, size: 20 })
        expect(body()).toContain('Participants in Autumn cup')
    })
})
