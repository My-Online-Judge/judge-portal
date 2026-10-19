// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'
import Toaster from '@/components/ui/toast/Toaster.vue'
import { __resetForTests, useToast } from '@/composables/useToast'
import { SubmissionResult } from '@/types/submission'

const T0 = new Date('2026-10-19T10:00:00Z')
let wrapper: VueWrapper | undefined
let outside: HTMLButtonElement

function mountToaster() {
    // The real TransitionGroup, so leaving toasts run the component's own leave hook.
    wrapper = mount(Toaster, { attachTo: document.body, global: { stubs: { 'transition-group': false } } })
    return wrapper
}

const $ = <T extends Element = HTMLElement>(sel: string) => document.querySelector<T>(sel)
const $$ = (sel: string) => [...document.querySelectorAll<HTMLElement>(sel)]
const section = () => $<HTMLElement>('section.toaster')!
const toastEls = () => $$('li.toast').filter((li) => !li.hasAttribute('data-leaving'))
const button = (label: string) => $$('li.toast button').find((b) => b.textContent?.trim() === label)!
const press = (target: EventTarget, key: string) =>
    target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))
const pointer = (el: Element, type: string, clientX: number, init: PointerEventInit = {}) =>
    el.dispatchEvent(
        new PointerEvent(type, { clientX, pointerId: 1, isPrimary: true, button: 0, bubbles: true, cancelable: true, ...init }),
    )

beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(T0)
    __resetForTests()
    outside = document.createElement('button')
    outside.textContent = 'Outside'
    document.body.appendChild(outside)
})
afterEach(() => {
    wrapper?.unmount()
    wrapper = undefined
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    __resetForTests()
    vi.useRealTimers()
    document.body.innerHTML = ''
})

describe('Toaster', () => {
    it('rendersTwoLiveRegions', async () => {
        mountToaster()
        expect(section().getAttribute('aria-label')).toBe('Notifications (F8)')
        const polite = $('[aria-live="polite"]')!
        const assertive = $('[aria-live="assertive"]')!
        for (const region of [polite, assertive]) {
            expect(region.getAttribute('aria-atomic')).toBe('true')
            expect(region.classList).toContain('sr-only')
        }

        useToast().success('Changes saved')
        await nextTick()
        vi.advanceTimersByTime(100)
        await nextTick()
        expect(polite.textContent).toBe('Changes saved')
        expect(assertive.textContent).toBe('')

        useToast().error("Couldn't reach the server", { description: 'Check your connection.' })
        await nextTick()
        vi.advanceTimersByTime(100)
        await nextTick()
        expect(assertive.textContent).toBe("Couldn't reach the server. Check your connection.")
        expect(polite.textContent).toBe('')
    })

    it('rendersAnatomyAndMergeCount', async () => {
        mountToaster()
        const { error, toast, undo } = useToast()
        error("Couldn't reach the server", { description: 'Check your connection.' })
        error("Couldn't reach the server", { description: 'Check your connection.' })
        await nextTick()
        const [li] = toastEls()
        expect(li!.classList).toContain('error')
        expect(li!.getAttribute('tabindex')).toBe('-1')
        expect(li!.querySelector('.t-ico svg')).not.toBeNull()
        expect(li!.querySelector('.t-title')!.textContent).toContain('×2')
        expect(li!.querySelector('.t-desc')!.textContent).toBe('Check your connection.')
        expect(li!.querySelector('.t-prog')).toBeNull()
        expect(li!.querySelector('button[aria-label="Dismiss notification"]')).not.toBeNull()

        toast({ type: 'verdict', title: 'Accepted', verdictStatus: SubmissionResult.SUCCESS })
        undo('Problem deleted', { commit: vi.fn(), onUndo: vi.fn() })
        await nextTick()
        const [undoEl, verdictEl] = toastEls()
        expect(verdictEl!.classList).toContain('verdict')
        expect(verdictEl!.classList).toContain('v-ac')
        expect(undoEl!.querySelector('.t-prog')).not.toBeNull()
    })

    it('actionCallsHandlerAndDismisses', async () => {
        mountToaster()
        const onClick = vi.fn()
        useToast().error("Couldn't reach the server", { action: { label: 'Retry', onClick } })
        await nextTick()
        button('Retry').click()
        await nextTick()
        expect(onClick).toHaveBeenCalledTimes(1)
        expect(useToast().toasts.value).toHaveLength(0)
        vi.advanceTimersByTime(400)
        await nextTick()
        expect($$('li.toast')).toHaveLength(0)

        const other = vi.fn()
        useToast().error("Couldn't save the statement", { action: { label: 'Retry', onClick: other } })
        await nextTick()
        $<HTMLButtonElement>('li.toast button[aria-label="Dismiss notification"]')!.click()
        expect(other).not.toHaveBeenCalled()
        expect(useToast().toasts.value).toHaveLength(0)
    })

    it('escapeDismissesFocusedToast', async () => {
        mountToaster()
        outside.focus()
        useToast().info('Submitted')
        await nextTick()
        press(document, 'F8')
        const li = toastEls()[0]!
        expect(document.activeElement).toBe(li)
        press(li, 'Escape')
        expect(useToast().toasts.value).toHaveLength(0)
        expect(document.activeElement).toBe(outside)
    })

    it('hoverPausesAndLeaveResumes', async () => {
        const api = useToast()
        const pause = vi.spyOn(api, 'pause')
        const resume = vi.spyOn(api, 'resume')
        mountToaster()
        api.success('Changes saved')
        await nextTick()

        section().dispatchEvent(new MouseEvent('mouseenter'))
        await nextTick()
        expect(pause).toHaveBeenCalledTimes(1)
        expect(api.toasts.value[0]!.paused).toBe(true)
        expect(section().classList).toContain('expanded')
        vi.advanceTimersByTime(10_000)
        expect(api.toasts.value).toHaveLength(1)

        section().dispatchEvent(new MouseEvent('mouseleave'))
        expect(resume).toHaveBeenCalledTimes(1)
        expect(api.toasts.value[0]!.paused).toBe(false)
        vi.advanceTimersByTime(199)
        await nextTick()
        expect(section().classList).toContain('expanded')
        vi.advanceTimersByTime(1)
        await nextTick()
        expect(section().classList).not.toContain('expanded')
    })

    it('focusInsideKeepsPausedAfterMouseLeave', async () => {
        const api = useToast()
        const pause = vi.spyOn(api, 'pause')
        const resume = vi.spyOn(api, 'resume')
        const commit = vi.fn()
        mountToaster()
        api.undo('Problem deleted', { commit, onUndo: vi.fn() })
        await nextTick()

        button('Undo').focus()
        expect(pause).toHaveBeenCalled()
        section().dispatchEvent(new MouseEvent('mouseenter'))
        section().dispatchEvent(new MouseEvent('mouseleave'))
        expect(resume).not.toHaveBeenCalled()
        expect(api.toasts.value[0]!.paused).toBe(true)
        vi.advanceTimersByTime(20_000)
        expect(api.toasts.value).toHaveLength(1)
        expect(commit).not.toHaveBeenCalled()

        outside.focus()
        expect(resume).toHaveBeenCalledTimes(1)
        expect(api.toasts.value[0]!.paused).toBe(false)
    })

    it('f8FocusesNewestToast', async () => {
        mountToaster()
        outside.focus()
        useToast().info('Imported 12 test cases')
        useToast().success('Settings saved')
        await nextTick()
        press(document, 'F8')
        const active = document.activeElement as HTMLElement
        expect(active.matches('li.toast')).toBe(true)
        expect(active.textContent).toContain('Settings saved')
    })

    it('countdownSecondsAreAriaHidden', async () => {
        mountToaster()
        useToast().countdown('You are submitting too fast', { until: Date.now() + 7000 })
        await nextTick()
        const cd = $('.t-cd')!
        expect(cd.closest('[aria-hidden="true"]')).not.toBeNull()
        expect(cd.textContent).toBe('7 s')
        expect($('.t-desc')!.textContent).toBe('Try again in 7 s')

        vi.advanceTimersByTime(1000)
        await nextTick()
        expect($('.t-cd')!.textContent).toBe('6 s')
        // The live region heard the start once; ticks don't re-announce.
        expect($('[aria-live="polite"]')!.textContent).toBe('You are submitting too fast. Try again in 7 seconds.')
    })

    it('expandedStackShowsAtMostThree', async () => {
        mountToaster()
        for (const n of [1, 2, 3, 4, 5]) useToast().info(`Toast ${n}`)
        await nextTick()
        section().dispatchEvent(new MouseEvent('mouseenter'))
        await nextTick()
        expect(toastEls().map((li) => li.querySelector('.t-title')!.textContent)).toEqual([
            'Toast 5',
            'Toast 4',
            'Toast 3',
        ])
    })

    it('swipeSidewaysDismisses', async () => {
        mountToaster()
        useToast().info('Submitted')
        await nextTick()
        const li = toastEls()[0]!

        // A drag that starts on a button is not a swipe.
        const close = li.querySelector('button')!
        pointer(close, 'pointerdown', 0)
        pointer(li, 'pointermove', 200)
        pointer(li, 'pointerup', 200)
        expect(useToast().toasts.value).toHaveLength(1)

        // A short slow drag snaps back.
        pointer(li, 'pointerdown', 0)
        vi.advanceTimersByTime(500)
        pointer(li, 'pointermove', 40)
        pointer(li, 'pointerup', 40)
        expect(useToast().toasts.value).toHaveLength(1)

        pointer(li, 'pointerdown', 0)
        pointer(li, 'pointermove', 120)
        pointer(li, 'pointerup', 120)
        expect(useToast().toasts.value).toHaveLength(0)
    })

    it('swipeIgnoresOtherButtonsAndSecondPointers', async () => {
        mountToaster()
        useToast().info('Submitted')
        await nextTick()
        const li = toastEls()[0]!

        // A right-button drag is not a swipe.
        pointer(li, 'pointerdown', 0, { button: 2 })
        pointer(li, 'pointermove', 200)
        pointer(li, 'pointerup', 200)
        expect(useToast().toasts.value).toHaveLength(1)
        expect(li.style.transform).not.toContain('translateX')

        // Nor is a pointer that isn't the primary one.
        pointer(li, 'pointerdown', 0, { isPrimary: false })
        pointer(li, 'pointermove', 200)
        pointer(li, 'pointerup', 200)
        expect(useToast().toasts.value).toHaveLength(1)

        // A second pointer can't take over a drag in progress.
        pointer(li, 'pointerdown', 0)
        pointer(li, 'pointerdown', 0, { pointerId: 2 })
        pointer(li, 'pointermove', 200, { pointerId: 2 })
        pointer(li, 'pointerup', 200, { pointerId: 2 })
        expect(useToast().toasts.value).toHaveLength(1)
        pointer(li, 'pointerup', 0)
        expect(useToast().toasts.value).toHaveLength(1)
    })

    it('lostPointerCaptureCancelsTheSwipe', async () => {
        mountToaster()
        useToast().info('Submitted')
        await nextTick()
        const li = toastEls()[0]!
        const rest = li.style.transform

        pointer(li, 'pointerdown', 0)
        pointer(li, 'pointermove', 200)
        expect(li.style.transform).toContain('translateX(200px)')
        expect(li.style.transition).toBe('none')
        expect(li.hasAttribute('data-dragging')).toBe(true)

        pointer(li, 'lostpointercapture', 200)
        expect(useToast().toasts.value).toHaveLength(1)
        expect(li.style.transform).toBe(rest)
        expect(li.style.transition).toBe('')
        expect(li.hasAttribute('data-dragging')).toBe(false)

        // The drag is over, so the pointerup that follows doesn't dismiss either.
        pointer(li, 'pointerup', 200)
        expect(useToast().toasts.value).toHaveLength(1)
    })

    it('toastTextIsSelectableWhenNotDragging', async () => {
        mountToaster()
        useToast().error("Couldn't reach the server", { description: 'Check your connection.' })
        await nextTick()
        const li = toastEls()[0]!
        expect(li.hasAttribute('data-dragging')).toBe(false)
        // No aria-label, so focus reads the title, the count and the description.
        expect(li.hasAttribute('aria-label')).toBe(false)
        pointer(li, 'pointerdown', 0)
        expect(li.hasAttribute('data-dragging')).toBe(false)
        pointer(li, 'pointerup', 0)
        expect(li.hasAttribute('data-dragging')).toBe(false)
    })

    it('reducedMotionRemovesAtOnce', async () => {
        vi.stubGlobal(
            'matchMedia',
            (query: string) =>
                ({
                    matches: query.includes('prefers-reduced-motion: reduce'),
                    media: query,
                    addEventListener: () => {},
                    removeEventListener: () => {},
                }) as unknown as MediaQueryList,
        )
        mountToaster()
        useToast().info('Submitted')
        await nextTick()
        $<HTMLButtonElement>('li.toast button[aria-label="Dismiss notification"]')!.click()
        await nextTick()
        expect($$('li.toast')).toHaveLength(0)
    })
})
