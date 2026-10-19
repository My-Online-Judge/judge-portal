/** True when the range is empty on either side or `from` is not after `to` (ISO yyyy-mm-dd compare). */
export function isValidRange(from?: string, to?: string): boolean {
    if (!from || !to) return true
    return from <= to
}
