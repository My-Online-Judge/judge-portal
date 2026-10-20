import { describe, expect, it } from 'vitest'
import { AxiosError, AxiosHeaders } from 'axios'
import { busyFallbackMessage, isContestNotRunning, retryAfterSeconds } from '../submitErrors'

const axiosErr = (status: number, headers: Record<string, string> = {}) =>
  new AxiosError('x', 'ERR', undefined, undefined, {
    status, data: {}, statusText: '', headers: new AxiosHeaders(headers), config: { headers: new AxiosHeaders() },
  })

describe('retryAfterSeconds', () => {
  it('a503WithRetryAfterIs30', () => {
    expect(retryAfterSeconds(axiosErr(503, { 'retry-after': '30' }), 10)).toBe(30)
  })
  it('a429WithoutHeaderUsesFallback', () => {
    expect(retryAfterSeconds(axiosErr(429), 10)).toBe(10)
  })
  it('a503WithAnHttpDateCountsDownToIt', () => {
    const at = new Date(Date.now() + 30_000).toUTCString()
    const s = retryAfterSeconds(axiosErr(503, { 'retry-after': at }), 10)
    expect(s).toBeGreaterThanOrEqual(29)
    expect(s).toBeLessThanOrEqual(30)
  })
  it('otherErrorsAreNull', () => {
    expect(retryAfterSeconds(axiosErr(500), 10)).toBeNull()
    expect(retryAfterSeconds(new Error('boom'), 10)).toBeNull()
  })
})

describe('busyFallbackMessage', () => {
  it('a429SaysTooFast', () => {
    expect(busyFallbackMessage(axiosErr(429))).toBe('You are submitting too fast')
  })
  it('a503WithoutBodySaysJudgeUnavailable', () => {
    expect(busyFallbackMessage(axiosErr(503))).toBe('The judge is unavailable, try again in a moment')
  })
  it('keepsTheServerMessageWhenPresent', () => {
    const err = new AxiosError('x', 'ERR', undefined, undefined, {
      status: 503, data: { message: 'Judge is busy' }, statusText: '', headers: new AxiosHeaders(), config: { headers: new AxiosHeaders() },
    })
    expect(busyFallbackMessage(err)).toBe('Judge is busy')
  })
})

describe('isContestNotRunning', () => {
  const withBody = (status: number, message: string) =>
    new AxiosError('x', 'ERR', undefined, undefined, {
      status, data: { status, message }, statusText: '', headers: new AxiosHeaders(), config: { headers: new AxiosHeaders() },
    })
  it('aContestSubmitAfterTheEndIsRecognised', () => {
    expect(isContestNotRunning(withBody(400, 'Contest is not running'))).toBe(true)
  })
  it('otherBadRequestsAreNot', () => {
    expect(isContestNotRunning(withBody(400, 'Invalid request'))).toBe(false)
    expect(isContestNotRunning(withBody(404, 'Contest is not running'))).toBe(false)
    expect(isContestNotRunning(new Error('Contest is not running'))).toBe(false)
  })
})
