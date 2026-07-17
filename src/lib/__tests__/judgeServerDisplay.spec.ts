import { describe, it, expect } from 'vitest'
import { serverHealth, healthLabel, healthDotClass } from '@/lib/judgeServerDisplay'

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

    it('has a label and dot class for every health state', () => {
        for (const state of ['online', 'offline', 'disabled'] as const) {
            expect(healthLabel[state]).toBeTruthy()
            expect(healthDotClass[state]).toBeTruthy()
        }
    })
})
