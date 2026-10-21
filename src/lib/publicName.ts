import { ROUTE_PATH } from '@/constants/routePath'

interface PublicUser {
    id: string
    username?: string | null
    name?: string | null
}

const isEmail = (s: string) => s.includes('@')

/**
 * The username a public page may show. A Google account's username is its email address, which identity answers as
 * null on public reads; one that still arrives is dropped here, because an email is never shown or put in a URL.
 */
export const publicHandle = (username: string | null | undefined): string | null =>
    username && !isEmail(username) ? username : null

/** What a public page calls a user: the username, else the name, else "Contestant" and the start of the id. */
export function publicName(user: PublicUser): string {
    const name = user.name?.trim()
    return publicHandle(user.username) ?? (name && !isEmail(name) ? name : `Contestant ${user.id.slice(0, 8)}`)
}

/** The user's profile route: by username when there is a real one, else by id. */
export function profilePath(user: Pick<PublicUser, 'id' | 'username'>): string {
    const handle = publicHandle(user.username)
    return handle
        ? ROUTE_PATH.USER_PROFILE.replace(':username', encodeURIComponent(handle))
        : ROUTE_PATH.USER_PROFILE_BY_ID.replace(':id', encodeURIComponent(user.id))
}
