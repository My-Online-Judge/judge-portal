import { describe, expect, it } from 'vitest'
import { isValidRange } from '../dateRange'

describe('isValidRange', () => {
  it('emptyIsValid', () => {
    expect(isValidRange()).toBe(true)
    expect(isValidRange('2026-01-01', '')).toBe(true)
    expect(isValidRange(undefined, '2026-01-01')).toBe(true)
  })
  it('fromAfterToInvalid', () => {
    expect(isValidRange('2026-02-01', '2026-01-01')).toBe(false)
  })
  it('sameDayValid', () => {
    expect(isValidRange('2026-01-01', '2026-01-01')).toBe(true)
  })
})
