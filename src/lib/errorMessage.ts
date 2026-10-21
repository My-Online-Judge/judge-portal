import axios from 'axios'

// Pull a user-facing message out of an unknown error, typically an Axios error
// carrying our ApiResponse body ({ message }), falling back to a default.
// Centralises the `err?.response?.data?.message` pattern so catch blocks stay
// `unknown`-typed instead of `any`.
export function getErrorMessage(err: unknown, fallback: string): string {
    if (axios.isAxiosError(err)) {
        const message = (err.response?.data as { message?: string } | undefined)?.message
        if (message) return message
    }
    return fallback
}

// The machine-readable code an API error body carries (the ErrorCode name, e.g. RATE_LIMITED; oj-common 0.8.1 and
// later), or undefined: no response (a network error), a body that is not ours, or a backend from before 0.8.1.
export function getErrorCode(err: unknown): string | undefined {
    if (!axios.isAxiosError(err)) return undefined
    const code = (err.response?.data as { code?: unknown } | undefined)?.code
    return typeof code === 'string' && code ? code : undefined
}
