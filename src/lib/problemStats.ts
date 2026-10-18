import type { Problem } from '@/types/problem'

/** The fields of a problem that its submission statistics live in. */
export type ProblemStats = Pick<Problem, 'totalSubmission' | 'acceptedSubmission' | 'statisticInfo'>

export interface RefreshOptions {
  /** Further tries after the first, while the total has not grown. */
  retries?: number
  delayMs?: number
  sleep?: (ms: number) => Promise<void>
}

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

/**
 * Fetches a problem's statistics after one of the user's submissions got its verdict. problem-service counts the
 * verdict from Kafka on its own, alongside the stream that brought the verdict here, so its count can lag a moment:
 * while the total has not grown past {@link previousTotal}, try again (by default 3 more times, 1 s apart). Returns
 * the last answer, or null if fetching failed, so the page keeps what it shows.
 */
export async function refreshStatsUntilChanged(
  fetchStats: () => Promise<ProblemStats>,
  previousTotal: number,
  { retries = 3, delayMs = 1000, sleep = wait }: RefreshOptions = {},
): Promise<ProblemStats | null> {
  try {
    let stats = await fetchStats()
    for (let attempt = 0; attempt < retries && (stats.totalSubmission ?? 0) <= previousTotal; attempt++) {
      await sleep(delayMs)
      stats = await fetchStats()
    }
    return stats
  } catch {
    return null
  }
}
