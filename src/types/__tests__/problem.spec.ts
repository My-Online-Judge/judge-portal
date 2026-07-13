import { describe, it, expect } from 'vitest'
import { difficultyToHardness } from '@/types/problem'

describe('difficultyToHardness', () => {
  it('maps difficulty labels to hardness levels', () => {
    expect(difficultyToHardness('easy')).toBe(1)
    expect(difficultyToHardness('medium')).toBe(2)
    expect(difficultyToHardness('hard')).toBe(3)
  })

  it('returns undefined for "all" or unknown values', () => {
    expect(difficultyToHardness('all')).toBeUndefined()
    expect(difficultyToHardness('')).toBeUndefined()
    expect(difficultyToHardness('whatever')).toBeUndefined()
  })
})
