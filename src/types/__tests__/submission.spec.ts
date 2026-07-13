import { describe, it, expect } from 'vitest'
import { isTerminalStatus, SubmissionResult } from '@/types/submission'

describe('isTerminalStatus', () => {
  it('treats PENDING and JUDGING as non-terminal', () => {
    expect(isTerminalStatus(SubmissionResult.PENDING)).toBe(false)
    expect(isTerminalStatus(SubmissionResult.JUDGING)).toBe(false)
  })

  it('treats every verdict code as terminal', () => {
    expect(isTerminalStatus(SubmissionResult.SUCCESS)).toBe(true)
    expect(isTerminalStatus(SubmissionResult.WRONG_ANSWER)).toBe(true)
    expect(isTerminalStatus(SubmissionResult.COMPILE_ERROR)).toBe(true)
    expect(isTerminalStatus(SubmissionResult.SYSTEM_ERROR)).toBe(true)
    expect(isTerminalStatus(SubmissionResult.PARTIALLY_ACCEPTED)).toBe(true)
  })
})
