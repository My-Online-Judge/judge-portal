import { describe, expect, it } from 'vitest'
import { profilePath, publicHandle, publicName } from '../publicName'

const ID = 'a1b2c3d4-0000-0000-0000-000000000000'

describe('publicHandle', () => {
    it('keepsARealUsername', () => {
        expect(publicHandle('alice')).toBe('alice')
    })

    it('dropsAnEmailShapedUsernameAndAMissingOne', () => {
        // Google accounts' usernames are their email addresses: never shown, never in a URL.
        expect(publicHandle('alice@gmail.com')).toBeNull()
        expect(publicHandle(null)).toBeNull()
        expect(publicHandle(undefined)).toBeNull()
        expect(publicHandle('')).toBeNull()
    })
})

describe('publicName', () => {
    it('isTheUsernameWhenThereIsOne', () => {
        expect(publicName({ id: ID, username: 'alice', name: 'Alice Tran' })).toBe('alice')
    })

    it('isTheNameWithoutAUsername', () => {
        expect(publicName({ id: ID, username: null, name: 'Alice Tran' })).toBe('Alice Tran')
        expect(publicName({ id: ID, username: 'alice@gmail.com', name: 'Alice Tran' })).toBe('Alice Tran')
    })

    it('isContestantAndTheIdStartWithoutEither', () => {
        expect(publicName({ id: ID, username: null, name: null })).toBe('Contestant a1b2c3d4')
        expect(publicName({ id: ID, username: null, name: '  ' })).toBe('Contestant a1b2c3d4')
        // A name that is an email address is not shown either.
        expect(publicName({ id: ID, username: 'alice@gmail.com', name: 'alice@gmail.com' })).toBe('Contestant a1b2c3d4')
    })
})

describe('profilePath', () => {
    it('usesTheUsernameWhenThereIsOne', () => {
        expect(profilePath({ id: ID, username: 'an nguyen' })).toBe('/u/an%20nguyen')
    })

    it('usesTheIdOtherwiseSoNoEmailGoesInAUrl', () => {
        expect(profilePath({ id: ID, username: 'alice@gmail.com' })).toBe(`/u/id/${ID}`)
        expect(profilePath({ id: ID, username: null })).toBe(`/u/id/${ID}`)
    })

    // Google accounts get a handle derived from their display name (SP14 Q1): it links like any username.
    it('aGoogleHandleLinksByHandle', () => {
        expect(profilePath({ id: ID, username: 'nguyen_van_a' })).toBe('/u/nguyen_van_a')
    })

    it('anEmailUsernameStillLinksById', () => {
        expect(profilePath({ id: ID, username: 'nguyen.van.a@gmail.com' })).toBe(`/u/id/${ID}`)
    })

    it('byIdRouteStaysForAccountsWithoutAHandle', () => {
        expect(profilePath({ id: ID })).toBe(`/u/id/${ID}`)
        expect(profilePath({ id: ID, username: '' })).toBe(`/u/id/${ID}`)
    })
})
