// Contest clocks. Contest responses carry the server's time, so a countdown runs on the server's clock even when the
// browser's clock is off: now on the server = Date.now() + offset.

/** How often an open scoreboard asks for the standings again. */
export const SCOREBOARD_POLL_MS = 15_000

const pad = (n: number) => String(n).padStart(2, '0')

/**
 * Time left as "1d 02:03:04", or "02:03:04" under a day, and "00:00:00" once it has passed. A part second counts as a
 * whole one, so "00:00:00" means the moment has come.
 */
export function formatCountdown(ms: number): string {
    const total = ms > 0 ? Math.ceil(ms / 1000) : 0
    const days = Math.floor(total / 86_400)
    const clock = `${pad(Math.floor((total % 86_400) / 3600))}:${pad(Math.floor((total % 3600) / 60))}:${pad(total % 60)}`
    return days > 0 ? `${days}d ${clock}` : clock
}

/** How far the server's clock is ahead of this browser's (negative when behind), from a response's serverTime. */
export function serverOffsetMs(serverTimeIso: string, clientNowMs: number): number {
    return Date.parse(serverTimeIso) - clientNowMs
}

/** A contest's length: "2 h", "1 h 30 min", "45 min", or "2 d 3 h" from a day up. */
export function formatDuration(ms: number): string {
    const minutes = Math.max(0, Math.round(ms / 60_000))
    const d = Math.floor(minutes / 1440)
    const h = Math.floor((minutes % 1440) / 60)
    const m = minutes % 60
    if (d > 0) return h > 0 ? `${d} d ${h} h` : `${d} d`
    if (h > 0) return m > 0 ? `${h} h ${m} min` : `${h} h`
    return `${m} min`
}

/** A contest's start or end in the reader's time zone, as "21 Oct 2026, 17:00". */
export function formatContestDate(iso: string): string {
    return new Date(iso).toLocaleString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    })
}
