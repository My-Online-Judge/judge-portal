// Role names are UPPER_SNAKE: a leading uppercase letter followed by uppercase
// letters, digits, or underscores (e.g. "ADMIN", "CONTEST_MANAGER"). Kept in one
// place so the create dialog's client-side gate matches the server's validation.

const ROLE_NAME_RE = /^[A-Z][A-Z0-9_]*$/

// True when `name` (after trimming) is a valid role name. The server is still the
// source of truth — this only gates the Save button for immediate feedback.
export function isValidRoleName(name: string): boolean {
    return ROLE_NAME_RE.test(name.trim())
}
