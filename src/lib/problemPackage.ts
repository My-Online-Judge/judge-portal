import JSZip from 'jszip'
import type { CreateProblemPayload } from '@/types/problem'

export interface ProblemPackagePreview {
    problem: CreateProblemPayload
    testCaseCount: number
}

const TEST_CASE_RE = /(^|\/)testcases\/([^/]+)\.(in|out)$/

// Reads ONLY problem.json out of a package zip and counts complete N.in+N.out pairs.
// Test-case bytes are never inflated in the browser — the raw file is uploaded as-is.
export async function parseProblemPackage(file: File | Blob): Promise<ProblemPackagePreview> {
    let zip: JSZip
    try {
        zip = await JSZip.loadAsync(file)
    } catch {
        throw new Error('Not a valid zip file')
    }

    const entries = Object.values(zip.files).filter((f) => !f.dir)
    const jsonEntry = entries.find((f) => f.name.split('/').pop() === 'problem.json')
    if (!jsonEntry) throw new Error('problem.json not found in package')

    let parsed: { schemaVersion?: number; problem?: CreateProblemPayload }
    try {
        parsed = JSON.parse(await jsonEntry.async('text'))
    } catch {
        throw new Error('problem.json is not valid JSON')
    }
    if (parsed.schemaVersion !== 1) {
        throw new Error(`Unsupported package schemaVersion: ${parsed.schemaVersion}`)
    }
    if (!parsed.problem) throw new Error('problem.json has no "problem" object')

    const ins = new Set<string>()
    const outs = new Set<string>()
    for (const entry of entries) {
        const m = TEST_CASE_RE.exec(entry.name)
        if (!m) continue
        if (m[3] === 'in') ins.add(m[2])
        else outs.add(m[2])
    }
    const testCaseCount = [...ins].filter((name) => outs.has(name)).length

    return { problem: parsed.problem, testCaseCount }
}
