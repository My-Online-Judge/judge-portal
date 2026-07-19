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
        PROFILE: (id: number | string) => `/users/${id}`,
        STATUS: (id: string) => `/users/${id}/status`,
        ROLES: (id: string) => `/users/${id}/roles`,
        RESET_PASSWORD: (id: string) => `/users/${id}/reset-password`,
    },
    PROBLEMS: {
        ROOT: '/problems',
        DETAIL: (slug: string) => `/problems/${slug}`,
        TEST_CASES: (slug: string) => `/problems/${slug}/test-cases`,
        TEST_CASES_IMPORT: (slug: string) => `/problems/${slug}/test-cases/import`,
        TEST_CASE: (slug: string, id: string) => `/problems/${slug}/test-cases/${id}`,
    },
    LANGUAGES: {
        ROOT: '/languages',
    },
    SUBMISSIONS: {
        ROOT: '/submissions',
        DETAIL: (id: string) => `/submissions/${id}`,
        STREAM: (id: string) => `/submissions/${id}/stream`,
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
}
