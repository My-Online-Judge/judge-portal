// Shared display helpers for permissions, used by the Roles and Permissions admin
// pages so the resource grouping + labels stay consistent (one source of truth).
//
// A permission name is "<resource>:<action>" (e.g. "problem:create"); the prefix
// before the first ":" is the resource it groups under.

export interface PermissionGroup {
    resource: string // the raw prefix, e.g. "problem"
    label: string // a nice Title-Case label, e.g. "Problems"
    names: string[] // permission names in this group, sorted
}

// Human labels for known resource prefixes; unknown prefixes fall back to capitalize().
const RESOURCE_LABELS: Record<string, string> = {
    problem: 'Problems',
    judgeserver: 'Judge servers',
    role: 'Roles',
    permission: 'Permissions',
    user: 'Users',
}

// Capitalize the first letter — the fallback label for an unknown prefix.
function capitalize(value: string): string {
    if (!value) return value
    return value.charAt(0).toUpperCase() + value.slice(1)
}

// The resource prefix of a permission name (the part before the first ":").
// A name with no ":" groups under itself.
export function resourceOf(name: string): string {
    const idx = name.indexOf(':')
    return idx === -1 ? name : name.slice(0, idx)
}

// A nice Title-Case label for a resource prefix.
export function resourceLabel(prefix: string): string {
    return RESOURCE_LABELS[prefix] ?? capitalize(prefix)
}

// Group permission names by their resource prefix. Groups are sorted by label and
// names are sorted within each group, so the output is stable to render.
export function groupByResource(names: string[]): PermissionGroup[] {
    const byResource = new Map<string, string[]>()
    for (const name of names) {
        const resource = resourceOf(name)
        const bucket = byResource.get(resource)
        if (bucket) bucket.push(name)
        else byResource.set(resource, [name])
    }
    return Array.from(byResource.entries())
        .map(([resource, groupNames]) => ({
            resource,
            label: resourceLabel(resource),
            names: [...groupNames].sort((a, b) => a.localeCompare(b)),
        }))
        .sort((a, b) => a.label.localeCompare(b.label))
}
