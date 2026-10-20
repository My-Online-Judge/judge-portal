// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import router from '../index'

describe('routes', () => {
  it('everyRouteComponentIsLazy', () => {
    const records = router.getRoutes().filter((r) => r.components?.default)
    expect(records.length).toBeGreaterThan(0)
    for (const r of records) {
      expect(typeof r.components!.default, `${r.path} must use () => import(...)`).toBe('function')
    }
  })

  it('rootRedirectsToProblems', () => {
    const root = router.getRoutes().find((r) => r.path === '/')
    expect(root?.redirect).toBe('/problems')
  })
})
