import { describe, it, expect } from 'vitest'
import JSZip from 'jszip'
import { parseProblemPackage } from '@/lib/problemPackage'

// @vitest-environment jsdom

const problemJson = JSON.stringify({
    schemaVersion: 1,
    problem: {
        title: 'A plus B', subject: 'math', timeLimit: 1000, memoryLimit: 256,
        hardnessLevel: 1, problemSlug: 'a-plus-b', inputDescription: 'i',
        outputDescription: 'o', sampleInput: '1 2', sampleOutput: '3',
    },
})

async function zipBlob(entries: Record<string, string>): Promise<Blob> {
    const zip = new JSZip()
    for (const [name, content] of Object.entries(entries)) zip.file(name, content)
    return zip.generateAsync({ type: 'blob' })
}

describe('parseProblemPackage', () => {
    it('reads problem.json and counts complete test-case pairs', async () => {
        const blob = await zipBlob({
            'problem.json': problemJson,
            'testcases/1.in': '1 2', 'testcases/1.out': '3',
            'testcases/2.in': '4 5', 'testcases/2.out': '9',
            'testcases/3.in': 'orphan without out',
        })
        const preview = await parseProblemPackage(blob)
        expect(preview.problem.problemSlug).toBe('a-plus-b')
        expect(preview.problem.title).toBe('A plus B')
        expect(preview.testCaseCount).toBe(2)
    })

    it('tolerates a single wrapping folder', async () => {
        const blob = await zipBlob({
            'a-plus-b/problem.json': problemJson,
            'a-plus-b/testcases/1.in': '1 2', 'a-plus-b/testcases/1.out': '3',
        })
        const preview = await parseProblemPackage(blob)
        expect(preview.testCaseCount).toBe(1)
    })

    it('rejects a zip without problem.json', async () => {
        const blob = await zipBlob({ 'testcases/1.in': 'x', 'testcases/1.out': 'y' })
        await expect(parseProblemPackage(blob)).rejects.toThrow(/problem\.json/)
    })

    it('rejects malformed problem.json', async () => {
        const blob = await zipBlob({ 'problem.json': '{nope' })
        await expect(parseProblemPackage(blob)).rejects.toThrow(/not valid JSON/)
    })

    it('rejects an unsupported schemaVersion', async () => {
        const blob = await zipBlob({
            'problem.json': problemJson.replace('"schemaVersion":1', '"schemaVersion":2'),
        })
        await expect(parseProblemPackage(blob)).rejects.toThrow(/schemaVersion/)
    })

    it('rejects a non-zip file', async () => {
        await expect(parseProblemPackage(new Blob(['plain text']))).rejects.toThrow(/zip/i)
    })
})
