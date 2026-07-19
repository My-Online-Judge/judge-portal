// A stable per-browser id sent as the `X-Device-Id` header so the API can record which
// device a login/token came from (groundwork for rate-limiting). Generated once and kept
// in localStorage; it is an opaque identifier, not a security token.

const KEY = 'deviceId'

export function getDeviceId(): string {
    let id = localStorage.getItem(KEY)
    if (!id) {
        id = globalThis.crypto?.randomUUID?.() ?? `dev-${Date.now()}-${Math.random().toString(16).slice(2)}`
        localStorage.setItem(KEY, id)
    }
    return id
}
