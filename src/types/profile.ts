export interface PublicProfile {
    id: string
    username: string
    name: string
    avatar: string | null
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
