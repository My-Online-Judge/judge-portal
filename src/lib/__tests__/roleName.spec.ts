import { describe, it, expect } from 'vitest'
import { isValidRoleName } from '@/lib/roleName'

describe('isValidRoleName', () => {
    it('accepts UPPER_SNAKE names', () => {
        expect(isValidRoleName('ADMIN')).toBe(true)
        expect(isValidRoleName('USER')).toBe(true)
        expect(isValidRoleName('CONTEST_MANAGER')).toBe(true)
        expect(isValidRoleName('ROLE9')).toBe(true)
    })

    it('trims surrounding whitespace before validating', () => {
        expect(isValidRoleName('  MODERATOR  ')).toBe(true)
    })

    it('rejects blank, lowercase, leading digit, spaces, and other separators', () => {
        expect(isValidRoleName('')).toBe(false)
        expect(isValidRoleName('   ')).toBe(false)
        expect(isValidRoleName('moderator')).toBe(false)
        expect(isValidRoleName('1ROLE')).toBe(false)
        expect(isValidRoleName('TWO WORDS')).toBe(false)
        expect(isValidRoleName('kebab-case')).toBe(false)
        expect(isValidRoleName('_LEADING')).toBe(false)
    })
})
