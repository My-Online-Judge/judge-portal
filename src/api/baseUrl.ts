// Same-origin by default: the HTTPS edge serves the portal and proxies /api/* to the gateway.
// `||` (not `??`) so an empty build arg also falls back.
export const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL || '/api/v1'
