export const API_ROUTES = {
    AUTH: {
        REFRESH_TOKEN: '/auth/refresh',
        GOOGLE_URL: '/auth/outbound/google',
        GOOGLE_AUTH: '/auth/outbound/authentication',
        ME: '/auth/me',
        LOGOUT: '/auth/logout',
    },
    USERS: {
        ROOT: '/users',
        ME: '/users/me',
        PROFILE: (id: number | string) => `/users/${id}`,
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
}
