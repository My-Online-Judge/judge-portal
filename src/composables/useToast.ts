import { markRaw, ref, type Component, type Ref } from 'vue'

/**
 * Toast engine: one module-level stack shared by every caller. It owns state and timers only;
 * the Toaster view (layout, progress bars, live regions, keys) renders from `toasts` and
 * `announcement`. Timing follows the spec's Toast tab, "Timing and announcements".
 */

export type ToastType = 'success' | 'info' | 'warning' | 'error' | 'loading' | 'countdown' | 'undo' | 'verdict'

/** Views call `onClick()` and then `dismiss(id)`. Undo's handler removes its own toast. */
export interface ToastAction {
    label: string
    onClick: () => void
}

export interface ToastOptions {
    type: ToastType
    title: string
    description?: string
    action?: ToastAction
    /** Overrides the type's time. Ignored by `loading` (until settled) and `countdown` (until `until`). */
    duration?: number
    icon?: Component
    /** Verdict toasts only: the submission status, rendered by the view. */
    verdictStatus?: number
    /** Countdown only: epoch ms when it ends. */
    until?: number
    /** Countdown only: the success title shown at `until`. */
    done?: string
}

export interface ToastItem extends ToastOptions {
    id: number
    /** How many identical toasts were merged into this one ("×N"). */
    count: number
    /** Time left when the timer last started or stopped, in ms. Infinity when it never ends. */
    remaining: number
    /** The full time of the current state, in ms. */
    total: number
    paused: boolean
    /** Inside the first `MAX_VISIBLE`. Hidden toasts wait in the queue with their timer stopped. */
    visible: boolean
}

export interface ToastHandle {
    id: number
    update(patch: Partial<ToastOptions>): void
    dismiss(): void
}

export interface ToastAnnouncement {
    text: string
    assertive: boolean
    /** Moves on every announcement, so the view can re-announce identical text. */
    seq: number
}

type ToastExtras = Omit<ToastOptions, 'type' | 'title'>
type ToastMessage<T> = string | ((value: T) => Partial<ToastOptions>)

export const TOAST_DURATIONS = { success: 4000, info: 5000, warning: 7000, error: 10000, verdict: 6000, undo: 8000 } as const
export const MAX_VISIBLE = 3
const COUNTDOWN_DONE_MS = 1500
const NEVER_MERGE: readonly ToastType[] = ['loading', 'countdown', 'undo']

/** How long a toast of this type stays. `until` (epoch ms) is used by countdowns only. */
export function durationFor(type: ToastType, hasAction: boolean, until?: number): number {
    if (type === 'loading') return Infinity
    if (type === 'countdown') return until === undefined ? 0 : Math.max(0, until - Date.now())
    if (type === 'error' && hasAction) return Infinity
    return TOAST_DURATIONS[type]
}

interface UndoRecord {
    toastId: number
    done: boolean
    commit: () => unknown
    commitOnUnload?: () => void
}

interface Timing {
    timer?: ReturnType<typeof setTimeout>
    startedAt: number
    /** Paused by `pause(id)`. */
    held: boolean
    undo?: UndoRecord
}

const toasts = ref<ToastItem[]>([])
const announcement = ref<ToastAnnouncement>({ text: '', assertive: false, seq: 0 })
const timings = new Map<number, Timing>()
const pendingUndos = new Set<UndoRecord>()
let nextId = 0
/** Paused by `pause()` (the pointer or focus is on the stack). */
let allHeld = false
/** The tab is hidden. */
let tabHidden = false
let listening = false

const find = (id: number) => toasts.value.find((t) => t.id === id)

function resolveDuration(t: ToastItem): number {
    if (t.type === 'loading' || t.type === 'countdown') return durationFor(t.type, false, t.until)
    return t.duration ?? durationFor(t.type, Boolean(t.action))
}

/** Starts or stops a toast's timer to match its state. Remaining time is kept across stops. */
function sync(t: ToastItem) {
    const s = timings.get(t.id)
    if (!s) return
    if (t.type === 'countdown') {
        // Countdowns track the server's clock: they never pause and run even when not visible.
        if (t.paused) t.paused = false
        if (s.timer === undefined) arm(t, s)
        return
    }
    const paused = s.held || allHeld || tabHidden
    if (t.paused !== paused) t.paused = paused
    const run = t.visible && !paused && Number.isFinite(t.remaining)
    if (run && s.timer === undefined) arm(t, s)
    else if (!run && s.timer !== undefined) {
        clearTimeout(s.timer)
        s.timer = undefined
        t.remaining = Math.max(0, t.remaining - (Date.now() - s.startedAt))
    }
}

function arm(t: ToastItem, s: Timing) {
    const id = t.id
    s.startedAt = Date.now()
    s.timer = setTimeout(() => expire(id), t.remaining)
}

/** Gives the toast its full time again and starts it if it may run. */
function restart(t: ToastItem) {
    const s = timings.get(t.id)
    if (s?.timer !== undefined) {
        clearTimeout(s.timer)
        s.timer = undefined
    }
    t.total = t.remaining = resolveDuration(t)
    sync(t)
}

/** Recomputes which toasts are visible (newest first) and syncs every timer. */
function restack() {
    toasts.value.forEach((t, i) => {
        const visible = i < MAX_VISIBLE
        if (t.visible !== visible) t.visible = visible
        sync(t)
    })
}

const sentence = (s: string) => (/[.?!…]$/.test(s) ? s : `${s}.`)

/** The title alone, or the title, description and action hint as sentences. */
function announcementText(t: ToastItem): string {
    const extra: string[] = []
    if (t.type === 'countdown') extra.push(`Try again in ${Math.ceil(t.remaining / 1000)} seconds`)
    else if (t.description) extra.push(t.description)
    if (t.action) extra.push(`${t.action.label} available, press F8`)
    return extra.length ? [t.title, ...extra].map(sentence).join(' ') : t.title
}

function announce(t: ToastItem) {
    announcement.value = { text: announcementText(t), assertive: t.type === 'error', seq: announcement.value.seq + 1 }
}

/** Marks an undo settled. Returns false when it already was, so each undo settles once. */
function claim(rec: UndoRecord): boolean {
    if (rec.done) return false
    rec.done = true
    pendingUndos.delete(rec)
    return true
}

function expire(id: number) {
    const t = find(id)
    const s = timings.get(id)
    if (!t || !s) return
    s.timer = undefined
    if (t.type === 'countdown') {
        update(id, {
            type: 'success',
            title: t.done ?? 'You can submit again',
            description: undefined,
            action: undefined,
            duration: COUNTDOWN_DONE_MS,
        })
        return
    }
    const rec = s.undo
    const commit = rec !== undefined && claim(rec)
    dismiss(id)
    if (commit) rec.commit()
}

/** Removes a toast without restacking. Dismissing a pending undo ends its window: it commits. */
function remove(id: number) {
    const i = toasts.value.findIndex((t) => t.id === id)
    if (i < 0) return
    const s = timings.get(id)
    if (s?.timer !== undefined) clearTimeout(s.timer)
    timings.delete(id)
    toasts.value.splice(i, 1)
    const rec = s?.undo
    if (rec && !rec.done) {
        // Deferred a microtask, so a view that dismisses and then runs the Undo action in the
        // same handler still undoes.
        void Promise.resolve().then(() => {
            if (claim(rec)) rec.commit()
        })
    }
}

function update(id: number, patch: Partial<ToastOptions>) {
    const t = find(id)
    if (!t) return
    Object.assign(t, patch.icon ? { ...patch, icon: markRaw(patch.icon) } : patch)
    t.count = 1
    restart(t)
    announce(t)
}

function handleFor(id: number): ToastHandle {
    return { id, update: (patch) => update(id, patch), dismiss: () => dismiss(id) }
}

function onVisibilityChange() {
    tabHidden = document.visibilityState === 'hidden'
    restack()
}

/**
 * Leaving the page: every pending undo commits now, once, and its toast goes. Also runs on
 * `freeze`, since a hidden tab can be frozen and then discarded without a `pagehide`.
 */
function onPageHide() {
    for (const rec of [...pendingUndos]) {
        if (!claim(rec)) continue
        remove(rec.toastId)
        const commit = rec.commitOnUnload ?? rec.commit
        try {
            commit()
        } catch (e) {
            console.error(e)
        }
    }
    restack()
}

function listen() {
    if (listening || typeof document === 'undefined') return
    listening = true
    tabHidden = document.visibilityState === 'hidden'
    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('pagehide', onPageHide)
    document.addEventListener('freeze', onPageHide)
}

function toast(opts: ToastOptions): ToastHandle {
    listen()
    if (!NEVER_MERGE.includes(opts.type)) {
        const same = toasts.value.find((t) => t.visible && t.type === opts.type && t.title === opts.title)
        if (same) {
            same.count++
            if (opts.description !== undefined) same.description = opts.description
            if (opts.action !== undefined) same.action = opts.action
            restart(same)
            return handleFor(same.id)
        }
    }
    const id = ++nextId
    timings.set(id, { startedAt: 0, held: false })
    toasts.value.unshift({
        ...opts,
        icon: opts.icon ? markRaw(opts.icon) : undefined,
        id,
        count: 1,
        remaining: 0,
        total: 0,
        paused: false,
        visible: false,
    })
    // Read back through the reactive array so changes reach the view.
    const t = toasts.value[0]!
    t.total = t.remaining = resolveDuration(t)
    restack()
    announce(t)
    return handleFor(id)
}

const success = (title: string, opts?: ToastExtras) => toast({ ...opts, type: 'success', title })
const info = (title: string, opts?: ToastExtras) => toast({ ...opts, type: 'info', title })
const warning = (title: string, opts?: ToastExtras) => toast({ ...opts, type: 'warning', title })
const error = (title: string, opts?: ToastExtras) => toast({ ...opts, type: 'error', title })
const loading = (title: string) => toast({ type: 'loading', title })

function settledPatch<T>(type: ToastType, msg: ToastMessage<T>, value: T): Partial<ToastOptions> {
    return { type, description: undefined, action: undefined, ...(typeof msg === 'function' ? msg(value) : { title: msg }) }
}

/** A loading toast that becomes success or error when `p` settles. */
function promise<T>(
    p: Promise<T>,
    msgs: { loading: string; success: ToastMessage<T>; error: ToastMessage<unknown> },
): ToastHandle {
    const h = loading(msgs.loading)
    p.then(
        (value) => h.update(settledPatch('success', msgs.success, value)),
        (err: unknown) => h.update(settledPatch('error', msgs.error, err)),
    )
    return h
}

/** Counts down to `until` (epoch ms), then shows `done` as a success for 1.5 s. */
function countdown(title: string, opts: { until: number; done?: string }): ToastHandle {
    return toast({ type: 'countdown', title, until: opts.until, done: opts.done })
}

/**
 * Shows an Undo toast. `commit` runs once when the window ends or the toast is dismissed,
 * unless Undo is pressed. If the page is left first, `commitOnUnload ?? commit` runs once
 * instead. A rejected `commit` is the caller's to handle.
 */
function undo(
    title: string,
    opts: {
        description?: string
        commit: () => unknown
        onUndo: () => void
        windowMs?: number
        commitOnUnload?: () => void
    },
): ToastHandle {
    const rec: UndoRecord = { toastId: 0, done: false, commit: opts.commit, commitOnUnload: opts.commitOnUnload }
    const h = toast({
        type: 'undo',
        title,
        description: opts.description,
        duration: opts.windowMs ?? TOAST_DURATIONS.undo,
        action: {
            label: 'Undo',
            onClick: () => {
                const undone = claim(rec)
                dismiss(rec.toastId)
                if (undone) opts.onUndo()
            },
        },
    })
    rec.toastId = h.id
    const s = timings.get(h.id)
    if (s) s.undo = rec
    pendingUndos.add(rec)
    return h
}

/** Stops one toast's timer, or every toast's when `id` is omitted. Remaining time is kept. */
function pause(id?: number) {
    if (id === undefined) allHeld = true
    else {
        const s = timings.get(id)
        if (!s) return
        s.held = true
    }
    restack()
}

/** Restarts one toast's timer, or every toast's when `id` is omitted, with the time it had left. */
function resume(id?: number) {
    if (id === undefined) {
        allHeld = false
        timings.forEach((s) => (s.held = false))
    } else {
        const s = timings.get(id)
        if (!s) return
        s.held = false
    }
    restack()
}

function dismiss(id: number) {
    remove(id)
    restack()
}

function dismissAll() {
    toasts.value.map((t) => t.id).forEach(remove)
}

/** The old API, kept for existing callers: `toast({ type, title: message, duration })`. */
function triggerToast(message: string, type: ToastType = 'success', duration?: number): void {
    toast({ type, title: message, duration })
}

const api = {
    toasts: toasts as Readonly<Ref<ToastItem[]>>,
    announcement: announcement as Readonly<Ref<ToastAnnouncement>>,
    toast,
    success,
    info,
    warning,
    error,
    loading,
    promise,
    countdown,
    undo,
    pause,
    resume,
    dismiss,
    dismissAll,
    triggerToast,
}

export function useToast() {
    listen()
    return api
}

/** Clears the stack, every timer and the page listeners, without running any commit. */
export function __resetForTests() {
    timings.forEach((s) => clearTimeout(s.timer))
    timings.clear()
    pendingUndos.forEach((rec) => (rec.done = true))
    pendingUndos.clear()
    toasts.value = []
    announcement.value = { text: '', assertive: false, seq: 0 }
    nextId = 0
    allHeld = false
    tabHidden = false
    if (listening) {
        document.removeEventListener('visibilitychange', onVisibilityChange)
        window.removeEventListener('pagehide', onPageHide)
        document.removeEventListener('freeze', onPageHide)
        listening = false
    }
}
