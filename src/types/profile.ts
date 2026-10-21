export interface PublicProfile {
    id: string
    /** Null only for an unresolved or legacy email-shaped username; Google accounts have a handle since SP14. */
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
