import { describe, it, expect } from 'vitest'
import { Pause, Unplug } from 'lucide-vue-next'
import { serverHealth, healthLabel, serverStatus } from '@/lib/judgeServerDisplay'

describe('serverHealth', () => {
    it('maps admin-disabled servers to "disabled" even when alive', () => {
        expect(serverHealth({ alive: true, disabled: true })).toBe('disabled')
        expect(serverHealth({ alive: false, disabled: true })).toBe('disabled')
    })

    it('maps a live, enabled server to "online"', () => {
        expect(serverHealth({ alive: true, disabled: false })).toBe('online')
    })

    it('maps a stale, enabled server to "offline"', () => {
        expect(serverHealth({ alive: false, disabled: false })).toBe('offline')
    })

    it('has a label for every health state', () => {
        expect(healthLabel).toEqual({ online: 'Online', offline: 'Offline', disabled: 'Disabled' })
    })
})

describe('serverStatus', () => {
    it('judgeServerStatusLabels', () => {
        // alive: Online, a success badge led by the live dot and no icon.
        expect(serverStatus({ alive: true, disabled: false })).toEqual({
            health: 'online', label: 'Online', variant: 'success', dot: true, icon: null,
        })
        // !alive: Offline, a danger badge with the unplug icon and no dot.
        expect(serverStatus({ alive: false, disabled: false })).toEqual({
            health: 'offline', label: 'Offline', variant: 'danger', dot: false, icon: Unplug,
        })
        // disabled wins over alive and over !alive.
        for (const alive of [true, false]) {
            expect(serverStatus({ alive, disabled: true })).toEqual({
                health: 'disabled', label: 'Disabled', variant: 'neutral', dot: false, icon: Pause,
            })
        }
    })

    it('onlyOnlineCarriesADot', () => {
        const dots = [
            { alive: true, disabled: false },
            { alive: false, disabled: false },
            { alive: true, disabled: true },
        ].map((s) => serverStatus(s).dot)
        expect(dots).toEqual([true, false, false])
    })
})
