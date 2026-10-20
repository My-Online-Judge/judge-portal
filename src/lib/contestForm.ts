// The admin contest form. Times are edited as datetime-local values (the reader's time zone, to the minute) and sent as
// ISO instants. The server stores whole seconds and compares an edit's start with the stored one, so a time the user
// did not touch goes back exactly as the server returned it.
import type { ContestPayload, ContestStatus } from '@/types/contest'

export interface ContestForm {
    slug: string
    title: string
    description: string
    /** datetime-local value, e.g. "2026-10-20T09:00". */
    startsLocal: string
    endsLocal: string
    status: ContestStatus
    problemSlugs: string[]
}

/** Where an edit started, as the server returned it. */
export interface ContestOriginal {
    startsAt: string
    endsAt: string
    problemSlugs: string[]
}

export const MAX_CONTEST_PROBLEMS = 26
const SLUG = /^[a-z0-9-]{3,64}$/

/** A problem's label from its position: A, B, C and so on. */
export function labelFor(index: number): string {
    return String.fromCharCode(65 + index)
}

const pad = (n: number) => String(n).padStart(2, '0')

/** An ISO instant as a datetime-local value in the reader's time zone (seconds are dropped). */
export function isoToLocal(iso: string): string {
    const d = new Date(iso)
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/**
 * The first thing to fix, or null. `problemsHidden`: an edit by a caller who cannot see the contest's problems yet
 * (contest:update without problem:update, before the start); the list then stays as it is and is not checked.
 */
export function validateContestForm(
    form: ContestForm,
    mode: 'create' | 'edit',
    { problemsHidden = false }: { problemsHidden?: boolean } = {},
): string | null {
    if (mode === 'create' && !SLUG.test(form.slug)) return 'Use 3 to 64 lowercase letters, digits or hyphens for the slug'
    if (!form.title.trim()) return 'Enter a title'
    if (!form.startsLocal || !form.endsLocal) return 'Choose a start and an end time'
    if (!(Date.parse(form.endsLocal) > Date.parse(form.startsLocal))) return 'The end must be after the start'
    const count = form.problemSlugs.length
    if (!problemsHidden && (count < 1 || count > MAX_CONTEST_PROBLEMS)) return `Add 1 to ${MAX_CONTEST_PROBLEMS} problems`
    return null
}

const sameList = (a: string[], b: string[]) => a.length === b.length && a.every((s, i) => s === b[i])

/**
 * The request body. On create (no `original`) everything goes. On an edit, a time still showing the original value is
 * sent back as the server returned it, the problem list goes only when it changed, and the slug (fixed) is left out.
 */
export function toPayload(form: ContestForm, original?: ContestOriginal): ContestPayload {
    const time = (local: string, iso?: string) => (iso !== undefined && local === isoToLocal(iso) ? iso : new Date(local).toISOString())
    const payload: ContestPayload = {
        title: form.title.trim(),
        description: form.description,
        startsAt: time(form.startsLocal, original?.startsAt),
        endsAt: time(form.endsLocal, original?.endsAt),
        status: form.status,
    }
    if (!original) return { slug: form.slug, ...payload, problemSlugs: [...form.problemSlugs] }
    if (!sameList(form.problemSlugs, original.problemSlugs)) payload.problemSlugs = [...form.problemSlugs]
    return payload
}
