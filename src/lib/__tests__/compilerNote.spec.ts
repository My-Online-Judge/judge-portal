import { describe, expect, it } from 'vitest'
import { compilerNoteOf } from '../compilerNote'

describe('compilerNoteOf', () => {
    it('namesTheProgramItsStandardAndOptimisation', () => {
        const cmd = '/usr/bin/g++ -DONLINE_JUDGE -O2 -w -fmax-errors=3 -std=c++17 {src_path} -lm -o {exe_path}'
        expect(compilerNoteOf({ compileCommand: cmd })).toBe('g++ -std=c++17 -O2')
    })
    it('aCommandWithoutThoseFlagsIsJustTheProgram', () => {
        expect(compilerNoteOf({ compileCommand: '/usr/bin/python3 -m py_compile {src_path}' })).toBe('python3')
    })
    it('noCommandNoNote', () => {
        expect(compilerNoteOf({ compileCommand: '' })).toBe('')
    })
})
