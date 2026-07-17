// Shared display helpers for judge servers, used by both the Judge servers page
// and the dashboard health card/KPI so the online/offline/disabled treatment
// stays consistent (one source of truth for status mapping).

export type ServerHealth = 'online' | 'offline' | 'disabled'

// Admin-disabled wins over liveness; otherwise heartbeat freshness decides.
export function serverHealth(s: { alive: boolean; disabled: boolean }): ServerHealth {
    if (s.disabled) return 'disabled'
    return s.alive ? 'online' : 'offline'
}

export const healthLabel: Record<ServerHealth, string> = {
    online: 'Online',
    offline: 'Offline',
    disabled: 'Disabled',
}

// Status dot color via the shared --ok/--err tokens (disabled → muted).
export const healthDotClass: Record<ServerHealth, string> = {
    online: 'bg-ok',
    offline: 'bg-err',
    disabled: 'bg-muted-foreground',
}
