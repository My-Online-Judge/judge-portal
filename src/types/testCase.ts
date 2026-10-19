// List row: metadata plus short previews; full content comes from GET …/{id}.
export interface TestCaseSummary {
    id: string
    name: string
    sample: boolean
    inputSize: number
    outputSize: number
    inputPreview: string
    outputPreview: string
}

export interface TestCase {
    id: string
    name: string
    sample: boolean
    input: string
    output: string
}
