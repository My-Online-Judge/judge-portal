// A role as reported by GET /api/v1/roles (RoleResponse).
// `permissions` are permission NAMES (e.g. "problem:create"), not ids.
export interface Role {
    id: string
    name: string
    description?: string
    permissions: string[]
}
