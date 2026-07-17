// A permission from the fixed, seeded catalog as reported by
// GET /api/v1/permissions (PermissionResponse). `name` is "<resource>:<action>".
export interface Permission {
    id: string
    name: string
    description?: string
}
