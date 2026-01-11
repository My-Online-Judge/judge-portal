export const API_ROUTES = {
    AUTH: {
        LOGIN: '/auth/login',
        REGISTER: '/auth/register',
        REFRESH_TOKEN: '/auth/refresh',
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
}
