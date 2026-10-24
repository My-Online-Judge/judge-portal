import type { Language } from '@/types/language'

/**
 * A short note on the compiler behind a language, read from its compile command: the program's name, then the
 * language standard and optimisation flags when it has them. "/usr/bin/g++ -DONLINE_JUDGE -O2 -w -std=c++17 {src_path}"
 * reads "g++ -std=c++17 -O2". Empty when there is no compile command.
 */
export function compilerNoteOf(language: Pick<Language, 'compileCommand'>): string {
    const tokens = (language.compileCommand ?? '').trim().split(/\s+/).filter(Boolean)
    const program = tokens[0]?.split('/').pop()
    if (!program) return ''
    const std = tokens.find((t) => /^-std=/.test(t))
    const opt = tokens.find((t) => /^-O[0-3s]$/.test(t))
    return [program, std, opt].filter(Boolean).join(' ')
}
