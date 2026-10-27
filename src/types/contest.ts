// Contests as problem-service serves them (/api/v1/contests). Times are ISO instants at whole seconds.

export type ContestStatus = 'DRAFT' | 'PUBLISHED'

/** Where a contest is in time; it runs over the half-open window [startsAt, endsAt). */
export type ContestPhase = 'UPCOMING' | 'RUNNING' | 'ENDED'

/** Who may take part while it runs: everyone signed in, or only the users who registered first. */
export type ContestEnrollment = 'OPEN' | 'REQUIRED'

export interface ContestSummary {
    slug: string
    title: string
    startsAt: string
    endsAt: string
    status: ContestStatus
    phase: ContestPhase
    problemCount: number
    enrollment: ContestEnrollment
    /** How many users registered (0 for an open contest). */
    enrolledCount: number
    /** Whether the viewer registered; false when anonymous. */
    enrolled: boolean
}

export interface ContestList {
    running: ContestSummary[]
    upcoming: ContestSummary[]
    past: ContestSummary[]
    /** The server's clock when it answered: countdowns correct the browser's clock by it. */
    serverTime: string
}

export interface ContestProblemView {
    label: string
    problemSlug: string
    title: string
}

/** `attempts` counts the accepted try too: one wrong answer, then accepted, is 2. */
export interface ProblemProgress {
    solved: boolean
    attempts: number
}

export interface ContestDetail {
    slug: string
    title: string
    description: string | null
    startsAt: string
    endsAt: string
    status: ContestStatus
    phase: ContestPhase
    /** Empty before the start (and for a draft), except for problem editors. */
    problems: ContestProblemView[]
    /** How many there are, shown or not. */
    problemCount: number
    /** The caller's progress by label, for tried problems only; empty when anonymous or the token lapsed. */
    myProgress: Record<string, ProblemProgress>
    serverTime: string
    enrollment: ContestEnrollment
    enrolledCount: number
    enrolled: boolean
}

/** The answer to a register or withdraw. */
export interface EnrollmentState {
    enrolled: boolean
    enrolledCount: number
}

/** One registered user, as the admin's participants list shows them. */
export interface EnrollmentRow {
    user: ScoreboardUser
    enrolledAt: string
}

export interface ScoreboardCell {
    solved: boolean
    /** Counts the accepted try too; compile and system errors never count. */
    attempts: number
    /** Whole minutes from the start to the first accepted submit; null while unsolved. */
    minutes: number | null
}

export interface ScoreboardUser {
    id: string
    /** Null when identity does not know the user or is down. */
    username: string | null
    name: string | null
}

export interface ScoreboardRow {
    /** Rows with equal solved and penalty share a rank. */
    rank: number
    user: ScoreboardUser
    solved: number
    /** Minutes: the solve times plus 20 per wrong try before each accept. */
    penalty: number
    /** A cell per label the contestant has something counted on. */
    problems: Record<string, ScoreboardCell>
}

export interface Scoreboard {
    /** The contest's labels in contest order. Before the start there are labels and no rows. */
    labels: string[]
    rows: ScoreboardRow[]
}

/** Create or update body. `slug` is ignored on update; send `startsAt`/`endsAt` back as returned. */
export interface ContestPayload {
    slug?: string
    title: string
    description: string
    startsAt: string
    endsAt: string
    status: ContestStatus
    /** Required on create. Left out on update, the list stays as it is. */
    problemSlugs?: string[]
    /** Required on create. Left out on update, the kind stays as it is. */
    enrollment?: ContestEnrollment
}
