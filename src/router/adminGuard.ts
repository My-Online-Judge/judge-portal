export interface AdminRouteMeta {
  permissions?: string[]
  requiresAuth?: boolean
}

export interface AdminAccessContext {
  isAuthenticated: boolean
  hasPermission: (permission: string) => boolean
}

export type AdminAccess = 'allow' | 'login' | 'forbidden'

export function resolveAdminAccess(meta: AdminRouteMeta, ctx: AdminAccessContext): AdminAccess {
  if (meta.requiresAuth === true) return ctx.isAuthenticated ? 'allow' : 'login'
  const required = meta.permissions
  if (!required || required.length === 0) return 'allow'
  if (!ctx.isAuthenticated) return 'login'
  return required.some((p) => ctx.hasPermission(p)) ? 'allow' : 'forbidden'
}
