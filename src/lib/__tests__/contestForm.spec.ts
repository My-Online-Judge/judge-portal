import { describe, expect, it } from 'vitest'
import { isoToLocal, labelFor, toPayload, validateContestForm, type ContestForm } from '../contestForm'

const form = (over: Partial<ContestForm> = {}): ContestForm => ({
    slug: 'spring-cup',
    title: 'Spring cup',
    description: '',
    startsLocal: '2026-10-20T09:00',
    endsLocal: '2026-10-20T11:00',
    status: 'DRAFT',
    problemSlugs: ['sum', 'max'],
    ...over,
})

describe('contestForm', () => {
    it('labelsFollowTheOrder', () => {
        expect(labelFor(0)).toBe('A')
        expect(labelFor(1)).toBe('B')
        expect(labelFor(25)).toBe('Z')
    })

    it('aCompleteFormIsValid', () => {
        expect(validateContestForm(form(), 'create')).toBeNull()
        expect(validateContestForm(form({ problemSlugs: Array.from({ length: 26 }, (_, i) => `p${i}`) }), 'create')).toBeNull()
    })

    it('theSlugIsCheckedOnCreateOnly', () => {
        for (const slug of ['ab', 'Spring-Cup', 'spring cup', 'a'.repeat(65), '']) {
            expect(validateContestForm(form({ slug }), 'create')).toBe('Use 3 to 64 lowercase letters, digits or hyphens for the slug')
        }
        expect(validateContestForm(form({ slug: 'a'.repeat(64) }), 'create')).toBeNull()
        // The slug cannot change on edit, so it is not checked there.
        expect(validateContestForm(form({ slug: 'Old Slug' }), 'edit')).toBeNull()
    })

    it('aTitleIsRequired', () => {
        expect(validateContestForm(form({ title: '   ' }), 'create')).toBe('Enter a title')
    })

    it('bothTimesAreRequired', () => {
        expect(validateContestForm(form({ startsLocal: '' }), 'create')).toBe('Choose a start and an end time')
        expect(validateContestForm(form({ endsLocal: '' }), 'edit')).toBe('Choose a start and an end time')
    })

    it('endBeforeStartIsInvalid', () => {
        const message = 'The end must be after the start'
        expect(validateContestForm(form({ endsLocal: '2026-10-20T08:59' }), 'create')).toBe(message)
        expect(validateContestForm(form({ endsLocal: '2026-10-20T09:00' }), 'create')).toBe(message)
    })

    it('moreThan26ProblemsIsInvalid', () => {
        const message = 'Add 1 to 26 problems'
        expect(validateContestForm(form({ problemSlugs: Array.from({ length: 27 }, (_, i) => `p${i}`) }), 'create')).toBe(message)
        expect(validateContestForm(form({ problemSlugs: [] }), 'create')).toBe(message)
        // A list the caller cannot see (a contest editor without problem:update, before the start) is kept as it is.
        expect(validateContestForm(form({ problemSlugs: [] }), 'edit', { problemsHidden: true })).toBeNull()
    })

    it('toPayloadConvertsLocalTimesToIso', () => {
        const payload = toPayload(form({ title: '  Spring cup  ', description: 'Two hours.' }))
        expect(payload).toEqual({
            slug: 'spring-cup',
            title: 'Spring cup',
            description: 'Two hours.',
            startsAt: new Date('2026-10-20T09:00').toISOString(),
            endsAt: new Date('2026-10-20T11:00').toISOString(),
            status: 'DRAFT',
            problemSlugs: ['sum', 'max'],
        })
    })

    describe('an edit', () => {
        // The server keeps whole seconds; the input shows minutes.
        const original = { startsAt: '2026-10-21T02:00:30Z', endsAt: '2026-10-21T04:00:45Z', problemSlugs: ['sum', 'max'] }
        const edited = (over: Partial<ContestForm> = {}) =>
            form({ startsLocal: isoToLocal(original.startsAt), endsLocal: isoToLocal(original.endsAt), ...over })

        it('showsTheServerTimeInTheLocalInput', () => {
            const d = new Date(original.startsAt)
            const pad = (n: number) => String(n).padStart(2, '0')
            expect(isoToLocal(original.startsAt)).toBe(
                `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`,
            )
        })

        it('sendsUntouchedTimesBackAsReturnedAndLeavesUntouchedProblemsOut', () => {
            const payload = toPayload(edited(), original)
            expect(payload.startsAt).toBe(original.startsAt)
            expect(payload.endsAt).toBe(original.endsAt)
            expect(payload).not.toHaveProperty('problemSlugs')
            expect(payload).not.toHaveProperty('slug')
        })

        it('sendsWhatChanged', () => {
            const payload = toPayload(edited({ endsLocal: '2026-10-21T18:00', problemSlugs: ['max', 'sum'] }), original)
            expect(payload.startsAt).toBe(original.startsAt)
            expect(payload.endsAt).toBe(new Date('2026-10-21T18:00').toISOString())
            expect(payload.problemSlugs).toEqual(['max', 'sum'])
        })

        it('leavesAHiddenListOut', () => {
            expect(toPayload(edited({ problemSlugs: [] }), { ...original, problemSlugs: [] })).not.toHaveProperty('problemSlugs')
        })
    })
})
