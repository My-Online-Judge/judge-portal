import { describe, expect, it, vi } from 'vitest'
import { refreshStatsUntilChanged, type ProblemStats } from '@/lib/problemStats'

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
