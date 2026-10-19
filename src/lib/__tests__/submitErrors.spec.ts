import { describe, expect, it } from 'vitest'
import { AxiosError, AxiosHeaders } from 'axios'
import { retryAfterSeconds } from '../submitErrors'

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
  it('otherErrorsAreNull', () => {
    expect(retryAfterSeconds(axiosErr(500), 10)).toBeNull()
    expect(retryAfterSeconds(new Error('boom'), 10)).toBeNull()
  })
})
