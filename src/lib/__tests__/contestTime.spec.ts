import { describe, expect, it } from 'vitest'
import { formatContestDate, formatCountdown, formatDuration, SCOREBOARD_POLL_MS, serverOffsetMs } from '../contestTime'

describe('formatCountdown', () => {
    it('showsDaysAboveADay', () => {
        expect(formatCountdown(93_784_000)).toBe('1d 02:03:04')
    })

    it('showsTheClockUnderADay', () => {
        expect(formatCountdown(3_723_000)).toBe('01:02:03')
    })

    it('isZeroOnceThePointHasPassed', () => {
        expect(formatCountdown(-5)).toBe('00:00:00')
        expect(formatCountdown(0)).toBe('00:00:00')
    })

    it('roundsAPartSecondUpSoZeroMeansNow', () => {
        expect(formatCountdown(1)).toBe('00:00:01')
        expect(formatCountdown(59_001)).toBe('00:01:00')
    })
})

describe('serverOffsetMs', () => {
    it('countdownUsesServerOffset', () => {
        // The server says 10:00:00 while this browser's clock reads 10:05:00.
        expect(serverOffsetMs('2026-10-21T10:00:00Z', Date.parse('2026-10-21T10:05:00Z'))).toBe(-300_000)
    })
})

it('theScoreboardPollsEvery15Seconds', () => {
    expect(SCOREBOARD_POLL_MS).toBe(15_000)
})

describe('formatDuration', () => {
    it('readsLikeALength', () => {
        expect(formatDuration(7_200_000)).toBe('2 h')
        expect(formatDuration(5_400_000)).toBe('1 h 30 min')
        expect(formatDuration(2_700_000)).toBe('45 min')
        expect(formatDuration(97_200_000)).toBe('1 d 3 h')
        expect(formatDuration(172_800_000)).toBe('2 d')
    })
})

describe('formatContestDate', () => {
    it('hasTheDayMonthYearAndTime', () => {
        const text = formatContestDate('2026-10-21T10:00:00Z')
        expect(text).toMatch(/^\d{1,2} Oct 2026, \d{2}:\d{2}$/)
    })
})
