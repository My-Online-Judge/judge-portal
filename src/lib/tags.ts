export const MAX_TAGS = 10
export const MAX_TAG_LENGTH = 32
export const TAG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/

export const SEED_TAG_VOCABULARY: string[] = [
    'beginner', 'implementation', 'simulation', 'brute-force', 'math', 'number-theory', 'combinatorics',
    'geometry', 'matrix', 'bitmasks', 'recursion', 'greedy', 'sorting', 'binary-search', 'two-pointers',
    'prefix-sum', 'sliding-window', 'dp', 'strings', 'hashing', 'stack', 'queue', 'heap', 'data-structures',
    'graphs', 'bfs', 'dfs', 'shortest-paths', 'dsu', 'trees', 'mst', 'constructive',
]

export const TAG_RULE_MESSAGE = 'Use lowercase letters, digits and single hyphens, up to 32 characters.'

export function normalizeTag(raw: string): { tag: string } | { error: string } {
    const tag = raw.trim().toLowerCase()
    if (!tag) return { error: 'Tag cannot be empty.' }
    if (tag.length > MAX_TAG_LENGTH) return { error: `Tag is longer than ${MAX_TAG_LENGTH} characters.` }
    if (!TAG_RE.test(tag)) return { error: TAG_RULE_MESSAGE }
    return { tag }
}
