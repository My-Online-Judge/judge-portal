import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const h = vi.hoisted(() => ({ refreshSession: vi.fn() }))

vi.mock('@/services/submissionService', () => ({
  default: { getSubmissionById: vi.fn() },
}))
vi.mock('@/api/axiosClient', () => ({ refreshSession: h.refreshSession }))

import submissionService from '@/services/submissionService'
import {
  useSubmissionStream,
  FALLBACK_TIMEOUT_MS,
  POLL_DELAYS_MS,
  POLL_DEADLINE_MS,
  MAX_OPEN_STREAMS,
  resetSubmissionStreams,
} from '@/composables/useSubmissionStream'
import { SubmissionResult } from '@/types/submission'

class MockEventSource {
  static readonly CONNECTING = 0
  static readonly OPEN = 1
  static readonly CLOSED = 2
  static instances: MockEventSource[] = []
  url: string
  withCredentials: boolean
  readyState = MockEventSource.CONNECTING
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
  close() {
    this.closed = true
    this.readyState = MockEventSource.CLOSED
  }
  emit(type: string, ev: any) { (this.listeners[type] || []).forEach((cb) => cb(ev)) }
  /** What a browser does when the server refuses the stream (a 401 after the access cookie expired). */
  refuse() {
    this.readyState = MockEventSource.CLOSED
    this.emit('error', {})
  }
}

const getById = vi.mocked(submissionService.getSubmissionById)
const verdictEvent = (status: number) => ({ data: JSON.stringify({ id: 's1', status }) })
const answer = (status: number) => ({ data: { data: { id: 's1', status } } }) as any
const notFound = () => Object.assign(new Error('Request failed with status code 404'), { response: { status: 404 } })

/** Times (ms since the test started) at which getSubmissionById was called. */
let callTimes: number[]
let t0: number

beforeEach(() => {
  vi.useFakeTimers()
  t0 = Date.now()
  callTimes = []
  MockEventSource.instances = []
  vi.stubGlobal('EventSource', MockEventSource as unknown as typeof EventSource)
  getById.mockReset()
  getById.mockImplementation(() => {
    callTimes.push(Date.now() - t0)
    return Promise.resolve(answer(SubmissionResult.PENDING))
  })
  h.refreshSession.mockReset()
  h.refreshSession.mockResolvedValue(undefined)
})
afterEach(() => {
  resetSubmissionStreams()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

/** Queues answers for the next polls (each one a status, or an Error to reject with); later polls answer PENDING. */
const answerPolls = (...answers: (number | Error)[]) => {
  for (const a of answers) {
    getById.mockImplementationOnce(() => {
      callTimes.push(Date.now() - t0)
      return a instanceof Error ? Promise.reject(a) : Promise.resolve(answer(a))
    })
  }
}

describe('useSubmissionStream', () => {
  it('exports the live-verdict values', () => {
    expect(FALLBACK_TIMEOUT_MS).toBe(20_000)
    expect(POLL_DELAYS_MS).toEqual([1000, 2000, 4000, 8000])
    expect(POLL_DEADLINE_MS).toBe(600_000)
  })

  it('opens a credentialed EventSource to the stream URL', () => {
    useSubmissionStream().watch('s1', () => {})
    expect(MockEventSource.instances).toHaveLength(1)
    expect(MockEventSource.instances[0].url).toContain('/submissions/s1/stream')
    expect(MockEventSource.instances[0].withCredentials).toBe(true)
  })

  it('delivers the verdict once, closes, and ignores a later stream-close error', async () => {
    const onVerdict = vi.fn()
    useSubmissionStream().watch('s1', onVerdict)
    const es = MockEventSource.instances[0]
    es.emit('verdict', verdictEvent(SubmissionResult.SUCCESS))
    expect(onVerdict).toHaveBeenCalledTimes(1)
    expect(onVerdict).toHaveBeenCalledWith(expect.objectContaining({ status: SubmissionResult.SUCCESS }))
    expect(es.closed).toBe(true)
    es.emit('error', {})
    await vi.advanceTimersByTimeAsync(POLL_DEADLINE_MS)
    expect(onVerdict).toHaveBeenCalledTimes(1)
    expect(getById).not.toHaveBeenCalled()
  })

  it('on error, closes and polls once at 1 000 ms', async () => {
    answerPolls(SubmissionResult.WRONG_ANSWER)
    const onVerdict = vi.fn()
    useSubmissionStream().watch('s1', onVerdict)
    const es = MockEventSource.instances[0]
    es.emit('error', {})
    es.emit('error', {}) // repeated errors must not start a second poller
    expect(es.closed).toBe(true)
    await vi.advanceTimersByTimeAsync(999)
    expect(getById).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    expect(getById).toHaveBeenCalledTimes(1)
    expect(onVerdict).toHaveBeenCalledTimes(1)
    expect(onVerdict).toHaveBeenCalledWith(expect.objectContaining({ status: SubmissionResult.WRONG_ANSWER }))
    await vi.advanceTimersByTimeAsync(60_000)
    expect(getById).toHaveBeenCalledTimes(1)
    expect(h.refreshSession).not.toHaveBeenCalled() // a stream still CONNECTING is not a lapsed session
  })

  it('falls back to polling after the 20s safety timeout when no event arrives', async () => {
    answerPolls(SubmissionResult.SUCCESS)
    const onVerdict = vi.fn()
    useSubmissionStream().watch('s1', onVerdict)
    await vi.advanceTimersByTimeAsync(20_000)
    expect(MockEventSource.instances[0].closed).toBe(true)
    expect(getById).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1000)
    expect(callTimes).toEqual([21_000])
    expect(onVerdict).toHaveBeenCalledWith(expect.objectContaining({ status: SubmissionResult.SUCCESS }))
  })

  it('an unparsable verdict payload polls', async () => {
    answerPolls(SubmissionResult.SUCCESS)
    const onVerdict = vi.fn()
    useSubmissionStream().watch('s1', onVerdict)
    MockEventSource.instances[0].emit('verdict', { data: '{not json' })
    expect(MockEventSource.instances[0].closed).toBe(true)
    await vi.advanceTimersByTimeAsync(1000)
    expect(onVerdict).toHaveBeenCalledTimes(1)
    expect(onVerdict).toHaveBeenCalledWith(expect.objectContaining({ status: SubmissionResult.SUCCESS }))
  })

  it('stopAll closes the stream and cancels the fallback timer', async () => {
    const { watch, stopAll } = useSubmissionStream()
    watch('s1', () => {})
    const es = MockEventSource.instances[0]
    stopAll()
    expect(es.closed).toBe(true)
    await vi.advanceTimersByTimeAsync(POLL_DEADLINE_MS)
    expect(getById).not.toHaveBeenCalled()
  })

  it('closes the stream even when the verdict callback throws', async () => {
    const onVerdict = vi.fn(() => {
      throw new Error('boom')
    })
    useSubmissionStream().watch('s1', onVerdict)
    const es = MockEventSource.instances[0]
    expect(() => es.emit('verdict', verdictEvent(SubmissionResult.SUCCESS))).toThrow('boom')
    expect(es.closed).toBe(true)
    es.emit('error', {}) // stream already closed → must not start polling
    await vi.advanceTimersByTimeAsync(60_000)
    expect(getById).not.toHaveBeenCalled()
  })

  it('stopAll cancels an in-flight poll so no verdict is applied', async () => {
    let resolveFetch!: (v: unknown) => void
    getById.mockReturnValueOnce(new Promise((r) => { resolveFetch = r }) as never)
    const onVerdict = vi.fn()
    const onGiveUp = vi.fn()
    const { watch, stopAll } = useSubmissionStream()
    watch('s1', onVerdict, onGiveUp)
    MockEventSource.instances[0].emit('error', {})
    await vi.advanceTimersByTimeAsync(1000) // the first poll is now in flight
    expect(getById).toHaveBeenCalledTimes(1)
    stopAll()
    resolveFetch(answer(SubmissionResult.SUCCESS))
    await vi.advanceTimersByTimeAsync(POLL_DEADLINE_MS)
    expect(onVerdict).not.toHaveBeenCalled()
    expect(onGiveUp).not.toHaveBeenCalled()
    expect(getById).toHaveBeenCalledTimes(1)
  })

  it('pollsWithBackoffUntilTerminal', async () => {
    answerPolls(SubmissionResult.PENDING, SubmissionResult.PENDING, SubmissionResult.PENDING, SubmissionResult.SUCCESS)
    const onVerdict = vi.fn()
    useSubmissionStream().watch('s1', onVerdict)
    MockEventSource.instances[0].emit('error', {})
    await vi.advanceTimersByTimeAsync(14_999)
    expect(callTimes).toEqual([1000, 3000, 7000])
    expect(onVerdict).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    expect(callTimes).toEqual([1000, 3000, 7000, 15_000])
    expect(onVerdict).toHaveBeenCalledTimes(1)
    expect(onVerdict).toHaveBeenCalledWith(expect.objectContaining({ status: SubmissionResult.SUCCESS }))
    await vi.advanceTimersByTimeAsync(60_000)
    expect(getById).toHaveBeenCalledTimes(4)
  })

  it('stopsPollingAfterTenMinutes', async () => {
    useSubmissionStream().watch('s1', () => {})
    MockEventSource.instances[0].emit('error', {})
    await vi.advanceTimersByTimeAsync(600_000)
    const expected = [1000, 3000, 7000]
    for (let at = 15_000; at <= 600_000; at += 8000) expected.push(at)
    expect(expected).toHaveLength(77)
    expect(expected.at(-1)).toBe(599_000)
    expect(callTimes).toEqual(expected)
    await vi.advanceTimersByTimeAsync(60_000)
    expect(getById).toHaveBeenCalledTimes(77)
  })

  it('keepsPollingThroughNetworkErrors', async () => {
    answerPolls(new Error('Network Error'), new Error('timeout of 10000ms exceeded'), SubmissionResult.SUCCESS)
    const onVerdict = vi.fn()
    const onGiveUp = vi.fn()
    useSubmissionStream().watch('s1', onVerdict, onGiveUp)
    MockEventSource.instances[0].emit('error', {})
    await vi.advanceTimersByTimeAsync(7000)
    expect(callTimes).toEqual([1000, 3000, 7000])
    expect(onVerdict).toHaveBeenCalledTimes(1)
    expect(onVerdict).toHaveBeenCalledWith(expect.objectContaining({ status: SubmissionResult.SUCCESS }))
    expect(onGiveUp).not.toHaveBeenCalled()
  })

  it('stopsPollingOn404', async () => {
    answerPolls(SubmissionResult.PENDING, notFound())
    const onVerdict = vi.fn()
    useSubmissionStream().watch('s1', onVerdict)
    MockEventSource.instances[0].emit('error', {})
    await vi.advanceTimersByTimeAsync(POLL_DEADLINE_MS)
    expect(callTimes).toEqual([1000, 3000])
    expect(onVerdict).not.toHaveBeenCalled()
  })

  it('closedStreamRefreshesOnceAndReconnects', async () => {
    const refresh = vi.fn(() => Promise.resolve())
    const onVerdict = vi.fn()
    useSubmissionStream({ refresh }).watch('s1', onVerdict)
    const first = MockEventSource.instances[0]
    first.refuse()
    expect(first.closed).toBe(true)
    expect(refresh).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(0)
    expect(MockEventSource.instances).toHaveLength(2)
    const second = MockEventSource.instances[1]
    expect(second.url).toBe(first.url)
    expect(second.withCredentials).toBe(true)
    second.emit('verdict', verdictEvent(SubmissionResult.SUCCESS))
    expect(onVerdict).toHaveBeenCalledTimes(1)
    expect(onVerdict).toHaveBeenCalledWith(expect.objectContaining({ status: SubmissionResult.SUCCESS }))
    expect(second.closed).toBe(true)
    await vi.advanceTimersByTimeAsync(POLL_DEADLINE_MS)
    expect(getById).not.toHaveBeenCalled()
    expect(refresh).toHaveBeenCalledTimes(1)
  })

  it('restarts the 20 s timer on the reconnected stream', async () => {
    let releaseRefresh!: () => void
    const refresh = vi.fn(() => new Promise<void>((r) => { releaseRefresh = r }))
    useSubmissionStream({ refresh }).watch('s1', () => {})
    await vi.advanceTimersByTimeAsync(5000)
    MockEventSource.instances[0].refuse()
    await vi.advanceTimersByTimeAsync(30_000) // the refresh is slow: no timer runs while it is pending
    expect(getById).not.toHaveBeenCalled()
    releaseRefresh()
    await vi.advanceTimersByTimeAsync(0)
    const second = MockEventSource.instances[1]
    await vi.advanceTimersByTimeAsync(19_999)
    expect(second.closed).toBe(false)
    await vi.advanceTimersByTimeAsync(1)
    expect(second.closed).toBe(true)
    await vi.advanceTimersByTimeAsync(1000)
    expect(getById).toHaveBeenCalledTimes(1)
  })

  it('secondClosedStreamFallsBackToPolling', async () => {
    const refresh = vi.fn(() => Promise.resolve())
    answerPolls(SubmissionResult.SUCCESS)
    const onVerdict = vi.fn()
    useSubmissionStream({ refresh }).watch('s1', onVerdict)
    MockEventSource.instances[0].refuse()
    await vi.advanceTimersByTimeAsync(0)
    const second = MockEventSource.instances[1]
    second.refuse()
    expect(second.closed).toBe(true)
    await vi.advanceTimersByTimeAsync(0)
    expect(MockEventSource.instances).toHaveLength(2)
    expect(refresh).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1000)
    expect(getById).toHaveBeenCalledTimes(1)
    expect(onVerdict).toHaveBeenCalledWith(expect.objectContaining({ status: SubmissionResult.SUCCESS }))
  })

  it('refreshFailureFallsBackToPolling', async () => {
    const refresh = vi.fn(() => Promise.reject(new Error('refresh token expired')))
    answerPolls(SubmissionResult.SUCCESS)
    const onVerdict = vi.fn()
    useSubmissionStream({ refresh }).watch('s1', onVerdict)
    MockEventSource.instances[0].refuse()
    await vi.advanceTimersByTimeAsync(0)
    expect(MockEventSource.instances).toHaveLength(1)
    await vi.advanceTimersByTimeAsync(1000)
    expect(getById).toHaveBeenCalledTimes(1)
    expect(onVerdict).toHaveBeenCalledTimes(1)
  })

  it('uses the shared refreshSession by default', async () => {
    useSubmissionStream().watch('s1', () => {})
    MockEventSource.instances[0].refuse()
    expect(h.refreshSession).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(0)
    expect(MockEventSource.instances).toHaveLength(2)
  })

  it('stopAllCancelsPolling', async () => {
    const { watch, stopAll } = useSubmissionStream()
    watch('s1', () => {})
    watch('s2', () => {})
    MockEventSource.instances.forEach((es) => es.emit('error', {}))
    await vi.advanceTimersByTimeAsync(3000)
    expect(getById).toHaveBeenCalledTimes(4) // both ids, at 1 s and 3 s
    stopAll()
    await vi.advanceTimersByTimeAsync(POLL_DEADLINE_MS)
    expect(getById).toHaveBeenCalledTimes(4)
  })

  it('stop during the session refresh opens no new stream', async () => {
    let releaseRefresh!: () => void
    const refresh = vi.fn(() => new Promise<void>((r) => { releaseRefresh = r }))
    const { watch, stop } = useSubmissionStream({ refresh })
    watch('s1', () => {})
    MockEventSource.instances[0].refuse()
    stop('s1')
    releaseRefresh()
    await vi.advanceTimersByTimeAsync(POLL_DEADLINE_MS)
    expect(MockEventSource.instances).toHaveLength(1)
    expect(getById).not.toHaveBeenCalled()
  })

  it('giveUpIsCalledWhenPollingEndsWithoutAVerdict: the deadline', async () => {
    const onVerdict = vi.fn()
    const onGiveUp = vi.fn()
    useSubmissionStream().watch('s1', onVerdict, onGiveUp)
    MockEventSource.instances[0].emit('error', {})
    await vi.advanceTimersByTimeAsync(598_999)
    expect(onGiveUp).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1) // the 77th poll still answers PENDING; the next would be past the deadline
    expect(onGiveUp).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(60_000)
    expect(onGiveUp).toHaveBeenCalledTimes(1)
    expect(onVerdict).not.toHaveBeenCalled()
  })

  it('giveUpIsCalledWhenPollingEndsWithoutAVerdict: a 404', async () => {
    answerPolls(notFound())
    const onGiveUp = vi.fn()
    useSubmissionStream().watch('s1', () => {}, onGiveUp)
    MockEventSource.instances[0].emit('error', {})
    await vi.advanceTimersByTimeAsync(1000)
    expect(onGiveUp).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(POLL_DEADLINE_MS)
    expect(onGiveUp).toHaveBeenCalledTimes(1)
  })

  it('giveUpIsNotCalledAfterAVerdict', async () => {
    answerPolls(SubmissionResult.PENDING, SubmissionResult.TIME_LIMIT_EXCEEDED)
    const polled = { onVerdict: vi.fn(), onGiveUp: vi.fn() }
    const streamed = { onVerdict: vi.fn(), onGiveUp: vi.fn() }
    const { watch } = useSubmissionStream()
    watch('s1', polled.onVerdict, polled.onGiveUp)
    watch('s2', streamed.onVerdict, streamed.onGiveUp)
    MockEventSource.instances[0].emit('error', {})
    MockEventSource.instances[1].emit('verdict', verdictEvent(SubmissionResult.SUCCESS))
    await vi.advanceTimersByTimeAsync(POLL_DEADLINE_MS + 60_000)
    expect(polled.onVerdict).toHaveBeenCalledTimes(1)
    expect(streamed.onVerdict).toHaveBeenCalledTimes(1)
    expect(polled.onGiveUp).not.toHaveBeenCalled()
    expect(streamed.onGiveUp).not.toHaveBeenCalled()
  })

  it('two callers watching one id share one EventSource and both hear the verdict once', () => {
    const a = vi.fn()
    const b = vi.fn()
    useSubmissionStream().watch('s1', a)
    useSubmissionStream().watch('s1', b)
    expect(MockEventSource.instances).toHaveLength(1)
    MockEventSource.instances[0].emit('verdict', verdictEvent(SubmissionResult.SUCCESS))
    expect(a).toHaveBeenCalledTimes(1)
    expect(b).toHaveBeenCalledTimes(1)
  })

  it('onGiveUp reaches every subscriber, and a stopped one hears nothing', async () => {
    const g1 = vi.fn()
    const g2 = vi.fn()
    const g3 = vi.fn()
    const s1 = useSubmissionStream()
    s1.watch('s1', () => {}, g1)
    useSubmissionStream().watch('s1', () => {}, g2)
    const s3 = useSubmissionStream()
    s3.watch('s1', () => {}, g3)
    s3.stop('s1')
    getById.mockImplementation(() => Promise.reject(notFound()))
    MockEventSource.instances[0].emit('error', {})
    await vi.advanceTimersByTimeAsync(POLL_DELAYS_MS[0])
    expect(g1).toHaveBeenCalledTimes(1)
    expect(g2).toHaveBeenCalledTimes(1)
    expect(g3).not.toHaveBeenCalled()
  })

  it('the last subscriber out closes the shared stream', () => {
    const a = useSubmissionStream()
    const b = useSubmissionStream()
    a.watch('s1', () => {})
    b.watch('s1', () => {})
    a.stop('s1')
    expect(MockEventSource.instances[0].closed).toBe(false)
    b.stop('s1')
    expect(MockEventSource.instances[0].closed).toBe(true)
  })

  it('a poll answered 401 or 403 gives up at once, with no second request', async () => {
    for (const status of [401, 403]) {
      MockEventSource.instances = []
      callTimes = []
      const onGiveUp = vi.fn()
      useSubmissionStream().watch('s1', () => {}, onGiveUp)
      getById.mockImplementationOnce(() => {
        callTimes.push(Date.now() - t0)
        return Promise.reject(Object.assign(new Error('denied'), { response: { status } }))
      })
      MockEventSource.instances[0].emit('error', {})
      await vi.advanceTimersByTimeAsync(POLL_DEADLINE_MS)
      expect(onGiveUp).toHaveBeenCalledTimes(1)
      expect(callTimes).toHaveLength(1)
    }
  })

  it('opens at most MAX_OPEN_STREAMS EventSources; the rest poll', async () => {
    const stream = useSubmissionStream()
    for (let i = 0; i < 8; i++) stream.watch(`r${i}`, () => {})
    expect(MockEventSource.instances).toHaveLength(MAX_OPEN_STREAMS)
    getById.mockClear()
    await vi.advanceTimersByTimeAsync(POLL_DELAYS_MS[0])
    expect(getById).toHaveBeenCalledTimes(8 - MAX_OPEN_STREAMS)
  })
})
