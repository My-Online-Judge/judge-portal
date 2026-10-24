/**
 * The editor's draft for a problem, kept in this browser: the code and the language it was written in. One draft per
 * problem, so a reload or a later visit opens where the reader left off. Storage that throws (private mode, a full
 * quota) only means no draft.
 */
export interface CodeDraft {
    languageIdentifier: string
    code: string
    /** Epoch ms of the last save. */
    savedAt: number
}

const PREFIX = 'oj:draft:'
const keyOf = (problemSlug: string) => `${PREFIX}${problemSlug}`

export function readDraft(problemSlug: string): CodeDraft | null {
    if (!problemSlug) return null
    try {
        const raw = localStorage.getItem(keyOf(problemSlug))
        if (!raw) return null
        const d = JSON.parse(raw) as Partial<CodeDraft>
        if (typeof d.code !== 'string' || typeof d.languageIdentifier !== 'string') return null
        return { code: d.code, languageIdentifier: d.languageIdentifier, savedAt: Number(d.savedAt) || 0 }
    } catch {
        return null
    }
}

/** Saves the draft, or forgets it when the code is blank. True when the browser kept it. */
export function writeDraft(problemSlug: string, languageIdentifier: string, code: string, now = Date.now()): boolean {
    if (!problemSlug) return false
    try {
        if (code.trim() === '') {
            localStorage.removeItem(keyOf(problemSlug))
            return false
        }
        const draft: CodeDraft = { languageIdentifier, code, savedAt: now }
        localStorage.setItem(keyOf(problemSlug), JSON.stringify(draft))
        return true
    } catch {
        return false
    }
}
