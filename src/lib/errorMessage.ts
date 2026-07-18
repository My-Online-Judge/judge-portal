import axios from 'axios'

// Pull a user-facing message out of an unknown error — typically an Axios error
// carrying our ApiResponse body ({ message }) — falling back to a default.
// Centralises the `err?.response?.data?.message` pattern so catch blocks stay
// `unknown`-typed instead of `any`.
export function getErrorMessage(err: unknown, fallback: string): string {
    if (axios.isAxiosError(err)) {
        const message = (err.response?.data as { message?: string } | undefined)?.message
        if (message) return message
    }
    return fallback
}
