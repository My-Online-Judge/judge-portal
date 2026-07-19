import { describe, it, expect } from 'vitest'
import { isValidUsername, isValidPassword, isValidEmail } from '@/lib/userValidators'

describe('isValidUsername', () => {
    it('accepts 3-32 chars of letters/digits/underscore', () => {
        expect(isValidUsername('abc')).toBe(true)
        expect(isValidUsername('good_user_1')).toBe(true)
    })
    it('rejects too short, too long, or bad chars', () => {
        expect(isValidUsername('ab')).toBe(false)
        expect(isValidUsername('a'.repeat(33))).toBe(false)
        expect(isValidUsername('has space')).toBe(false)
        expect(isValidUsername('dash-no')).toBe(false)
    })
})

describe('isValidPassword', () => {
    it('requires >=8 chars with letters and digits', () => {
        expect(isValidPassword('abcd1234')).toBe(true)
        expect(isValidPassword('Passw0rd')).toBe(true)
    })
    it('rejects short or letters-only / digits-only', () => {
        expect(isValidPassword('short1')).toBe(false)
        expect(isValidPassword('onlyletters')).toBe(false)
        expect(isValidPassword('12345678')).toBe(false)
    })
})

describe('isValidEmail', () => {
    it('accepts a basic email shape and rejects malformed', () => {
        expect(isValidEmail('a@b.io')).toBe(true)
        expect(isValidEmail('not-an-email')).toBe(false)
        expect(isValidEmail('a@b')).toBe(false)
    })
})
