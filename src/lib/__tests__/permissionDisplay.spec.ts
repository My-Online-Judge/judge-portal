import { describe, it, expect } from 'vitest'
import { groupByResource, resourceLabel, resourceOf } from '@/lib/permissionDisplay'

describe('resourceOf', () => {
    it('takes the prefix before the first colon', () => {
        expect(resourceOf('problem:create')).toBe('problem')
        expect(resourceOf('judgeserver:read')).toBe('judgeserver')
    })

    it('groups a name with no colon under itself', () => {
        expect(resourceOf('dashboard')).toBe('dashboard')
    })
})

describe('resourceLabel', () => {
    it('maps known resource prefixes to nice Title-Case labels', () => {
        expect(resourceLabel('problem')).toBe('Problems')
        expect(resourceLabel('judgeserver')).toBe('Judge servers')
        expect(resourceLabel('role')).toBe('Roles')
        expect(resourceLabel('permission')).toBe('Permissions')
        expect(resourceLabel('user')).toBe('Users')
    })

    it('capitalizes an unknown prefix as a fallback', () => {
        expect(resourceLabel('contest')).toBe('Contest')
    })
})

describe('groupByResource', () => {
    it('groups permission names by their resource prefix', () => {
        const groups = groupByResource([
            'problem:create',
            'problem:delete',
            'role:read',
            'user:read',
        ])
        const problems = groups.find((g) => g.resource === 'problem')
        expect(problems?.label).toBe('Problems')
        expect(problems?.names).toEqual(['problem:create', 'problem:delete'])

        const roles = groups.find((g) => g.resource === 'role')
        expect(roles?.names).toEqual(['role:read'])
    })

    it('sorts groups by label and names within each group', () => {
        const groups = groupByResource(['user:read', 'problem:update', 'problem:create'])
        // Labels: "Problems" < "Users"
        expect(groups.map((g) => g.label)).toEqual(['Problems', 'Users'])
        expect(groups[0]?.names).toEqual(['problem:create', 'problem:update'])
    })

    it('handles an unknown resource prefix with a capitalized label', () => {
        const groups = groupByResource(['contest:manage'])
        expect(groups).toHaveLength(1)
        expect(groups[0]?.resource).toBe('contest')
        expect(groups[0]?.label).toBe('Contest')
        expect(groups[0]?.names).toEqual(['contest:manage'])
    })

    it('returns an empty array for no permissions', () => {
        expect(groupByResource([])).toEqual([])
    })
})
