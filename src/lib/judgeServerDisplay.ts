// Shared display helpers for judge servers, used by both the Judge servers page
// and the dashboard (health table and stat cell) so the online/offline/disabled
// treatment stays consistent (one source of truth for status mapping).
import type { Component } from 'vue'
import { Pause, Unplug } from 'lucide-vue-next'

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

export interface ServerStatusMeta {
    health: ServerHealth
    label: string
    variant: 'success' | 'danger' | 'neutral'
    /** Only live state (Online) gets the colored dot; the others lead with an icon. */
    dot: boolean
    icon: Component | null
}

const STATUS: Record<ServerHealth, Omit<ServerStatusMeta, 'health' | 'label'>> = {
    online: { variant: 'success', dot: true, icon: null },
    offline: { variant: 'danger', dot: false, icon: Unplug },
    disabled: { variant: 'neutral', dot: false, icon: Pause },
}

/** Badge treatment for a server: Online, Offline or Disabled (disabled wins). */
export function serverStatus(s: { alive: boolean; disabled: boolean }): ServerStatusMeta {
    const health = serverHealth(s)
    return { health, label: healthLabel[health], ...STATUS[health] }
}
