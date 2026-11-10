/**
 * The editor's draft for a problem, kept in this browser: the code and the language it was written in. One draft per
 * account and problem, so a reload or a later visit opens where the reader left off, and another account signed in on
 * the same browser does not get it. `owner` is the signed-in user's id, null when signed out. Storage that throws
 * (private mode, a full quota) only means no draft.
 */
export interface CodeDraft {
    languageIdentifier: string
    code: string
    /** Epoch ms of the last save. */
    savedAt: number
}

type Owner = string | null | undefined

const PREFIX = 'oj:draft:'
const keyOf = (owner: Owner, problemSlug: string) => `${PREFIX}${owner || 'guest'}:${problemSlug}`

function parse(raw: string | null): CodeDraft | null {
    if (!raw) return null
    try {
        const d = JSON.parse(raw) as Partial<CodeDraft>
        if (typeof d.code !== 'string' || typeof d.languageIdentifier !== 'string') return null
        return { code: d.code, languageIdentifier: d.languageIdentifier, savedAt: Number(d.savedAt) || 0 }
    } catch {
        return null
    }
}

export function readDraft(owner: Owner, problemSlug: string): CodeDraft | null {
    if (!problemSlug) return null
    try {
        // Earlier versions kept one draft per problem for every account of the browser: it is someone's, maybe not this reader's.
        localStorage.removeItem(`${PREFIX}${problemSlug}`)
        const own = parse(localStorage.getItem(keyOf(owner, problemSlug)))
        if (own || !owner) return own
        // Code typed signed out goes to whoever signs in next: Submit asks to sign in, and the sign-in comes back here.
        const guestKey = keyOf(null, problemSlug)
        const guest = parse(localStorage.getItem(guestKey))
        if (guest) {
            localStorage.setItem(keyOf(owner, problemSlug), JSON.stringify(guest))
            localStorage.removeItem(guestKey)
        }
        return guest
    } catch {
        return null
    }
}

/** Saves the draft, or forgets it when the code is blank. True when the browser kept it. */
export function writeDraft(owner: Owner, problemSlug: string, languageIdentifier: string, code: string, now = Date.now()): boolean {
    if (!problemSlug) return false
    try {
        if (code.trim() === '') {
            localStorage.removeItem(keyOf(owner, problemSlug))
            return false
        }
        const draft: CodeDraft = { languageIdentifier, code, savedAt: now }
        localStorage.setItem(keyOf(owner, problemSlug), JSON.stringify(draft))
        return true
    } catch {
        return false
    }
}
