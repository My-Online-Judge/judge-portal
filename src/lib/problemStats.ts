import type { Problem } from '@/types/problem'
import { SubmissionResult as R } from '@/types/submission'

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

/** A slice of a problem's verdict breakdown. `status` is a submission status, or {@link OTHER_VERDICTS}. */
export interface VerdictSlice {
  status: number
  count: number
}

/** Stands for every verdict that is not Accepted, when a problem has a total but no per-verdict counts. */
export const OTHER_VERDICTS = -100

// The order the statistics read in. One TLE row counts both the CPU and the real time limit.
const CANONICAL: R[][] = [
  [R.SUCCESS],
  [R.WRONG_ANSWER],
  [R.TIME_LIMIT_EXCEEDED, R.REAL_TIME_LIMIT_EXCEEDED],
  [R.MEMORY_LIMIT_EXCEEDED],
  [R.RUNTIME_ERROR],
  [R.COMPILE_ERROR],
  [R.SYSTEM_ERROR],
]

/**
 * Splits a problem's submissions by verdict for its statistics chart. `info` is problem-service's
 * statisticInfo: counts keyed by status number as a string. Returns AC, WA, TLE (time limit and real time
 * limit together), MLE, RE, CE and SE in that order, zero counts included, then PA when someone got it.
 * Without per-verdict counts, it falls back to Accepted and {@link OTHER_VERDICTS} from the totals.
 */
export function verdictSlices(
  info: Record<string, number> | undefined,
  total: number,
  accepted: number,
): VerdictSlice[] {
  const countOf = (status: number) => Math.max(0, Number(info?.[String(status)]) || 0)
  const slices = CANONICAL.map((statuses) => ({
    status: statuses[0]!,
    count: statuses.reduce((sum, s) => sum + countOf(s), 0),
  }))
  const partial = countOf(R.PARTIALLY_ACCEPTED)
  if (partial > 0) slices.push({ status: R.PARTIALLY_ACCEPTED, count: partial })

  if (slices.some((s) => s.count > 0)) return slices
  const ac = Math.max(0, accepted || 0)
  return [
    { status: R.SUCCESS, count: ac },
    { status: OTHER_VERDICTS, count: Math.max(0, (total || 0) - ac) },
  ]
}
