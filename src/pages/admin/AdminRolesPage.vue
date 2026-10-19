<template>
    <div class="flex flex-col gap-[22px]">
        <AdminPageHeader title="Roles" description="Roles and the permissions attached to them.">
            <template #actions>
                <Button v-if="canCreate" @click="openCreate">
                    <Plus class="size-4" />
                    New role
                </Button>
                <Button variant="outline" :disabled="isLoading" @click="reload">
                    <RefreshCw class="size-4" :class="isLoading && 'animate-spin'" />
                    Refresh
                </Button>
            </template>
        </AdminPageHeader>

    <Card>
        <CardContent class="pt-6">
            <!-- Loading -->
            <div v-if="isLoading" class="space-y-2.5">
                <div v-for="n in 4" :key="n" class="h-16 w-full rounded bg-muted animate-ojpulse" />
            </div>

            <!-- Error -->
            <div v-else-if="error">
                <div class="flex flex-col items-center gap-3 rounded-lg border border-dashed border-destructive/40 bg-destructive/5 px-6 py-10 text-center">
                    <TriangleAlert class="size-6 text-destructive" />
                    <p class="text-sm font-medium text-foreground">Couldn't load roles.</p>
                    <p class="max-w-xs text-xs text-muted-foreground">The request failed. Check your connection and try again.</p>
                    <Button variant="outline" size="sm" @click="reload">
                        <RefreshCw class="size-4" />
                        Retry
                    </Button>
                </div>
            </div>

            <!-- Empty -->
            <div v-else-if="roles.length === 0">
                <div class="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border px-6 py-10 text-center">
                    <ShieldCheck class="size-6 text-muted-foreground" />
                    <p class="text-sm font-medium text-foreground">No roles found.</p>
                    <p class="max-w-sm text-xs text-muted-foreground">Roles are seeded by the server — they will appear here once available.</p>
                </div>
            </div>

            <!-- Data -->
            <div v-else class="overflow-hidden rounded-lg border border-border">
                <Table class="min-w-[720px]">
                    <TableHeader>
                        <TableRow class="hover:bg-transparent">
                            <TableHead class="px-4 py-2.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Role</TableHead>
                            <TableHead class="px-4 py-2.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Permissions</TableHead>
                            <TableHead class="px-4 py-2.5 text-right text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        <TableRow
                            v-for="role in roles"
                            :key="role.id"
                            class="border-b border-border last:border-b-0 hover:bg-muted/40"
                        >
                            <!-- Role name + description -->
                            <TableCell class="px-4 py-3 align-top">
                                <div class="flex min-w-0 flex-col">
                                    <span class="font-mono text-[13px] font-medium text-foreground">{{ role.name }}</span>
                                    <span v-if="role.description" class="mt-0.5 max-w-xs text-[12px] text-muted-foreground">{{ role.description }}</span>
                                </div>
                            </TableCell>

                            <!-- Permission badges -->
                            <TableCell class="px-4 py-3 align-top">
                                <div v-if="role.permissions.length" class="flex flex-col gap-1.5">
                                    <span class="text-[11px] text-muted-foreground">
                                        <span class="font-mono text-foreground">{{ role.permissions.length }}</span>
                                        permission{{ role.permissions.length === 1 ? '' : 's' }}
                                    </span>
                                    <div class="flex flex-wrap gap-1">
                                        <Badge
                                            v-for="name in visibleChips(role)"
                                            :key="name"
                                            variant="secondary"
                                            class="font-mono text-[11px] font-normal"
                                        >
                                            {{ name }}
                                        </Badge>
                                        <Badge v-if="extraChips(role) > 0" variant="outline" class="text-[11px] font-normal">
                                            +{{ extraChips(role) }} more
                                        </Badge>
                                    </div>
                                </div>
                                <span v-else class="text-[12px] text-muted-foreground">No permissions</span>
                            </TableCell>

                            <!-- Actions -->
                            <TableCell class="px-4 py-3 text-right align-top">
                                <span
                                    v-if="isLocked(role)"
                                    class="inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-[12px] text-muted-foreground"
                                    title="This role always holds every permission and cannot be changed."
                                >
                                    <Lock class="size-3.5" />
                                    Locked
                                </span>
                                <RowActionsMenu v-else-if="rowActions(role).length" :items="rowActions(role)" :label="role.name" />
                            </TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </div>
        </CardContent>
    </Card>

    <!-- Edit permissions dialog -->
    <Dialog v-model:open="dialogOpen">
        <DialogContent class="sm:max-w-2xl">
            <DialogHeader>
                <DialogTitle>Edit permissions</DialogTitle>
                <DialogDescription>
                    Choose the permissions for the
                    <span class="font-mono text-foreground">{{ editingRole?.name }}</span>
                    role. Saving replaces its whole permission set.
                </DialogDescription>
            </DialogHeader>

            <!-- Catalog -->
            <div class="-mx-1 max-h-[55vh] space-y-4 overflow-y-auto px-1">
                <p v-if="catalogGroups.length === 0" class="rounded-lg border border-dashed border-border px-4 py-8 text-center text-xs text-muted-foreground">
                    No permissions in the catalog.
                </p>
                <section v-for="group in catalogGroups" :key="group.resource" class="overflow-hidden rounded-lg border border-border">
                    <label class="flex cursor-pointer items-center gap-2.5 border-b border-border bg-muted/30 px-3 py-2">
                        <Checkbox
                            :model-value="groupState(group.names)"
                            @update:model-value="(v) => toggleGroup(group.names, v)"
                        />
                        <span class="text-sm font-medium text-foreground">{{ group.label }}</span>
                        <span class="ml-auto font-mono text-[11px] text-muted-foreground">
                            {{ selectedInGroup(group.names) }}/{{ group.names.length }}
                        </span>
                    </label>
                    <div>
                        <label
                            v-for="name in group.names"
                            :key="name"
                            class="flex cursor-pointer items-start gap-2.5 border-b border-border px-3 py-2 last:border-b-0 hover:bg-muted/40"
                        >
                            <Checkbox
                                class="mt-0.5"
                                :model-value="isChecked(name)"
                                @update:model-value="(v) => toggle(name, v)"
                            />
                            <span class="flex min-w-0 flex-col">
                                <code class="font-mono text-[12px] text-foreground">{{ name }}</code>
                                <span v-if="descOf(name)" class="text-[12px] text-muted-foreground">{{ descOf(name) }}</span>
                            </span>
                        </label>
                    </div>
                </section>
            </div>

            <DialogFooter class="items-center gap-2 sm:justify-between">
                <span class="text-xs text-muted-foreground">
                    <span class="font-mono text-foreground">{{ selectedCount }}</span> selected
                </span>
                <div class="flex items-center gap-2">
                    <Button variant="outline" :disabled="saving" @click="dialogOpen = false">Cancel</Button>
                    <Button :disabled="saving" @click="save">
                        <Loader2 v-if="saving" class="size-4 animate-spin" />
                        Save
                    </Button>
                </div>
            </DialogFooter>
        </DialogContent>
    </Dialog>

    <!-- Create role dialog -->
    <Dialog v-model:open="createOpen">
        <DialogContent class="sm:max-w-md">
            <DialogHeader>
                <DialogTitle>New role</DialogTitle>
                <DialogDescription>
                    Add a new role. It starts with no permissions — grant them afterwards with "Permissions".
                </DialogDescription>
            </DialogHeader>

            <div class="space-y-4 py-1">
                <div class="space-y-1.5">
                    <Label for="role-name">Name</Label>
                    <Input
                        id="role-name"
                        v-model="createName"
                        placeholder="CONTEST_MANAGER"
                        autocomplete="off"
                        class="font-mono"
                        @keydown.enter.prevent="createValid && submitCreate()"
                    />
                    <p class="text-[11px] text-muted-foreground">
                        Uppercase letters, digits, and underscores. Must start with a letter.
                    </p>
                    <p v-if="createName.trim() && !createValid" class="text-xs text-destructive">
                        Not a valid role name.
                    </p>
                </div>
                <div class="space-y-1.5">
                    <Label for="role-desc">Description <span class="text-muted-foreground">(optional)</span></Label>
                    <Textarea id="role-desc" v-model="createDesc" rows="2" placeholder="What is this role for?" />
                </div>
            </div>

            <DialogFooter class="gap-2">
                <Button variant="outline" :disabled="creating" @click="createOpen = false">Cancel</Button>
                <Button :disabled="creating || !createValid" @click="submitCreate">
                    <Loader2 v-if="creating" class="size-4 animate-spin" />
                    Create
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>

    <!-- Delete role confirmation -->
    <ConfirmDialog
        :open="deleteOpen"
        :title="`Delete role “${deletingRole?.name ?? ''}”?`"
        description="This cannot be undone. A role still assigned to users cannot be deleted (the API answers 409 ROLE_IN_USE, shown as a toast)."
        confirm-label="Delete"
        :busy="deleting"
        @update:open="(v) => (deleteOpen = v)"
        @confirm="confirmDelete"
    />
    </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { RefreshCw, TriangleAlert, ShieldCheck, Lock, KeyRound, Loader2, Plus, Trash2 } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import AdminPageHeader from '@/components/admin/AdminPageHeader.vue'
import RowActionsMenu from '@/components/common/RowActionsMenu.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import type { RowAction } from '@/components/common/rowActions'
import { useFetch } from '@/composables/useFetch'
import { useToast } from '@/composables/useToast'
import { useAuthStore } from '@/stores/auth'
import roleService from '@/services/roleService'
import permissionService from '@/services/permissionService'
import { groupByResource } from '@/lib/permissionDisplay'
import { isValidRoleName } from '@/lib/roleName'
import { getErrorMessage } from '@/lib/errorMessage'
import type { Role } from '@/types/role'
import type { Permission } from '@/types/permission'

const authStore = useAuthStore()
const { triggerToast } = useToast()

const MAX_CHIPS = 6

// Two independent GETs: the roles table and the permission catalog (needed by the
// edit dialog). Both fetch on mount (useFetch is immediate by default).
const { data: rolesData, isLoading: rolesLoading, error: rolesError, execute: loadRoles } = useFetch(roleService.getRoles)
const { data: permsData, isLoading: permsLoading, error: permsError, execute: loadPerms } = useFetch(permissionService.getPermissions)

const roles = computed<Role[]>(() => rolesData.value?.data ?? [])
const permissions = computed<Permission[]>(() => permsData.value?.data ?? [])

const isLoading = computed(() => rolesLoading.value || permsLoading.value)
// Both feeds are needed for the page to be useful, so surface either failure.
const error = computed(() => rolesError.value || permsError.value)

const reload = () => {
    loadRoles()
    loadPerms()
}

const canUpdate = computed(() => authStore.hasPermission('role:update'))
const canCreate = computed(() => authStore.hasPermission('role:create'))
const canDelete = computed(() => authStore.hasPermission('role:delete'))
// SYS_ROOT and ADMIN always hold every permission, so they show a Locked badge instead of a menu.
const isLocked = (role: Role) => role.name === 'SYS_ROOT' || role.name === 'ADMIN'
// USER is protected from deletion by the API (ROLE_PROTECTED) but its permissions can be edited.
const isProtectedFromDelete = (role: Role) => role.name === 'USER'

const rowActions = (role: Role): RowAction[] => {
    const items: RowAction[] = []
    if (canUpdate.value) items.push({ label: 'Permissions', icon: KeyRound, onSelect: () => openEdit(role) })
    if (canDelete.value && !isProtectedFromDelete(role)) {
        items.push({ label: 'Delete…', icon: Trash2, destructive: true, onSelect: () => openDelete(role) })
    }
    return items
}

const permByName = computed(() => new Map(permissions.value.map((p) => [p.name, p])))
const descOf = (name: string) => permByName.value.get(name)?.description

// Sorted permission chips for a role, capped so rows stay compact.
const sortedPerms = (role: Role) => [...role.permissions].sort((a, b) => a.localeCompare(b))
const visibleChips = (role: Role) => sortedPerms(role).slice(0, MAX_CHIPS)
const extraChips = (role: Role) => Math.max(0, role.permissions.length - MAX_CHIPS)

// --- Edit dialog state ---
const dialogOpen = ref(false)
const editingRole = ref<Role | null>(null)
const selected = ref<Set<string>>(new Set())
const saving = ref(false)

const catalogGroups = computed(() => groupByResource(permissions.value.map((p) => p.name)))

const openEdit = (role: Role) => {
    editingRole.value = role
    selected.value = new Set(role.permissions)
    dialogOpen.value = true
}

const isChecked = (name: string) => selected.value.has(name)
const selectedCount = computed(() => selected.value.size)
const selectedInGroup = (names: string[]) => names.filter((n) => selected.value.has(n)).length

// Reassign the Set so computeds/isChecked re-run (Set mutation isn't reactive).
const toggle = (name: string, value: boolean | 'indeterminate') => {
    const next = new Set(selected.value)
    if (value === true) next.add(name)
    else next.delete(name)
    selected.value = next
}

const groupState = (names: string[]): boolean | 'indeterminate' => {
    const count = selectedInGroup(names)
    if (count === 0) return false
    if (count === names.length) return true
    return 'indeterminate'
}

const toggleGroup = (names: string[], value: boolean | 'indeterminate') => {
    const next = new Set(selected.value)
    if (value === true) names.forEach((n) => next.add(n))
    else names.forEach((n) => next.delete(n))
    selected.value = next
}

const save = async () => {
    if (!editingRole.value) return
    saving.value = true
    try {
        await roleService.updatePermissions(editingRole.value.id, Array.from(selected.value))
        triggerToast('Permissions updated', 'success')
        dialogOpen.value = false
        await loadRoles()
    } catch (err) {
        triggerToast(getErrorMessage(err, 'Could not update permissions.'), 'error')
    } finally {
        saving.value = false
    }
}

// --- Create dialog state ---
const createOpen = ref(false)
const createName = ref('')
const createDesc = ref('')
const creating = ref(false)
const createValid = computed(() => isValidRoleName(createName.value))

const openCreate = () => {
    createName.value = ''
    createDesc.value = ''
    createOpen.value = true
}

const submitCreate = async () => {
    if (!createValid.value) return
    creating.value = true
    try {
        const description = createDesc.value.trim()
        await roleService.create({ name: createName.value.trim(), description: description || undefined })
        triggerToast('Role created', 'success')
        createOpen.value = false
        await loadRoles()
    } catch (err) {
        triggerToast(getErrorMessage(err, 'Could not create role.'), 'error')
    } finally {
        creating.value = false
    }
}

// --- Delete confirmation state ---
const deleteOpen = ref(false)
const deletingRole = ref<Role | null>(null)
const deleting = ref(false)

const openDelete = (role: Role) => {
    deletingRole.value = role
    deleteOpen.value = true
}

const confirmDelete = async () => {
    if (!deletingRole.value || deleting.value) return
    deleting.value = true
    try {
        await roleService.remove(deletingRole.value.id)
        triggerToast('Role deleted', 'success')
        deleteOpen.value = false
        await loadRoles()
    } catch (err) {
        triggerToast(getErrorMessage(err, 'Could not delete role.'), 'error')
    } finally {
        deleting.value = false
    }
}
</script>
