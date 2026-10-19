import { afterEach, describe, expect, it, vi } from 'vitest'

async function loadBaseUrl(): Promise<string> {
  vi.resetModules()
  return (await import('../baseUrl')).API_BASE_URL
}

describe('API_BASE_URL', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('defaults to the same-origin /api/v1 when VITE_API_BASE_URL is unset', async () => {
    vi.stubEnv('VITE_API_BASE_URL', undefined as unknown as string)
    expect(await loadBaseUrl()).toBe('/api/v1')
  })

  it('falls back to /api/v1 when VITE_API_BASE_URL is empty', async () => {
    vi.stubEnv('VITE_API_BASE_URL', '')
    expect(await loadBaseUrl()).toBe('/api/v1')
  })

  it('uses VITE_API_BASE_URL when set', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://oj.example/api/v1')
    expect(await loadBaseUrl()).toBe('https://oj.example/api/v1')
  })
})
