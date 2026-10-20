// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { __resetForTests, durationFor, MAX_VISIBLE, TOAST_DURATIONS, useToast } from '@/composables/useToast'

const T0 = new Date('2026-10-19T10:00:00Z')

beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(T0)
    __resetForTests()
})
afterEach(() => {
    __resetForTests()
    vi.useRealTimers()
})

const titles = () => useToast().toasts.value.map((t) => t.title)
const byTitle = (title: string) => useToast().toasts.value.find((t) => t.title === title)

function setVisibility(state: 'visible' | 'hidden') {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state })
    document.dispatchEvent(new Event('visibilitychange'))
}

function deferred<T>() {
    let resolve!: (v: T) => void
    let reject!: (e: unknown) => void
    const promise = new Promise<T>((res, rej) => {
        resolve = res
        reject = rej
    })
    return { promise, resolve, reject }
}

describe('useToast engine', () => {
    it('successDisappearsAfter4s', () => {
        const { success, toasts } = useToast()
        success('Changes saved')
        expect(toasts.value).toHaveLength(1)
        expect(toasts.value[0]).toMatchObject({ type: 'success', title: 'Changes saved', count: 1, visible: true })
        vi.advanceTimersByTime(3999)
        expect(titles()).toEqual(['Changes saved'])
        vi.advanceTimersByTime(1)
        expect(toasts.value).toHaveLength(0)
    })

    it('errorWithActionStays', () => {
        const { error, toasts } = useToast()
        const onClick = vi.fn()
        error("Couldn't reach the server", { action: { label: 'Retry', onClick } })
        expect(toasts.value[0]?.remaining).toBe(Infinity)
        vi.advanceTimersByTime(60_000)
        expect(titles()).toEqual(["Couldn't reach the server"])
        expect(onClick).not.toHaveBeenCalled()
    })

    it('errorWithoutActionGoesAfter10s', () => {
        const { error, toasts } = useToast()
        error("Couldn't save the statement")
        vi.advanceTimersByTime(9999)
        expect(toasts.value).toHaveLength(1)
        vi.advanceTimersByTime(1)
        expect(toasts.value).toHaveLength(0)
    })

    it('mergesIdenticalVisibleToasts', () => {
        const { error, toasts, announcement } = useToast()
        error("Couldn't reach the server", { description: 'Attempt 1' })
        const seqAfterFirst = announcement.value.seq
        for (let i = 2; i <= 5; i++) error("Couldn't reach the server", { description: `Attempt ${i}` })
        expect(toasts.value).toHaveLength(1)
        expect(toasts.value[0]).toMatchObject({ count: 5, description: 'Attempt 5' })
        // The live region announces a merged toast once, not five times.
        expect(announcement.value.seq).toBe(seqAfterFirst)

        // A merge restarts the timer: 9 s in, a sixth error gives it a fresh 10 s.
        vi.advanceTimersByTime(9000)
        error("Couldn't reach the server")
        expect(toasts.value[0]).toMatchObject({ count: 6, description: 'Attempt 5' })
        vi.advanceTimersByTime(9999)
        expect(toasts.value).toHaveLength(1)
        vi.advanceTimersByTime(1)
        expect(toasts.value).toHaveLength(0)

        // Same title with a different type is a different toast.
        error('Saved')
        useToast().success('Saved')
        expect(toasts.value.map((t) => t.type)).toEqual(['success', 'error'])
    })

    it('loadingAndCountdownNeverMerge', () => {
        const { loading, countdown, undo, toasts } = useToast()
        loading('Submitting…')
        loading('Submitting…')
        countdown('You are submitting too fast', { until: Date.now() + 7000 })
        countdown('You are submitting too fast', { until: Date.now() + 7000 })
        undo('Problem deleted', { commit: vi.fn(), onUndo: vi.fn() })
        undo('Problem deleted', { commit: vi.fn(), onUndo: vi.fn() })
        expect(toasts.value).toHaveLength(6)
        expect(toasts.value.every((t) => t.count === 1)).toBe(true)
        expect(new Set(toasts.value.map((t) => t.id)).size).toBe(6)
    })

    it('pauseKeepsRemaining', () => {
        const { success, pause, resume, toasts } = useToast()
        const { id } = success('Changes saved')
        vi.advanceTimersByTime(2000)
        pause(id)
        expect(toasts.value[0]).toMatchObject({ paused: true, remaining: 2000 })
        vi.advanceTimersByTime(10_000)
        expect(toasts.value).toHaveLength(1)
        resume(id)
        expect(toasts.value[0]?.paused).toBe(false)
        vi.advanceTimersByTime(1999)
        expect(toasts.value).toHaveLength(1)
        vi.advanceTimersByTime(1)
        expect(toasts.value).toHaveLength(0)

        // pause() with no id pauses every toast, including ones that arrive while paused.
        success('First')
        vi.advanceTimersByTime(1000)
        pause()
        success('Second')
        expect(toasts.value.every((t) => t.paused)).toBe(true)
        vi.advanceTimersByTime(30_000)
        expect(titles()).toEqual(['Second', 'First'])
        resume()
        vi.advanceTimersByTime(3000)
        expect(titles()).toEqual(['Second'])
        vi.advanceTimersByTime(1000)
        expect(toasts.value).toHaveLength(0)
    })

    it('fourthToastTimerStartsWhenVisible', () => {
        const { success, info, toasts } = useToast()
        expect(MAX_VISIBLE).toBe(3)
        success('Oldest')
        info('Imported 12 test cases')
        success('Test case added')
        info('Role created')
        // Newest first; the oldest is pushed out of the visible three.
        expect(titles()).toEqual(['Role created', 'Test case added', 'Imported 12 test cases', 'Oldest'])
        expect(toasts.value.map((t) => t.visible)).toEqual([true, true, true, false])

        // Its 4 s doesn't run while it's hidden: the 5 s info toasts go first.
        vi.advanceTimersByTime(4000)
        expect(titles()).toEqual(['Role created', 'Imported 12 test cases', 'Oldest'])
        vi.advanceTimersByTime(1000)
        expect(titles()).toEqual(['Oldest'])
        // It became visible at 4 s (when 'Test case added' left), so it has 3 s left at 5 s.
        expect(byTitle('Oldest')?.visible).toBe(true)
        vi.advanceTimersByTime(2999)
        expect(titles()).toEqual(['Oldest'])
        vi.advanceTimersByTime(1)
        expect(toasts.value).toHaveLength(0)
    })

    it('countdownBecomesSuccess', () => {
        const { countdown, pause, toasts } = useToast()
        countdown('You are submitting too fast', { until: Date.now() + 7000 })
        expect(toasts.value[0]).toMatchObject({ type: 'countdown', total: 7000 })
        // Countdowns track the server's clock: pausing does nothing.
        pause()
        expect(toasts.value[0]?.paused).toBe(false)
        vi.advanceTimersByTime(6999)
        expect(toasts.value[0]?.type).toBe('countdown')
        vi.advanceTimersByTime(1)
        expect(toasts.value).toHaveLength(1)
        expect(toasts.value[0]).toMatchObject({ type: 'success', title: 'You can submit again' })
        useToast().resume()
        vi.advanceTimersByTime(1499)
        expect(toasts.value).toHaveLength(1)
        vi.advanceTimersByTime(1)
        expect(toasts.value).toHaveLength(0)

        countdown('Too many requests', { until: Date.now() + 1000, done: 'Ready' })
        vi.advanceTimersByTime(1000)
        expect(toasts.value[0]).toMatchObject({ type: 'success', title: 'Ready' })
    })

    it('promiseResolvesToSuccess', async () => {
        const { promise, toasts } = useToast()
        const d = deferred<{ id: string }>()
        const handle = promise(d.promise, {
            loading: 'Submitting…',
            success: (s) => ({ title: 'Submitted', description: `Submission ${s.id}` }),
            error: "Couldn't submit",
        })
        expect(toasts.value[0]).toMatchObject({ id: handle.id, type: 'loading', title: 'Submitting…' })
        // Loading stays until it settles.
        vi.advanceTimersByTime(60_000)
        expect(toasts.value).toHaveLength(1)

        d.resolve({ id: 'abc' })
        await vi.advanceTimersByTimeAsync(0)
        expect(toasts.value).toHaveLength(1)
        expect(toasts.value[0]).toMatchObject({ id: handle.id, type: 'success', title: 'Submitted', description: 'Submission abc' })
        vi.advanceTimersByTime(TOAST_DURATIONS.success - 1)
        expect(toasts.value).toHaveLength(1)
        vi.advanceTimersByTime(1)
        expect(toasts.value).toHaveLength(0)

        // A string message works too.
        promise(Promise.resolve(1), { loading: 'Saving…', success: 'Changes saved', error: "Couldn't save" })
        await vi.advanceTimersByTimeAsync(0)
        expect(toasts.value[0]).toMatchObject({ type: 'success', title: 'Changes saved' })
    })

    it('promiseRejectsToError', async () => {
        const { promise, toasts, announcement } = useToast()
        const d = deferred<void>()
        const handle = promise(d.promise, {
            loading: 'Saving permissions…',
            success: 'Saved',
            error: (e) => ({ title: "Couldn't save permissions", description: (e as Error).message }),
        })
        d.reject(new Error('TEACHER is unchanged.'))
        await vi.advanceTimersByTimeAsync(0)
        expect(toasts.value).toHaveLength(1)
        expect(toasts.value[0]).toMatchObject({
            id: handle.id,
            type: 'error',
            title: "Couldn't save permissions",
            description: 'TEACHER is unchanged.',
        })
        expect(announcement.value).toMatchObject({ text: "Couldn't save permissions. TEACHER is unchanged.", assertive: true })
        vi.advanceTimersByTime(TOAST_DURATIONS.error)
        expect(toasts.value).toHaveLength(0)
    })

    it('undoCommitsOnceAfterWindow', () => {
        const { undo, toasts } = useToast()
        const commit = vi.fn()
        const onUndo = vi.fn()
        undo('Problem deleted', { description: '“TỔNG TỪ 1 ĐẾN N”', commit, onUndo })
        expect(toasts.value[0]).toMatchObject({ type: 'undo', title: 'Problem deleted', total: 8000 })
        expect(toasts.value[0]?.action?.label).toBe('Undo')
        vi.advanceTimersByTime(7999)
        expect(commit).not.toHaveBeenCalled()
        vi.advanceTimersByTime(1)
        expect(commit).toHaveBeenCalledTimes(1)
        expect(toasts.value).toHaveLength(0)
        vi.advanceTimersByTime(60_000)
        window.dispatchEvent(new Event('pagehide'))
        expect(commit).toHaveBeenCalledTimes(1)
        expect(onUndo).not.toHaveBeenCalled()

        // windowMs overrides the 8 s window.
        const quick = vi.fn()
        undo('Test case deleted', { commit: quick, onUndo, windowMs: 3000 })
        vi.advanceTimersByTime(3000)
        expect(quick).toHaveBeenCalledTimes(1)
    })

    it('undoActionCancelsCommit', async () => {
        const { undo, toasts } = useToast()
        const commit = vi.fn()
        const onUndo = vi.fn()
        undo('Problem deleted', { commit, onUndo })
        vi.advanceTimersByTime(3000)
        toasts.value[0]!.action!.onClick()
        expect(onUndo).toHaveBeenCalledTimes(1)
        expect(toasts.value).toHaveLength(0)
        vi.advanceTimersByTime(60_000)
        await vi.advanceTimersByTimeAsync(0)
        window.dispatchEvent(new Event('pagehide'))
        expect(commit).not.toHaveBeenCalled()
        expect(onUndo).toHaveBeenCalledTimes(1)
    })

    it('pagehideFlushesPendingUndoOnce', () => {
        const { undo, toasts } = useToast()
        const commit = vi.fn()
        const commitOnUnload = vi.fn()
        const onUndo = vi.fn()
        undo('Problem deleted', { commit, onUndo, commitOnUnload })
        vi.advanceTimersByTime(2000)
        window.dispatchEvent(new Event('pagehide'))
        expect(commitOnUnload).toHaveBeenCalledTimes(1)
        expect(commit).not.toHaveBeenCalled()
        window.dispatchEvent(new Event('pagehide'))
        expect(commitOnUnload).toHaveBeenCalledTimes(1)
        // The flushed undo is gone, so a page restored from the back/forward cache shows no dead Undo.
        expect(toasts.value).toHaveLength(0)
        vi.advanceTimersByTime(8000)
        expect(commit).not.toHaveBeenCalled()
        expect(commitOnUnload).toHaveBeenCalledTimes(1)
        expect(onUndo).not.toHaveBeenCalled()

        // Without commitOnUnload, pagehide falls back to commit, still once.
        const plain = vi.fn()
        undo('Ban removed', { commit: plain, onUndo })
        window.dispatchEvent(new Event('pagehide'))
        vi.advanceTimersByTime(8000)
        expect(plain).toHaveBeenCalledTimes(1)
    })

    it('freezeFlushesPendingUndoOnce', () => {
        const { undo, toasts } = useToast()
        const commit = vi.fn()
        const commitOnUnload = vi.fn()
        const onUndo = vi.fn()
        undo('Problem deleted', { commit, onUndo, commitOnUnload })
        vi.advanceTimersByTime(2000)
        // A hidden tab can be frozen and then discarded with no pagehide.
        document.dispatchEvent(new Event('freeze'))
        expect(commitOnUnload).toHaveBeenCalledTimes(1)
        expect(commit).not.toHaveBeenCalled()
        document.dispatchEvent(new Event('freeze'))
        window.dispatchEvent(new Event('pagehide'))
        expect(commitOnUnload).toHaveBeenCalledTimes(1)
        expect(toasts.value).toHaveLength(0)
        vi.advanceTimersByTime(8000)
        expect(commit).not.toHaveBeenCalled()
        expect(commitOnUnload).toHaveBeenCalledTimes(1)
        expect(onUndo).not.toHaveBeenCalled()
    })

    it('errorsAnnounceAssertively', () => {
        const { error, success, info, dismiss, announcement } = useToast()
        error("Couldn't reach the server", {
            description: "Your submission wasn't sent. Check your connection.",
            action: { label: 'Retry', onClick: () => {} },
        })
        expect(announcement.value).toMatchObject({
            text: "Couldn't reach the server. Your submission wasn't sent. Check your connection. Retry available, press F8.",
            assertive: true,
        })
        success('Changes saved')
        expect(announcement.value).toMatchObject({ text: 'Changes saved', assertive: false })

        // Identical text is re-announced: seq moves on every announcement.
        const { id } = info('Imported 12 test cases')
        const first = announcement.value.seq
        dismiss(id)
        info('Imported 12 test cases')
        expect(announcement.value.text).toBe('Imported 12 test cases')
        expect(announcement.value.seq).toBe(first + 1)

        useToast().countdown('You are submitting too fast', { until: Date.now() + 7000 })
        expect(announcement.value).toMatchObject({
            text: 'You are submitting too fast. Try again in 7 seconds.',
            assertive: false,
        })
    })

    it('triggerToastStillWorks', () => {
        const { triggerToast, toasts } = useToast()
        triggerToast('Problem created')
        expect(toasts.value[0]).toMatchObject({ type: 'success', title: 'Problem created' })
        triggerToast('Failed to load problems', 'error')
        expect(toasts.value[0]).toMatchObject({ type: 'error', title: 'Failed to load problems' })
        triggerToast('Copied', 'info', 1000)
        vi.advanceTimersByTime(1000)
        expect(titles()).toEqual(['Failed to load problems', 'Problem created'])
        vi.advanceTimersByTime(3000)
        expect(titles()).toEqual(['Failed to load problems'])
        vi.advanceTimersByTime(6000)
        expect(toasts.value).toHaveLength(0)
    })
})

describe('useToast extras', () => {
    it('durationForFollowsTheTimingTable', () => {
        expect(durationFor('success', false)).toBe(4000)
        expect(durationFor('info', true)).toBe(5000)
        expect(durationFor('warning', false)).toBe(7000)
        expect(durationFor('error', false)).toBe(10_000)
        expect(durationFor('error', true)).toBe(Infinity)
        expect(durationFor('verdict', true)).toBe(6000)
        expect(durationFor('undo', true)).toBe(8000)
        expect(durationFor('loading', false)).toBe(Infinity)
        expect(durationFor('countdown', false, Date.now() + 7000)).toBe(7000)
    })

    it('returnsTheSameFunctionsEveryCall', () => {
        const a = useToast()
        const b = useToast()
        expect(a.toast).toBe(b.toast)
        expect(a.triggerToast).toBe(b.triggerToast)
        expect(a.toasts).toBe(b.toasts)
    })

    it('hiddenTabPausesTimersAndKeepsUserPause', () => {
        const { success, pause, resume, toasts } = useToast()
        try {
            success('Changes saved')
            vi.advanceTimersByTime(1000)
            setVisibility('hidden')
            expect(toasts.value[0]).toMatchObject({ paused: true, remaining: 3000 })
            vi.advanceTimersByTime(60_000)
            expect(toasts.value).toHaveLength(1)

            // Coming back while the stack is hovered (paused) keeps it paused.
            pause()
            setVisibility('visible')
            vi.advanceTimersByTime(60_000)
            expect(toasts.value).toHaveLength(1)
            resume()
            vi.advanceTimersByTime(2999)
            expect(toasts.value).toHaveLength(1)
            vi.advanceTimersByTime(1)
            expect(toasts.value).toHaveLength(0)
        } finally {
            setVisibility('visible')
        }
    })

    it('handleUpdateAndDismiss', () => {
        const { loading, toasts, announcement } = useToast()
        const h = loading('Submitting…')
        h.update({ type: 'info', title: 'Submitted', description: 'Judging now.', duration: Infinity })
        expect(toasts.value[0]).toMatchObject({ id: h.id, type: 'info', title: 'Submitted', remaining: Infinity })
        expect(announcement.value.text).toBe('Submitted. Judging now.')
        vi.advanceTimersByTime(60_000)
        h.update({ type: 'verdict', verdictStatus: 1, title: 'Accepted', duration: TOAST_DURATIONS.verdict })
        expect(toasts.value[0]).toMatchObject({ type: 'verdict', verdictStatus: 1, total: 6000 })
        h.dismiss()
        expect(toasts.value).toHaveLength(0)
        // Updating a dismissed toast does nothing.
        h.update({ title: 'Ghost' })
        expect(toasts.value).toHaveLength(0)
    })

    it('dismissingAnUndoCommitsUnlessUndoIsPressedInTheSameTick', async () => {
        const { undo, dismiss, dismissAll, toasts } = useToast()
        const commit = vi.fn()
        const onUndo = vi.fn()
        const { id } = undo('Problem deleted', { commit, onUndo })
        dismiss(id)
        await vi.advanceTimersByTimeAsync(0)
        expect(commit).toHaveBeenCalledTimes(1)
        vi.advanceTimersByTime(8000)
        expect(commit).toHaveBeenCalledTimes(1)

        // A view that dismisses before calling the action still undoes.
        const commit2 = vi.fn()
        const h = undo('User disabled', { commit: commit2, onUndo })
        const action = toasts.value[0]!.action!
        h.dismiss()
        action.onClick()
        await vi.advanceTimersByTimeAsync(8000)
        expect(commit2).not.toHaveBeenCalled()
        expect(onUndo).toHaveBeenCalledTimes(1)

        const commit3 = vi.fn()
        undo('Test case deleted', { commit: commit3, onUndo })
        useToast().success('Changes saved')
        dismissAll()
        expect(toasts.value).toHaveLength(0)
        await vi.advanceTimersByTimeAsync(0)
        expect(commit3).toHaveBeenCalledTimes(1)
    })
})
