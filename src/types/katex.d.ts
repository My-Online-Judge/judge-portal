// katex ships no types and no other dependency may be added; only what src/lib/math.ts uses is declared.
declare module 'katex' {
    export interface KatexOptions {
        displayMode?: boolean
        throwOnError?: boolean
        trust?: boolean
        output?: 'html' | 'mathml' | 'htmlAndMathml'
        strict?: boolean | string
        maxExpand?: number
        maxSize?: number
    }
    const katex: { renderToString(tex: string, options?: KatexOptions): string }
    export default katex
}
