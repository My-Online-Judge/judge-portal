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

  it('adminSubmissionsNeedsReadAny', () => {
    const route = router.getRoutes().find((r) => r.name === 'AdminSubmissions')
    expect(route?.path).toBe('/admin/submissions')
    expect(route?.meta.permissions).toEqual(['submission:read_any'])
    // A submissions-only admin still reaches the dashboard.
    const dashboard = router.getRoutes().find((r) => r.name === 'AdminDashboard')
    expect(dashboard?.meta.permissions).toContain('submission:read_any')
  })

  it('adminContestsNeedsAContestPermission', () => {
    const route = router.getRoutes().find((r) => r.name === 'AdminContests')
    expect(route?.path).toBe('/admin/contests')
    expect(route?.meta.permissions).toEqual(['contest:create', 'contest:update', 'contest:delete'])
    // A contests-only admin still reaches the dashboard.
    const dashboard = router.getRoutes().find((r) => r.name === 'AdminDashboard')
    expect(dashboard?.meta.permissions).toEqual(expect.arrayContaining(['contest:create', 'contest:update', 'contest:delete']))
  })

  it('contestRoutesReuseTheProblemPageAndAskForASignInThemselves', () => {
    const byName = (name: string) => router.getRoutes().find((r) => r.name === name)
    expect(byName('Contests')?.path).toBe('/contests')
    expect(byName('ContestDetail')?.path).toBe('/contests/:slug')
    const problem = byName('ContestProblem')
    expect(problem?.path).toBe('/contests/:contestSlug/problems/:label')
    // Not the guard's /admin/login redirect: the page opens the header's login dialog for a signed-out visitor.
    expect(problem?.meta.requiresAuth).toBeUndefined()
    // The contest list and detail are public.
    expect(byName('Contests')?.meta.requiresAuth).toBeUndefined()
    expect(byName('ContestDetail')?.meta.requiresAuth).toBeUndefined()
    // Same lazy chunk as /problems/:slug.
    expect(String(problem?.components?.default)).toContain('ProblemDetailPage')
  })
})
