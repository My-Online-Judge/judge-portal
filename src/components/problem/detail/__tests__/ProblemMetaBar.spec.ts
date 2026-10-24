// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ProblemMetaBar from '../ProblemMetaBar.vue'
import type { Problem } from '@/types/problem'

const problem = {
    id: 1,
    title: 'DÃY CON TĂNG DÀI NHẤT',
    problemSlug: 'day-con-tang-dai-nhat',
    subject: '',
    description: '',
    inputDescription: '',
    outputDescription: '',
    sampleInput: '',
    sampleOutput: '',
    hint: '',
    status: 1,
    hardnessLevel: 1,
    timeLimit: 3000,
    memoryLimit: 256,
    totalSubmission: 1,
    acceptedSubmission: 1,
    tags: ['binary-search', 'dp'],
} as unknown as Problem

describe('ProblemMetaBar', () => {
    it('rendersMetaAsDl', () => {
        const w = mount(ProblemMetaBar, { props: { problem } })
        const dl = w.get('dl')
        expect(dl.findAll('dt').map((dt) => dt.text())).toEqual([
            'Difficulty',
            'Time limit',
            'Memory limit',
            'Acceptance',
            'Submissions',
            'Tags',
        ])
        const dds = dl.findAll('dd').map((dd) => dd.text())
        expect(dds).toContain('3 s')
        expect(dds).toContain('256 MB')
        expect(dds).toContain('100.0%')
        const stats = w.get('button[aria-haspopup="dialog"]')
        expect(stats.text()).toBe('Statistics')
    })
})
