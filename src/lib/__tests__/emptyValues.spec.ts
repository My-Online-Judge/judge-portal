import { describe, it, expect } from 'vitest'
import { formatMs, formatMem } from '@/lib/verdictFormat'
import { relativeTime } from '@/lib/problemDisplay'

describe('empty values use a plain hyphen', () => {
  it('formatMs and formatMem', () => {
    expect(formatMs(null)).toBe('-')
    expect(formatMem(undefined)).toBe('-')
    expect(formatMs(12)).toBe('12 ms')
  })
  it('relativeTime', () => {
    expect(relativeTime('')).toBe('-')
    expect(relativeTime('not a date')).toBe('-')
  })
})
