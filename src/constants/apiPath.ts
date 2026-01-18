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
    },
    LANGUAGES: {
        ROOT: '/languages',
    },
    SUBMISSIONS: {
        ROOT: '/submissions',
        BY_USER_PROBLEM: (userId: string | number, problemSlug: string) =>
            `/submissions/user/${userId}/problem/${problemSlug}`,
    },
}
