export const API_ROUTES = {
    AUTH: {
        LOGIN: '/auth/login',
        REFRESH_TOKEN: '/auth/refresh',
        GOOGLE_URL: '/auth/outbound/google',
        ME: '/auth/me',
        LOGOUT: '/auth/logout',
    },
    USERS: {
        ROOT: '/users',
        ME: '/users/me',
        ME_PASSWORD: '/users/me/password',
        PROFILE: (id: number | string) => `/users/${id}`,
        PUBLIC: (username: string) => `/users/public/${encodeURIComponent(username)}`,
        STATS: (id: string) => `/users/${id}/stats`,
        STATUS: (id: string) => `/users/${id}/status`,
        ROLES: (id: string) => `/users/${id}/roles`,
        RESET_PASSWORD: (id: string) => `/users/${id}/reset-password`,
    },
    PROBLEMS: {
        ROOT: '/problems',
        TAGS: '/problems/tags',
        DETAIL: (slug: string) => `/problems/${slug}`,
        TEST_CASES: (slug: string) => `/problems/${slug}/test-cases`,
        TEST_CASES_IMPORT: (slug: string) => `/problems/${slug}/test-cases/import`,
        TEST_CASE: (slug: string, id: string) => `/problems/${slug}/test-cases/${id}`,
        REJUDGE: (slug: string) => `/problems/${slug}/rejudge`,
        CHECKER: (slug: string) => `/problems/${slug}/checker`,
        IMPORT: '/problems/import',
        EXPORT: (slug: string) => `/problems/${slug}/export`,
    },
    CONTESTS: {
        ROOT: '/contests',
        DETAIL: (slug: string) => `/contests/${encodeURIComponent(slug)}`,
        PROBLEM: (slug: string, label: string) => `/contests/${encodeURIComponent(slug)}/problems/${encodeURIComponent(label)}`,
        SCOREBOARD: (slug: string) => `/contests/${encodeURIComponent(slug)}/scoreboard`,
    },
    LANGUAGES: {
        ROOT: '/languages',
    },
    SUBMISSIONS: {
        ROOT: '/submissions',
        DETAIL: (id: string) => `/submissions/${id}`,
        STREAM: (id: string) => `/submissions/${id}/stream`,
        REJUDGE: (id: string) => `/submissions/${id}/rejudge`,
        BY_USER_PROBLEM: (userId: string | number, problemSlug: string) =>
            `/submissions/user/${userId}/problem/${problemSlug}`,
    },
    JUDGE_SERVERS: {
        ROOT: '/judge-servers',
    },
    ROLES: {
        ROOT: '/roles',
        DETAIL: (id: string) => `/roles/${id}`,
        PERMISSIONS: (id: string) => `/roles/${id}/permissions`,
    },
    PERMISSIONS: {
        ROOT: '/permissions',
    },
    SECURITY: {
        ATTEMPTS: '/security/attempts',
        BANS: '/security/bans',
        BAN: (id: string) => `/security/bans/${id}`,
    },
}
