<template>
    <section
        ref="rootEl"
        class="toaster"
        :class="{ expanded: expanded && items.length > 0 }"
        aria-label="Notifications (F8)"
        @mouseenter="onMouseEnter"
        @mouseleave="onMouseLeave"
        @focusin="onFocusIn"
        @focusout="onFocusOut"
    >
        <span class="toaster-hint" aria-hidden="true">Paused while you hover</span>
        <TransitionGroup tag="ol" :css="false" move-class="toast-fixed" @leave="onLeave">
            <li
                v-for="(t, i) in items"
                :key="t.id"
                :data-id="t.id"
                :class="['toast', t.type, t.type === 'verdict' ? `v-${verdictOf(t).tone}` : '', { peek: !expanded && i > 0 }]"
                tabindex="-1"
                :aria-label="t.title"
                @keydown="onKeydown(t.id, $event)"
                @pointerdown="onPointerDown(t.id, $event)"
                @pointermove="onPointerMove"
                @pointerup="onPointerEnd"
                @pointercancel="onPointerEnd"
            >
                <span class="t-ico" aria-hidden="true">
                    <span v-if="iconOf(t) === null" class="spin" />
                    <component :is="iconOf(t)" v-else />
                </span>
                <span class="t-title">{{ t.title }}<span v-if="t.count > 1" class="t-count">×{{ t.count }}</span></span>
                <span class="t-side">
                    <Button v-if="t.action" variant="secondary" size="sm" class="t-act" @click="onAction(t)">
                        {{ t.action.label }}
                    </Button>
                    <button type="button" class="t-x" aria-label="Dismiss notification" @click="dismiss(t.id)">
                        <X aria-hidden="true" />
                    </button>
                </span>
                <span v-if="t.type === 'countdown'" class="t-desc">Try again in <span class="t-cd" aria-hidden="true">{{ secondsLeft(t) }} s</span></span>
                <span v-else-if="t.description" class="t-desc">{{ t.description }}</span>
                <span v-if="hasProgress(t)" class="t-prog" aria-hidden="true" />
            </li>
        </TransitionGroup>
    </section>
    <div class="sr-only" aria-live="polite" aria-atomic="true">{{ politeText }}</div>
    <div class="sr-only" aria-live="assertive" aria-atomic="true">{{ assertiveText }}</div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch, type Component } from 'vue'
import { useEventListener, usePreferredReducedMotion } from '@vueuse/core'
import { CircleCheck, CircleX, Info, Timer, TriangleAlert, Undo2, X } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { MAX_VISIBLE, useToast, type ToastItem, type ToastType } from '@/composables/useToast'
import { verdictMeta } from '@/lib/verdict'

/**
 * The toast stack, bottom-left. The engine (`useToast`) owns state and every dismissal timer;
 * this view only lays the stack out, pauses the engine while the pointer or focus is on it,
 * and handles F8, Esc and swipe. Layout follows the spec's `layout()` (Toast tab).
 */

const GAP = 8
const PEEK = 10
const COLLAPSE_MS = 200
const LEAVE_MS = 330
const ANNOUNCE_MS = 60
const SWIPE_PX = 90
const FLICK_PX = 24
const FLICK_PX_PER_MS = 0.45

const TYPE_ICONS: Partial<Record<ToastType, Component>> = {
    success: CircleCheck,
    info: Info,
    warning: TriangleAlert,
    error: CircleX,
    countdown: Timer,
    undo: Undo2,
}

const { toasts, announcement, pause, resume, dismiss } = useToast()

// The engine marks the first MAX_VISIBLE as visible; only those render, collapsed or expanded.
const items = computed(() => toasts.value.filter((t) => t.visible))
const motion = usePreferredReducedMotion()
const reduced = () => motion.value === 'reduce'

const verdictOf = (t: ToastItem) => verdictMeta(t.verdictStatus ?? Number.NaN)
/** The icon for a toast, or null for a spinner (loading, and a Judging verdict). */
function iconOf(t: ToastItem): Component | null {
    if (t.type === 'loading') return null
    if (t.type === 'verdict') return verdictOf(t).icon
    return t.icon ?? TYPE_ICONS[t.type] ?? Info
}
const hasProgress = (t: ToastItem) => t.type === 'undo' || t.type === 'countdown'

const rootEl = ref<HTMLElement | null>(null)
const elFor = (id: number) => rootEl.value?.querySelector<HTMLElement>(`li[data-id="${id}"]:not([data-leaving])`) ?? null

/* ── Pausing and expanding ──────────────────────────────────────────────────────────────── */

const expanded = ref(false)
let hover = false
let focusInside = false
let held = false
let collapseTimer: ReturnType<typeof setTimeout> | undefined
/** Where focus was before F8, so Esc can send it back. */
let returnFocus: HTMLElement | null = null

/** Hover and focus are tracked apart: the engine resumes only when neither holds. */
function syncHold() {
    const want = hover || focusInside
    if (want && !held) {
        held = true
        pause()
    } else if (!want && held) {
        held = false
        resume()
    }
}

function expand(on: boolean) {
    clearTimeout(collapseTimer)
    if (on) {
        expanded.value = true
        return
    }
    collapseTimer = setTimeout(() => {
        if (!hover && !focusInside) expanded.value = false
    }, COLLAPSE_MS)
}

function onMouseEnter() {
    hover = true
    syncHold()
    expand(true)
}

function onMouseLeave() {
    hover = false
    syncHold()
    expand(false)
}

function onFocusIn() {
    focusInside = true
    syncHold()
    expand(true)
}

function onFocusOut(e: FocusEvent) {
    const next = e.relatedTarget
    if (next instanceof Node && rootEl.value?.contains(next)) return
    focusInside = false
    returnFocus = null
    syncHold()
    if (!hover) expand(false)
}

// The pointer can't leave a toast that's gone, so an empty stack lets go of the hover.
watch(
    () => items.value.length === 0,
    (empty) => {
        if (!empty) return
        hover = false
        syncHold()
        clearTimeout(collapseTimer)
        expanded.value = false
    },
)

/* ── Keys and actions ───────────────────────────────────────────────────────────────────── */

/** Sends focus back to where it was before F8, or out of the stack. */
function restoreFocus() {
    const target = returnFocus
    returnFocus = null
    if (target?.isConnected) target.focus()
    else if (document.activeElement instanceof HTMLElement && rootEl.value?.contains(document.activeElement)) {
        document.activeElement.blur()
    }
}

useEventListener(document, 'keydown', (e: KeyboardEvent) => {
    if (e.key !== 'F8') return
    const newest = items.value[0]
    const el = newest ? elFor(newest.id) : null
    if (!el) return
    e.preventDefault()
    const active = document.activeElement
    if (active instanceof HTMLElement && !rootEl.value?.contains(active)) returnFocus = active
    el.focus()
})

function onKeydown(id: number, e: KeyboardEvent) {
    if (e.key !== 'Escape') return
    e.preventDefault()
    e.stopPropagation()
    dismiss(id)
    restoreFocus()
}

function onAction(t: ToastItem) {
    const { id, action } = t
    try {
        action?.onClick()
    } finally {
        dismiss(id)
    }
}

/* ── Layout ─────────────────────────────────────────────────────────────────────────────── */

/** Each toast's resting transform, so a swipe or a leave can build on it. */
const baseTransform = new Map<number, string>()
const placed = new WeakSet<HTMLElement>()

interface Drag {
    id: number
    el: HTMLElement
    pointerId: number
    startX: number
    startedAt: number
    dx: number
}
/** The swipe in progress, if any. */
let drag: Drag | null = null

function layout() {
    const ol = rootEl.value?.querySelector<HTMLElement>('ol')
    if (!ol) return
    const live = items.value.flatMap((t) => {
        const el = elFor(t.id)
        return el ? [{ id: t.id, el }] : []
    })
    // A new toast starts below the stack (front) or behind it (back), so it transitions in.
    live.forEach(({ el }, i) => {
        if (placed.has(el)) return
        placed.add(el)
        el.style.opacity = '0'
        el.style.transform = i === 0 ? 'translateY(16px) scale(0.98)' : `translateY(${-MAX_VISIBLE * PEEK}px) scale(0.86)`
    })
    live.forEach(({ el }) => (el.style.height = ''))
    // Reading heights also commits the start styles above before the targets are set.
    const heights = live.map(({ el }) => el.offsetHeight)
    let y = 0
    live.forEach(({ id, el }, i) => {
        let tf: string
        let op = 1
        if (expanded.value) {
            tf = `translateY(${-y}px)`
            y += (heights[i] ?? 0) + GAP
        } else {
            tf = `translateY(${-i * PEEK}px) scale(${1 - i * 0.04})`
            op = i === 0 ? 1 : 0.9 - i * 0.12
        }
        baseTransform.set(id, tf)
        el.style.zIndex = String(100 - i)
        const peeking = !expanded.value && i > 0
        el.style.height = peeking ? `${heights[0] ?? 0}px` : ''
        el.style.overflow = peeking ? 'hidden' : ''
        if (el === drag?.el) return
        el.style.transform = tf
        el.style.opacity = String(op)
    })
    const front = heights[0] ?? 0
    const h = expanded.value ? Math.max(0, y - GAP) : live.length ? front + (live.length - 1) * PEEK : 0
    ol.style.setProperty('--stack-h', `${h}px`)
}

/** A merged toast gets a short sideways nudge. */
function nudge(id: number) {
    const el = elFor(id)
    if (!el || reduced() || typeof el.animate !== 'function') return
    const base = baseTransform.get(id) ?? ''
    el.animate(
        [{ transform: `${base} translateX(0)` }, { transform: `${base} translateX(-6px)` }, { transform: `${base} translateX(0)` }],
        { duration: 260 },
    )
}

// Relayout when what affects size or order changes, not on every timer tick.
const layoutKey = computed(() =>
    items.value.map((t) => [t.id, t.type, t.title, t.description, t.count, t.action?.label].join('\u0001')).join('\u0002'),
)
const counts = new Map<number, number>()
watch(
    [layoutKey, expanded],
    () => {
        layout()
        const seen = new Set<number>()
        for (const t of items.value) {
            seen.add(t.id)
            const before = counts.get(t.id)
            if (before !== undefined && t.count > before) nudge(t.id)
            counts.set(t.id, t.count)
        }
        for (const id of counts.keys()) if (!seen.has(id)) counts.delete(id)
    },
    { flush: 'post' },
)
onMounted(layout)
useEventListener(window, 'resize', layout)

/* ── Leaving and swiping ────────────────────────────────────────────────────────────────── */

/** Toasts swiped away, with the direction they leave in. */
const swipeOut = new Map<number, number>()
const leaveTimers = new Set<ReturnType<typeof setTimeout>>()

function onLeave(node: Element, done: () => void) {
    const el = node as HTMLElement
    el.dataset.leaving = ''
    if (el.contains(document.activeElement)) restoreFocus()
    if (drag?.el === el) drag = null
    const id = Number(el.dataset.id)
    const swipe = swipeOut.get(id)
    swipeOut.delete(id)
    const base = baseTransform.get(id) ?? ''
    baseTransform.delete(id)
    if (reduced()) {
        done()
        return
    }
    // Still in the engine means it was pushed behind the stack, not dismissed.
    const queued = toasts.value.some((t) => t.id === id)
    el.style.pointerEvents = 'none'
    el.style.opacity = '0'
    el.style.transform = swipe
        ? `${base} translateX(${swipe * 420}px)`
        : queued
          ? `translateY(${-MAX_VISIBLE * PEEK}px) scale(0.86)`
          : `${base} translateY(8px) scale(0.97)`
    const timer = setTimeout(() => {
        leaveTimers.delete(timer)
        done()
    }, LEAVE_MS)
    leaveTimers.add(timer)
}

function onPointerDown(id: number, e: PointerEvent) {
    if (e.target instanceof Element && e.target.closest('button')) return
    const el = e.currentTarget as HTMLElement
    drag = { id, el, pointerId: e.pointerId, startX: e.clientX, startedAt: performance.now(), dx: 0 }
    try {
        el.setPointerCapture?.(e.pointerId)
    } catch {
        // Capture is a nicety: without it the swipe still works while the pointer stays on the toast.
    }
    el.style.transition = 'none'
}

function onPointerMove(e: PointerEvent) {
    if (!drag || e.pointerId !== drag.pointerId) return
    drag.dx = e.clientX - drag.startX
    drag.el.style.transform = `${baseTransform.get(drag.id) ?? ''} translateX(${drag.dx}px)`
    drag.el.style.opacity = String(Math.max(0.2, 1 - Math.abs(drag.dx) / 260))
}

function onPointerEnd(e: PointerEvent) {
    if (!drag || e.pointerId !== drag.pointerId) return
    const { id, el, dx, startedAt } = drag
    drag = null
    el.style.transition = ''
    const distance = Math.abs(dx)
    const speed = distance / Math.max(1, performance.now() - startedAt)
    if (distance > SWIPE_PX || (distance > FLICK_PX && speed > FLICK_PX_PER_MS)) {
        swipeOut.set(id, dx > 0 ? 1 : -1)
        dismiss(id)
    } else layout()
}

/* ── Countdown seconds and progress bars ────────────────────────────────────────────────── */

// The seconds tick once a second; they're aria-hidden, so screen readers only hear start and end.
const clock = ref(Date.now())
let clockTimer: ReturnType<typeof setInterval> | undefined
const countdownKey = computed(() =>
    items.value
        .filter((t) => t.type === 'countdown')
        .map((t) => `${t.id}:${t.until}`)
        .join(),
)
watch(
    countdownKey,
    (key) => {
        clearInterval(clockTimer)
        clockTimer = undefined
        clock.value = Date.now()
        if (key) clockTimer = setInterval(() => (clock.value = Date.now()), 1000)
    },
    { immediate: true },
)
const secondsLeft = (t: ToastItem) => Math.ceil(Math.max(0, (t.until ?? 0) - clock.value) / 1000)

// Progress bars are written straight to the DOM each frame, without re-rendering. The engine
// keeps no start time, so the view notes when a toast's timer state last changed.
let raf = 0
const anchors = new Map<number, { key: string; at: number }>()

function tick() {
    raf = 0
    const now = Date.now()
    const ids = new Set<number>()
    for (const t of items.value) {
        if (!hasProgress(t)) continue
        ids.add(t.id)
        let left: number
        if (t.type === 'countdown') left = Math.max(0, (t.until ?? now) - now)
        else {
            const key = `${t.remaining}|${t.paused}|${t.total}`
            let anchor = anchors.get(t.id)
            if (anchor?.key !== key) anchors.set(t.id, (anchor = { key, at: now }))
            left = t.paused ? t.remaining : Math.max(0, t.remaining - (now - anchor.at))
        }
        // Under reduced motion the bar steps once a second instead of gliding.
        if (reduced()) left = Math.ceil(left / 1000) * 1000
        const fraction = t.total > 0 && Number.isFinite(t.total) ? Math.min(1, left / t.total) : 0
        const bar = elFor(t.id)?.querySelector<HTMLElement>('.t-prog')
        if (bar) bar.style.transform = `scaleX(${fraction})`
    }
    for (const id of anchors.keys()) if (!ids.has(id)) anchors.delete(id)
    if (ids.size > 0) raf = requestAnimationFrame(tick)
}

watch(
    () => items.value.some(hasProgress),
    (on) => {
        if (on && !raf) raf = requestAnimationFrame(tick)
    },
    { immediate: true, flush: 'post' },
)

/* ── Live regions ───────────────────────────────────────────────────────────────────────── */

// Cleared first, then filled a moment later, so identical text is announced again.
const politeText = ref('')
const assertiveText = ref('')
let announceTimer: ReturnType<typeof setTimeout> | undefined
watch(
    () => announcement.value.seq,
    () => {
        const { text, assertive } = announcement.value
        politeText.value = ''
        assertiveText.value = ''
        clearTimeout(announceTimer)
        announceTimer = setTimeout(() => {
            if (assertive) assertiveText.value = text
            else politeText.value = text
        }, ANNOUNCE_MS)
    },
)

onBeforeUnmount(() => {
    clearTimeout(collapseTimer)
    clearTimeout(announceTimer)
    clearInterval(clockTimer)
    if (raf) cancelAnimationFrame(raf)
    leaveTimers.forEach(clearTimeout)
    if (held) {
        held = false
        resume()
    }
})
</script>

<style>
/* Ported from the spec's .toaster / .toast rules. Colors are tokens; motion is transform and opacity. */
.toaster {
    position: fixed;
    z-index: 300;
    left: 16px;
    bottom: calc(16px + env(safe-area-inset-bottom, 0px));
    width: 380px;
    max-width: calc(100vw - 32px);
    pointer-events: none;
}
.toaster ol {
    list-style: none;
    margin: 0;
    padding: 0;
    position: relative;
    height: var(--stack-h, 0px);
}
.toast {
    --tc: var(--muted-foreground);
    pointer-events: auto;
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    background: var(--popover);
    color: var(--foreground);
    border: 1px solid var(--border);
    border-radius: 12px;
    box-shadow: var(--shadow-lg);
    padding: 12px 12px 12px 14px;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    gap: 2px 12px;
    align-items: start;
    transform-origin: bottom center;
    transition:
        transform 320ms cubic-bezier(0.2, 0.8, 0.2, 1),
        opacity 320ms cubic-bezier(0.2, 0.8, 0.2, 1);
    will-change: transform;
    touch-action: pan-y;
    user-select: none;
}
.toast > * {
    transition: opacity 200ms;
}
/* TransitionGroup's FLIP move runs only when its move class transitions transform, and it
   clears inline transforms. This one doesn't, so layout() alone positions the toasts. */
.toast.toast-fixed {
    transition: none;
}
/* Collapsed: the toasts behind the front one take its height and hide their content. */
.toast.peek > * {
    opacity: 0;
}
.toast:focus-visible {
    outline: 2px solid var(--ring);
    outline-offset: 2px;
}
.toast .t-ico {
    grid-row: 1 / span 2;
    width: 20px;
    height: 20px;
    display: grid;
    place-items: center;
    color: var(--tc);
    margin-top: 1px;
}
.toast .t-ico svg.lucide {
    width: 18px;
    height: 18px;
}
.toast .t-ico .spin {
    width: 16px;
    height: 16px;
    box-sizing: border-box;
    border-radius: 50%;
    border: 2px solid currentColor;
    border-right-color: transparent;
    animation: toast-spin 0.7s linear infinite;
}
@keyframes toast-spin {
    to {
        transform: rotate(360deg);
    }
}
.toast .t-title {
    font-size: 13.5px;
    font-weight: 600;
    line-height: 1.4;
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
    flex-wrap: wrap;
}
.toast .t-desc {
    font-size: 12.5px;
    color: var(--muted-foreground);
    line-height: 1.45;
    grid-column: 2;
}
.toast .t-side {
    grid-row: 1 / span 2;
    grid-column: 3;
    display: flex;
    align-items: center;
    gap: 4px;
    margin: -2px -2px 0 0;
}
.toast .t-x {
    appearance: none;
    border: 0;
    background: none;
    width: 26px;
    height: 26px;
    border-radius: 6px;
    display: grid;
    place-items: center;
    cursor: pointer;
    color: var(--muted-foreground);
}
.toast .t-x:hover {
    background: var(--muted);
    color: var(--foreground);
}
.toast .t-x svg.lucide {
    width: 15px;
    height: 15px;
}
.toast .t-act {
    height: 28px;
    padding: 0 10px;
    font-size: 12.5px;
}
.toast .t-count {
    font-family: var(--font-mono);
    font-size: 11px;
    font-weight: 600;
    color: var(--muted-foreground);
    background: var(--muted);
    border-radius: 4px;
    padding: 0 5px;
    line-height: 18px;
}
.toast .t-cd {
    font-family: var(--font-mono);
    font-variant-numeric: tabular-nums;
    font-weight: 600;
    color: var(--foreground);
}
.toast .t-prog {
    position: absolute;
    left: 14px;
    right: 14px;
    bottom: 0;
    height: 2px;
    border-radius: 2px;
    background: var(--tc);
    transform-origin: left;
    opacity: 0.55;
}
.toast.success {
    --tc: var(--success);
}
.toast.info,
.toast.loading,
.toast.undo {
    --tc: var(--primary);
}
.toast.warning,
.toast.countdown {
    --tc: var(--warning);
}
.toast.error {
    --tc: var(--destructive);
    border-color: color-mix(in oklch, var(--destructive) 35%, var(--border));
}
/* Verdict toasts carry a .v-{tone} class, which sets --vi to that verdict's ink. */
.toast.verdict {
    --tc: var(--vi);
}
.toaster-hint {
    position: absolute;
    bottom: 100%;
    left: 0;
    margin-bottom: 6px;
    font-size: 11px;
    color: var(--muted-foreground);
    font-family: var(--font-mono);
    opacity: 0;
    transition: opacity 200ms;
    background: var(--popover);
    padding: 1px 6px;
    border-radius: 4px;
    border: 1px solid var(--border);
}
.toaster.expanded .toaster-hint {
    opacity: 1;
}
/* Phones: full width. A page with a bar pinned to the bottom sets --toast-offset on :root. */
@media (max-width: 640px) {
    .toaster {
        left: 8px;
        right: 8px;
        width: auto;
        max-width: none;
        bottom: calc(8px + env(safe-area-inset-bottom, 0px) + var(--toast-offset, 0px));
    }
}
@media (prefers-reduced-motion: reduce) {
    .toast,
    .toast > *,
    .toaster-hint {
        transition: none;
    }
    .toast .t-ico .spin {
        animation: none;
    }
}
</style>
