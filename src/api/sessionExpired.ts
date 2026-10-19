import { ROUTE_PATH } from '@/constants/routePath'

/** Only a visitor who was signed in has a session to lose: anonymous visitors also reach `onGiveUp`. */
export const shouldAnnounceSessionExpiry = (wasAuthenticated: boolean): boolean => wasAuthenticated

/** Where "Log in" goes: the admin login with a redirect on /admin routes, null (use the login prompt) elsewhere. */
export function sessionExpiredLoginTarget(
    fullPath: string,
): { path: string; query: { redirect: string } } | null {
    const path = fullPath.split(/[?#]/)[0] ?? ''
    if (path === '/admin' || path.startsWith('/admin/')) {
        return { path: ROUTE_PATH.ADMIN_LOGIN, query: { redirect: fullPath } }
    }
    return null
}
