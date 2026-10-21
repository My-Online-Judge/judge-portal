// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'
import { createPinia, setActivePinia } from 'pinia'

const h = vi.hoisted(() => ({
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    ensureFreshSession: vi.fn(),
    error: vi.fn(),
}))

vi.mock('@/services/contestService', () => ({ default: { get: h.get, create: h.create, update: h.update } }))
vi.mock('@/api/refreshSession', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/api/refreshSession')>()),
    ensureFreshSession: h.ensureFreshSession,
}))
vi.mock('@/composables/useToast', () => ({ useToast: () => ({ error: h.error }) }))
vi.mock('@/components/admin/ProblemPicker.vue', async () => {
    const { defineComponent, h: render } = await import('vue')
    return {
        default: defineComponent({
            name: 'ProblemPickerStub',
            props: { modelValue: String, excludeSlugs: Array },
            emits: ['update:modelValue', 'pick'],
            setup: () => () => render('div', { 'data-test': 'problem-picker' }),
        }),
    }
})

import ContestFormDialog from '../ContestFormDialog.vue'
import { useAuthStore } from '@/stores/auth'

const detail = (over: Record<string, unknown> = {}) => ({
    slug: 'spring-cup',
    title: 'Spring cup',
    description: 'Two hours.',
    startsAt: '2026-11-01T02:00:30Z',
    endsAt: '2026-11-01T04:00:00Z',
    status: 'DRAFT',
    phase: 'UPCOMING',
    problems: [
        { label: 'A', problemSlug: 'sum', title: 'Tổng hai số' },
        { label: 'B', problemSlug: 'max', title: 'Số lớn nhất' },
        { label: 'C', problemSlug: 'gcd', title: 'Ước chung' },
    ],
    myProgress: {},
    serverTime: '2026-10-21T10:00:00Z',
    ...over,
})
const LOCKED = 'Problems and start time are locked once the contest has started'

let wrapper: VueWrapper | undefined

async function mountDialog(slug: string | null, permissions = ['contest:create', 'contest:update', 'problem:update']) {
    setActivePinia(createPinia())
    useAuthStore().user = { id: 'me', permissions } as never
    wrapper = mount(ContestFormDialog, { attachTo: document.body, props: { open: true, slug } })
    await flushPromises()
    return wrapper
}
const $ = <T extends Element = HTMLElement>(sel: string) => document.body.querySelector(sel) as T | null
const button = (name: string) =>
    [...document.body.querySelectorAll('button')].find(
        (b) => b.getAttribute('aria-label') === name || b.textContent?.trim() === name,
    ) as HTMLButtonElement | undefined
async function type(sel: string, value: string) {
    const el = $<HTMLInputElement>(sel)!
    el.value = value
    el.dispatchEvent(new Event('input', { bubbles: true }))
    await nextTick()
}
// Each row as "label title slug", from its text-only spans.
const rows = () =>
    [...document.body.querySelectorAll('ol[aria-label="Contest problems"] > li')].map((li) =>
        [...li.querySelectorAll('span')]
            .filter((s) => s.children.length === 0)
            .map((s) => s.textContent?.trim())
            .filter(Boolean)
            .join(' '),
    )
async function save() {
    button(wrapper!.props('slug') ? 'Save changes' : 'Create contest')!.click()
    await flushPromises()
}

beforeEach(() => {
    h.ensureFreshSession.mockResolvedValue(undefined)
    h.get.mockResolvedValue({ data: { data: detail() } })
    h.update.mockImplementation(async (_slug: string, body: Record<string, unknown>) => ({ data: { data: { ...detail(), ...body } } }))
    h.create.mockImplementation(async (body: Record<string, unknown>) => ({ data: { data: { ...detail(), ...body } } }))
})
afterEach(() => {
    wrapper?.unmount()
    wrapper = undefined
    document.body.innerHTML = ''
    vi.clearAllMocks()
})

describe('ContestFormDialog', () => {
    it('loadsTheContestFreshOnEdit', async () => {
        await mountDialog('spring-cup')
        expect(h.get).toHaveBeenCalledWith(expect.any(AbortSignal), 'spring-cup')
        // The detail lists a draft's problems only to a valid token: refresh first.
        expect(h.ensureFreshSession.mock.invocationCallOrder[0]).toBeLessThan(h.get.mock.invocationCallOrder[0]!)
        expect($<HTMLInputElement>('#contest-title')!.value).toBe('Spring cup')
        expect($<HTMLTextAreaElement>('#contest-description')!.value).toBe('Two hours.')
        expect(rows()).toEqual(['A Tổng hai số sum', 'B Số lớn nhất max', 'C Ước chung gcd'])
    })

    it('slugReadOnlyOnEdit', async () => {
        await mountDialog('spring-cup')
        const slug = $<HTMLInputElement>('#contest-slug')!
        expect(slug.value).toBe('spring-cup')
        expect(slug.readOnly).toBe(true)
        wrapper!.unmount()
        document.body.innerHTML = ''
        h.get.mockClear()

        await mountDialog(null)
        expect($<HTMLInputElement>('#contest-slug')!.readOnly).toBe(false)
        expect(h.get).not.toHaveBeenCalled()
    })

    it('moveUpReordersLabels', async () => {
        await mountDialog('spring-cup')
        expect(button('Move A up')!.disabled).toBe(true)
        expect(button('Move C down')!.disabled).toBe(true)
        button('Move B up')!.click()
        await nextTick()
        expect(rows()).toEqual(['A Số lớn nhất max', 'B Tổng hai số sum', 'C Ước chung gcd'])
        button('Move A down')!.click()
        await nextTick()
        button('Remove C')!.click()
        await nextTick()
        expect(rows()).toEqual(['A Tổng hai số sum', 'B Số lớn nhất max'])

        await save()
        expect(h.update).toHaveBeenCalledWith('spring-cup', expect.objectContaining({ problemSlugs: ['sum', 'max'] }))
    })

    it('addAppendsThePickedProblemWithTheNextLabel', async () => {
        await mountDialog('spring-cup')
        const picker = wrapper!.findComponent({ name: 'ProblemPickerStub' })
        expect(picker.props('excludeSlugs')).toEqual(['sum', 'max', 'gcd'])
        expect(button('Add')!.disabled).toBe(true)
        picker.vm.$emit('pick', { problemSlug: 'lcm', title: 'Bội chung' })
        picker.vm.$emit('update:modelValue', 'lcm')
        await nextTick()
        button('Add')!.click()
        await nextTick()
        expect(rows().at(-1)).toBe('D Bội chung lcm')
        // The picker is cleared for the next one.
        expect(picker.props('modelValue')).toBeNull()
    })

    it('startedContestLocksProblemsAndStart', async () => {
        h.get.mockResolvedValue({ data: { data: detail({ status: 'PUBLISHED', phase: 'RUNNING' }) } })
        await mountDialog('spring-cup')
        expect(document.body.textContent).toContain(LOCKED)
        expect($<HTMLInputElement>('#contest-starts')!.disabled).toBe(true)
        expect($<HTMLInputElement>('#contest-ends')!.disabled).toBe(false)
        expect($<HTMLInputElement>('#contest-title')!.disabled).toBe(false)
        for (const name of ['Move B up', 'Move B down', 'Remove B']) expect(button(name)!.disabled).toBe(true)
        // Nothing to add to a locked list.
        expect(button('Add')).toBeUndefined()
        expect(wrapper!.findComponent({ name: 'ProblemPickerStub' }).exists()).toBe(false)
    })

    it('anUpcomingOrDraftContestIsNotLocked', async () => {
        h.get.mockResolvedValue({ data: { data: detail({ status: 'DRAFT', phase: 'RUNNING' }) } })
        await mountDialog('spring-cup')
        expect(document.body.textContent).not.toContain(LOCKED)
        expect($<HTMLInputElement>('#contest-starts')!.disabled).toBe(false)
        expect(button('Remove B')!.disabled).toBe(false)
    })

    it('lockedStartIsSentBackVerbatim', async () => {
        h.get.mockResolvedValue({ data: { data: detail({ status: 'PUBLISHED', phase: 'RUNNING' }) } })
        await mountDialog('spring-cup')
        await type('#contest-title', 'Spring cup 2026')
        await save()
        const body = h.update.mock.calls[0]![1]
        // As the server returned it, seconds included: the input shows minutes only.
        expect(body.startsAt).toBe('2026-11-01T02:00:30Z')
        expect(body.endsAt).toBe('2026-11-01T04:00:00Z')
        expect(body.title).toBe('Spring cup 2026')
        expect(body).not.toHaveProperty('problemSlugs')
        expect(wrapper!.emitted('saved')).toHaveLength(1)
        expect(wrapper!.emitted('update:open')).toEqual([[false]])
    })

    it('createSendsTheFormAsIso', async () => {
        await mountDialog(null)
        await type('#contest-slug', 'autumn-cup')
        await type('#contest-title', 'Autumn cup')
        await type('#contest-starts', '2026-11-02T09:00')
        await type('#contest-ends', '2026-11-02T11:30')
        const picker = wrapper!.findComponent({ name: 'ProblemPickerStub' })
        picker.vm.$emit('pick', { problemSlug: 'sum', title: 'Tổng hai số' })
        picker.vm.$emit('update:modelValue', 'sum')
        await nextTick()
        button('Add')!.click()
        await nextTick()
        await save()
        expect(h.create).toHaveBeenCalledWith({
            slug: 'autumn-cup',
            title: 'Autumn cup',
            description: '',
            startsAt: new Date('2026-11-02T09:00').toISOString(),
            endsAt: new Date('2026-11-02T11:30').toISOString(),
            status: 'DRAFT',
            problemSlugs: ['sum'],
        })
        expect(wrapper!.emitted('saved')![0]![0]).toMatchObject({ slug: 'autumn-cup' })
    })

    it('anIncompleteFormSaysWhyAndSendsNothing', async () => {
        await mountDialog(null)
        await save()
        expect(h.create).not.toHaveBeenCalled()
        expect($('[role="alert"]')!.textContent).toContain('Use 3 to 64 lowercase letters, digits or hyphens for the slug')
    })

    it('aRefusedSaveToastsTheApiMessageAndStaysOpen', async () => {
        h.update.mockRejectedValue({
            isAxiosError: true,
            response: { status: 409, data: { message: 'This contest has scores: its start time is locked' } },
        })
        await mountDialog('spring-cup')
        await type('#contest-starts', '2026-11-01T10:00')
        await save()
        // The refusal settles after the save's own awaits; a slower CI runner needs more than one flush.
        await vi.waitFor(() => expect(h.error).toHaveBeenCalledWith('This contest has scores: its start time is locked'))
        expect(wrapper!.emitted('update:open')).toBeUndefined()
    })

    it('problemsHiddenFromTheCallerAreKept', async () => {
        // contest:update without problem:update: an upcoming contest's problems come back empty.
        h.get.mockResolvedValue({ data: { data: detail({ problems: [] }) } })
        await mountDialog('spring-cup', ['contest:update'])
        expect(document.body.textContent).toContain('Saving keeps them as they are.')
        expect(wrapper!.findComponent({ name: 'ProblemPickerStub' }).exists()).toBe(false)
        await type('#contest-title', 'Spring cup 2026')
        await save()
        expect(h.update.mock.calls[0]![1]).not.toHaveProperty('problemSlugs')
    })

    it('aFailedLoadOffersARetry', async () => {
        h.get.mockRejectedValueOnce(new Error('Network Error'))
        await mountDialog('spring-cup')
        expect(document.body.textContent).toContain("Couldn't load this contest.")
        button('Retry')!.click()
        await flushPromises()
        expect(h.get).toHaveBeenCalledTimes(2)
        expect($<HTMLInputElement>('#contest-title')!.value).toBe('Spring cup')
    })
})
