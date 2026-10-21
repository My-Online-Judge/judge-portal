export interface PublicProfile {
    id: string
    /** Null when the account has no public username: a Google account's username is its email address. */
    username: string | null
    name: string
    createdAt: string
}

export interface RecentSubmission {
    id: string
    problemSlug: string
    /** Verdict code, as in Submission.status. */
    result: number
    language: string
    createdAt: string
}

export interface UserStats {
    solvedCount: number
    attemptedCount: number
    submissionCount: number
    acceptedCount: number
    solvedProblems: string[]
    recent: RecentSubmission[]
}
