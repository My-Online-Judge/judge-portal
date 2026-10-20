type Say = (title: string, opts?: { description?: string }) => unknown

// A problem rejudge answers only how many it queued; the judge queue and the 500 newest cap may have left more.
export function announceQueued(n: number, say: { success: Say; info: Say }): void {
    if (n <= 0) {
        say.info('No finished submissions to rejudge')
        return
    }
    say.success(`Queued ${n} ${n === 1 ? 'submission' : 'submissions'}`, {
        description: 'The judge queue limits each run. Run it again later if there are more.',
    })
}
