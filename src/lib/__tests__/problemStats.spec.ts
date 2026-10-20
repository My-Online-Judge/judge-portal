import { describe, expect, it, vi } from 'vitest'
import { OTHER_VERDICTS, refreshStatsUntilChanged, verdictSlices, type ProblemStats } from '@/lib/problemStats'

const stats = (total: number, accepted = 0): ProblemStats => ({
  totalSubmission: total,
  acceptedSubmission: accepted,
  statisticInfo: { '0': accepted },
})

describe('refreshStatsUntilChanged', () => {
  it('returns at once when the total already counts the new verdict', async () => {
    const fetchStats = vi.fn().mockResolvedValue(stats(11, 6))
    const sleep = vi.fn()

    await expect(refreshStatsUntilChanged(fetchStats, 10, { sleep })).resolves.toEqual(stats(11, 6))
    expect(fetchStats).toHaveBeenCalledTimes(1)
    expect(sleep).not.toHaveBeenCalled()
  })

  it('tries again, 1 s apart, while problem-service has not counted the verdict yet', async () => {
    const fetchStats = vi.fn()
      .mockResolvedValueOnce(stats(10))
      .mockResolvedValueOnce(stats(10))
      .mockResolvedValueOnce(stats(11, 1))
    const sleep = vi.fn().mockResolvedValue(undefined)

    await expect(refreshStatsUntilChanged(fetchStats, 10, { sleep })).resolves.toEqual(stats(11, 1))
    expect(fetchStats).toHaveBeenCalledTimes(3)
    expect(sleep.mock.calls).toEqual([[1000], [1000]])
  })

  it('gives up after three retries and returns the last answer', async () => {
    const fetchStats = vi.fn().mockResolvedValue(stats(10))
    const sleep = vi.fn().mockResolvedValue(undefined)

    await expect(refreshStatsUntilChanged(fetchStats, 10, { sleep })).resolves.toEqual(stats(10))
    expect(fetchStats).toHaveBeenCalledTimes(4)
  })

  it('returns null when the refresh fails, so the page keeps what it shows', async () => {
    const fetchStats = vi.fn().mockRejectedValue(new Error('network'))

    await expect(refreshStatsUntilChanged(fetchStats, 10, { sleep: vi.fn() })).resolves.toBeNull()
  })
})

describe('verdictSlices', () => {
  it('verdictSlicesCanonicalOrder', () => {
    const shuffled = { '5': 1, '-2': 2, '4': 3, '3': 4, '1': 5, '-1': 6, '0': 7 }

    expect(verdictSlices(shuffled, 28, 7)).toEqual([
      { status: 0, count: 7 },
      { status: -1, count: 6 },
      { status: 1, count: 5 },
      { status: 3, count: 4 },
      { status: 4, count: 3 },
      { status: -2, count: 2 },
      { status: 5, count: 1 },
    ])
    // Verdicts nobody got keep their row, with a zero count.
    expect(verdictSlices({ '-1': 3, '0': 2 }, 5, 2).map((s) => s.count)).toEqual([2, 3, 0, 0, 0, 0, 0])
  })

  it('verdictSlicesSumsBothTle', () => {
    const slices = verdictSlices({ '0': 2, '1': 3, '2': 4 }, 9, 2)

    expect(slices.find((s) => s.status === 1)).toEqual({ status: 1, count: 7 })
    expect(slices.some((s) => s.status === 2)).toBe(false)
  })

  it('verdictSlicesFallback', () => {
    const fallback = [
      { status: 0, count: 4 },
      { status: OTHER_VERDICTS, count: 6 },
    ]

    expect(verdictSlices({}, 10, 4)).toEqual(fallback)
    expect(verdictSlices(undefined, 10, 4)).toEqual(fallback)
  })

  it('keeps partially accepted counts after the canonical seven', () => {
    const slices = verdictSlices({ '0': 1, '8': 2 }, 3, 1)

    expect(slices).toHaveLength(8)
    expect(slices.at(-1)).toEqual({ status: 8, count: 2 })
    expect(verdictSlices({ '0': 1, '8': 0 }, 1, 1)).toHaveLength(7)
  })
})
