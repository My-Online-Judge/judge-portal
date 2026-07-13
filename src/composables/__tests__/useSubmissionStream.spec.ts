import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@/services/submissionService', () => ({
  default: { getSubmissionById: vi.fn() },
}))

import submissionService from '@/services/submissionService'
import { useSubmissionStream } from '@/composables/useSubmissionStream'
import { SubmissionResult } from '@/types/submission'

class MockEventSource {
  static instances: MockEventSource[] = []
  url: string
  withCredentials: boolean
  listeners: Record<string, ((ev: any) => void)[]> = {}
  closed = false
  constructor(url: string, opts?: { withCredentials?: boolean }) {
    this.url = url
    this.withCredentials = !!opts?.withCredentials
    MockEventSource.instances.push(this)
  }
  addEventListener(type: string, cb: (ev: any) => void) {
    ;(this.listeners[type] ||= []).push(cb)
  }
  close() { this.closed = true }
  emit(type: string, ev: any) { (this.listeners[type] || []).forEach((cb) => cb(ev)) }
}

const verdictEvent = (status: number) => ({ data: JSON.stringify({ id: 's1', status }) })

beforeEach(() => {
  MockEventSource.instances = []
  vi.stubGlobal('EventSource', MockEventSource as unknown as typeof EventSource)
  vi.mocked(submissionService.getSubmissionById).mockReset()
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('useSubmissionStream', () => {
  it('opens a credentialed EventSource to the stream URL', () => {
    useSubmissionStream().watch('s1', () => {})
    expect(MockEventSource.instances).toHaveLength(1)
    expect(MockEventSource.instances[0].url).toContain('/submissions/s1/stream')
    expect(MockEventSource.instances[0].withCredentials).toBe(true)
  })

  it('delivers the verdict once, closes, and ignores a later stream-close error', () => {
    const onVerdict = vi.fn()
    useSubmissionStream().watch('s1', onVerdict)
    const es = MockEventSource.instances[0]
    es.emit('verdict', verdictEvent(SubmissionResult.SUCCESS))
    expect(onVerdict).toHaveBeenCalledTimes(1)
    expect(onVerdict).toHaveBeenCalledWith(expect.objectContaining({ status: SubmissionResult.SUCCESS }))
    expect(es.closed).toBe(true)
    es.emit('error', {})
    expect(onVerdict).toHaveBeenCalledTimes(1)
    expect(submissionService.getSubmissionById).not.toHaveBeenCalled()
  })

  it('on error, closes and performs exactly one fallback GET', async () => {
    vi.mocked(submissionService.getSubmissionById).mockResolvedValue(
      { data: { data: { id: 's1', status: SubmissionResult.WRONG_ANSWER } } } as any,
    )
    const onVerdict = vi.fn()
    useSubmissionStream().watch('s1', onVerdict)
    const es = MockEventSource.instances[0]
    es.emit('error', {})
    es.emit('error', {}) // repeated errors must not re-fetch
    await vi.waitFor(() => expect(onVerdict).toHaveBeenCalledTimes(1))
    expect(submissionService.getSubmissionById).toHaveBeenCalledTimes(1)
    expect(es.closed).toBe(true)
  })

  it('falls back after the 20s safety timeout when no event arrives', async () => {
    vi.useFakeTimers()
    vi.mocked(submissionService.getSubmissionById).mockResolvedValue(
      { data: { data: { id: 's1', status: SubmissionResult.SUCCESS } } } as any,
    )
    const onVerdict = vi.fn()
    useSubmissionStream().watch('s1', onVerdict)
    await vi.advanceTimersByTimeAsync(20_000)
    expect(submissionService.getSubmissionById).toHaveBeenCalledTimes(1)
    expect(onVerdict).toHaveBeenCalledWith(expect.objectContaining({ status: SubmissionResult.SUCCESS }))
  })

  it('stopAll closes the stream and cancels the fallback timer', () => {
    vi.useFakeTimers()
    const { watch, stopAll } = useSubmissionStream()
    watch('s1', () => {})
    const es = MockEventSource.instances[0]
    stopAll()
    expect(es.closed).toBe(true)
    vi.advanceTimersByTime(20_000)
    expect(submissionService.getSubmissionById).not.toHaveBeenCalled()
  })

  it('closes the stream even when the verdict callback throws', () => {
    const onVerdict = vi.fn(() => {
      throw new Error('boom')
    })
    useSubmissionStream().watch('s1', onVerdict)
    const es = MockEventSource.instances[0]
    expect(() => es.emit('verdict', verdictEvent(SubmissionResult.SUCCESS))).toThrow('boom')
    expect(es.closed).toBe(true)
    es.emit('error', {}) // stream already closed → must not trigger a fallback fetch
    expect(submissionService.getSubmissionById).not.toHaveBeenCalled()
  })

  it('stopAll cancels an in-flight fallback GET so no verdict is applied', async () => {
    let resolveFetch!: (v: unknown) => void
    vi.mocked(submissionService.getSubmissionById).mockReturnValue(
      new Promise((r) => {
        resolveFetch = r
      }) as never,
    )
    const onVerdict = vi.fn()
    const { watch, stopAll } = useSubmissionStream()
    watch('s1', onVerdict)
    MockEventSource.instances[0].emit('error', {}) // starts an in-flight fallback fetch
    expect(submissionService.getSubmissionById).toHaveBeenCalledTimes(1)
    stopAll()
    resolveFetch({ data: { data: { id: 's1', status: SubmissionResult.SUCCESS } } })
    await Promise.resolve()
    await Promise.resolve()
    expect(onVerdict).not.toHaveBeenCalled()
  })
})
