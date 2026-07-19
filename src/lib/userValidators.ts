// Client-side gates for the user create/edit forms. The server is the source of
// truth (mirrors UserService validation) — these only drive immediate feedback and
// the Save button's disabled state.

const USERNAME_RE = /^[a-zA-Z0-9_]{3,32}$/
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

// 3-32 chars: letters, digits, or underscore.
export function isValidUsername(username: string): boolean {
    return USERNAME_RE.test(username.trim())
}

// At least 8 characters, including letters and digits.
export function isValidPassword(password: string): boolean {
    return password.length >= 8 && /[a-zA-Z]/.test(password) && /\d/.test(password)
}

export function isValidEmail(email: string): boolean {
    return EMAIL_RE.test(email.trim())
}
