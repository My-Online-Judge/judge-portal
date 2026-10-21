import { describe, expect, it } from 'vitest'
import { AxiosError, AxiosHeaders } from 'axios'
import { getErrorCode, getErrorMessage } from '../errorMessage'

const withBody = (data: unknown) =>
  new AxiosError('x', 'ERR', undefined, undefined, {
    status: 429, data, statusText: '', headers: new AxiosHeaders(), config: { headers: new AxiosHeaders() },
  })

describe('getErrorCode', () => {
  it('getErrorCodeReadsTheBody', () => {
    expect(getErrorCode(withBody({ status: 429, code: 'RATE_LIMITED', message: 'Too many requests' }))).toBe('RATE_LIMITED')
  })
  it('getErrorCodeIsUndefinedForANetworkError', () => {
    expect(getErrorCode(new AxiosError('Network Error', AxiosError.ERR_NETWORK))).toBeUndefined()
    expect(getErrorCode(new Error('boom'))).toBeUndefined()
  })
  it('aBodyWithoutACodeOrNotJsonHasNone', () => {
    expect(getErrorCode(withBody({ status: 429, message: 'Too many requests' }))).toBeUndefined()
    expect(getErrorCode(withBody('<html>Bad gateway</html>'))).toBeUndefined()
    expect(getErrorCode(withBody({ code: 42 }))).toBeUndefined()
  })
})

describe('getErrorMessage', () => {
  it('readsTheMessageElseTheFallback', () => {
    expect(getErrorMessage(withBody({ message: 'Too many requests' }), 'fallback')).toBe('Too many requests')
    expect(getErrorMessage(new Error('boom'), 'fallback')).toBe('fallback')
  })
})
