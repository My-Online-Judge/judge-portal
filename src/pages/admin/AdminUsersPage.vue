<template>
    <div class="flex flex-col gap-[18px]">
        <PageHeader title="Users" description="Accounts, roles and access. Disabled users can't sign in.">
            <template v-if="canCreate" #actions>
                <Button @click="openCreate">
                    <UserPlus class="size-4" />
                    New user
                </Button>
            </template>
        </PageHeader>

        <!-- List card -->
        <div class="min-w-0 overflow-hidden rounded-xl border border-border bg-card">
            <!-- Filters -->
            <div class="flex flex-wrap items-end gap-2 border-b border-border px-3 py-2.5">
                <div class="relative w-full sm:w-[280px]">
                    <Search class="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                    <Input v-model="search" type="search" placeholder="Name, username or email" class="pl-8" aria-label="Search users" />
                </div>
                <div class="w-[140px]">
                    <Select v-model="statusFilter">
                        <SelectTrigger aria-label="Status"><SelectValue placeholder="Status" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Any status</SelectItem>
                            <SelectItem value="1">Active</SelectItem>
                            <SelectItem value="0">Disabled</SelectItem>
                            <SelectItem value="2">Deleted</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div class="w-[160px]">
                    <Select v-model="roleFilter">
                        <SelectTrigger aria-label="Role"><SelectValue placeholder="Role" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Any role</SelectItem>
                            <SelectItem v-for="role in roles" :key="role.id" :value="role.id">{{ role.name }}</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div class="flex items-end gap-2">
                    <div class="flex flex-col gap-1">
                        <label for="users-from" class="text-xs text-muted-foreground">Created from</label>
                        <Input id="users-from" v-model="createdFrom" type="date" class="w-[150px]" />
                    </div>
                    <div class="flex flex-col gap-1">
                        <label for="users-to" class="text-xs text-muted-foreground">Created to</label>
                        <Input id="users-to" v-model="createdTo" type="date" class="w-[150px]" />
                    </div>
                    <Button v-if="hasFilters" variant="ghost" size="sm" class="h-9" @click="clearFilters">
                        <X class="size-4" />
                        Clear filters
                    </Button>
                </div>
                <span v-if="pagination" class="ml-auto self-center text-xs text-muted-foreground tabular-nums">
                    {{ pagination.totalElements.toLocaleString('en-US') }} {{ pagination.totalElements === 1 ? 'user' : 'users' }}
                </span>
                <p v-if="!rangeValid" class="w-full text-xs text-destructive-ink" role="alert">The start date must be before the end date.</p>
            </div>

            <ListStateShell
                :loading="isLoading"
                :error="error ? 'The request failed. Check your connection and try again.' : null"
                :has-data="data !== null"
                :empty="users.length === 0"
                :filtered="hasFilters"
                empty-title="No users yet"
                empty-hint="Create an account with New user."
                @retry="load"
                @clear-filters="clearFilters"
            >
                <div class="overflow-x-auto">
                    <table class="dt min-w-[860px]">
                        <thead>
                            <tr>
                                <th class="pl-4">User</th>
                                <th>Email</th>
                                <th>Roles</th>
                                <th>Status</th>
                                <th class="num">Created</th>
                                <th><span class="sr-only">Actions</span></th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="u in users" :key="u.id">
                                <td class="pl-4">
                                    <span class="flex min-w-0 items-center gap-2.5">
                                        <Avatar size="sm">
                                            <AvatarImage v-if="u.avatar" :src="u.avatar" :alt="u.username" />
                                            <AvatarFallback class="bg-primary-soft text-[10.5px] font-semibold text-info-ink">{{ initialsOf(u) }}</AvatarFallback>
                                        </Avatar>
                                        <span class="flex min-w-0 flex-col leading-[1.3]">
                                            <b class="truncate text-[13px] font-semibold">
                                                {{ u.name || u.username }}
                                                <span v-if="isSelf(u)" class="ml-1 text-xs font-normal text-muted-foreground">(you)</span>
                                            </b>
                                            <span class="slug truncate">{{ u.username }}</span>
                                        </span>
                                    </span>
                                </td>
                                <td class="text-[13px] text-muted-foreground">{{ u.email }}</td>
                                <td>
                                    <div v-if="u.roles?.length" class="flex flex-wrap gap-1">
                                        <Badge v-for="r in u.roles" :key="r.id" variant="mono">{{ r.name }}</Badge>
                                    </div>
                                    <span v-else class="text-xs text-muted-foreground">No roles</span>
                                </td>
                                <td>
                                    <span class="flex flex-wrap items-center gap-1">
                                        <Badge v-if="u.status === USER_STATUS.ACTIVE" variant="success">Active</Badge>
                                        <Badge v-else-if="u.status === USER_STATUS.DISABLED" variant="neutral">
                                            <UserX aria-hidden="true" />
                                            Disabled
                                        </Badge>
                                        <Badge v-else variant="danger">
                                            <Trash2 aria-hidden="true" />
                                            Deleted
                                        </Badge>
                                        <Badge v-if="isSysRoot(u)" variant="outline">
                                            <Lock aria-hidden="true" />
                                            Protected
                                        </Badge>
                                    </span>
                                </td>
                                <td class="num font-sans text-[13px] text-muted-foreground">{{ formatDate(u.createdAt) }}</td>
                                <td class="act">
                                    <RowActionsMenu v-if="rowActions(u).length" :items="rowActions(u)" :label="u.name || u.username" />
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </ListStateShell>
            <div class="px-4">
                <PaginationFooter :pagination="pagination ?? undefined" @change-page="onPageChange" @update:size="onSizeChange" />
            </div>
        </div>

        <!-- Create user dialog -->
        <Dialog v-model:open="createOpen">
            <DialogContent class="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Create user</DialogTitle>
                    <DialogDescription>Add a local account. The user signs in with this username and password.</DialogDescription>
                </DialogHeader>
                <div class="space-y-4 py-1">
                    <div class="grid grid-cols-2 gap-3">
                        <div class="space-y-1.5">
                            <Label for="cu-username">Username</Label>
                            <Input id="cu-username" v-model="createForm.username" autocomplete="off" class="font-mono" placeholder="jdoe" />
                            <p v-if="createForm.username && !isValidUsername(createForm.username)" class="text-xs text-destructive-ink">3 to 32 characters: letters, digits and underscores.</p>
                        </div>
                        <div class="space-y-1.5">
                            <Label for="cu-name">Display name</Label>
                            <Input id="cu-name" v-model="createForm.name" placeholder="Jane Doe" />
                        </div>
                    </div>
                    <div class="space-y-1.5">
                        <Label for="cu-email">Email</Label>
                        <Input id="cu-email" v-model="createForm.email" type="email" placeholder="jane@example.com" />
                        <p v-if="createForm.email && !isValidEmail(createForm.email)" class="text-xs text-destructive-ink">Enter a valid email.</p>
                    </div>
                    <div class="space-y-1.5">
                        <Label for="cu-password">Password</Label>
                        <Input id="cu-password" v-model="createForm.password" type="password" autocomplete="new-password" />
                        <p v-if="createForm.password && !isValidPassword(createForm.password)" class="text-xs text-destructive-ink">At least 8 characters with letters and digits.</p>
                    </div>
                    <div class="grid grid-cols-2 gap-3">
                        <div class="space-y-1.5">
                            <Label>Status</Label>
                            <Select v-model="createForm.status">
                                <SelectTrigger class="h-9"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="1">Active</SelectItem>
                                    <SelectItem value="0">Disabled</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div class="space-y-1.5">
                        <Label>Roles <span class="text-muted-foreground">(optional)</span></Label>
                        <div class="max-h-[30vh] space-y-1 overflow-y-auto rounded-lg border border-border p-2">
                            <label v-for="role in assignableRoles" :key="role.id" class="flex cursor-pointer items-center gap-2.5 rounded px-2 py-1.5 hover:bg-muted/40">
                                <Checkbox :model-value="createRoleIds.has(role.id)" @update:model-value="(v) => toggleCreateRole(role.id, v)" />
                                <span class="font-mono text-[12px] text-foreground">{{ role.name }}</span>
                            </label>
                            <p v-if="assignableRoles.length === 0" class="px-2 py-1 text-[12px] text-muted-foreground">No roles available.</p>
                        </div>
                    </div>
                </div>
                <DialogFooter class="gap-2">
                    <Button variant="secondary" :disabled="creating" @click="createOpen = false">Cancel</Button>
                    <Button :disabled="creating || !createValid" @click="submitCreate">
                        <Loader2 v-if="creating" class="size-4 animate-spin" />
                        Create user
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        <!-- Edit user dialog -->
        <Dialog v-model:open="editOpen">
            <DialogContent class="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Edit user</DialogTitle>
                    <DialogDescription>
                        <span class="font-mono text-foreground">{{ editingUser?.username }}</span>. The username can't be changed.
                    </DialogDescription>
                </DialogHeader>
                <div class="space-y-4 py-1">
                    <div class="space-y-1.5">
                        <Label for="eu-name">Display name</Label>
                        <Input id="eu-name" v-model="editForm.name" />
                    </div>
                    <div class="space-y-1.5">
                        <Label for="eu-email">Email</Label>
                        <Input id="eu-email" v-model="editForm.email" type="email" />
                        <p v-if="editForm.email && !isValidEmail(editForm.email)" class="text-xs text-destructive-ink">Enter a valid email.</p>
                    </div>
                    <div v-if="!editingSelf" class="space-y-1.5">
                        <Label>Status</Label>
                        <Select v-model="editForm.status">
                            <SelectTrigger class="h-9"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="1">Active</SelectItem>
                                <SelectItem value="0">Disabled</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <DialogFooter class="gap-2">
                    <Button variant="secondary" :disabled="saving" @click="editOpen = false">Cancel</Button>
                    <Button :disabled="saving || !editValid" @click="submitEdit">
                        <Loader2 v-if="saving" class="size-4 animate-spin" />
                        Save user
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        <!-- Manage roles dialog -->
        <Dialog v-model:open="rolesOpen">
            <DialogContent class="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Assign roles</DialogTitle>
                    <DialogDescription>
                        Choose roles for <span class="font-mono text-foreground">{{ rolesUser?.username }}</span>. Saving replaces the whole set.
                    </DialogDescription>
                </DialogHeader>
                <div class="max-h-[45vh] space-y-1 overflow-y-auto rounded-lg border border-border p-2">
                    <label v-for="role in assignableRoles" :key="role.id" class="flex cursor-pointer items-start gap-2.5 rounded px-2 py-2 hover:bg-muted/40">
                        <Checkbox class="mt-0.5" :model-value="rolesSelected.has(role.id)" @update:model-value="(v) => toggleRole(role.id, v)" />
                        <span class="flex min-w-0 flex-col">
                            <span class="font-mono text-[12px] text-foreground">{{ role.name }}</span>
                            <span v-if="role.description" class="text-[12px] text-muted-foreground">{{ role.description }}</span>
                        </span>
                    </label>
                    <p v-if="assignableRoles.length === 0" class="px-2 py-1 text-[12px] text-muted-foreground">No roles available.</p>
                </div>
                <DialogFooter class="items-center gap-2 sm:justify-between">
                    <span class="text-xs text-muted-foreground"><span class="font-mono text-foreground">{{ rolesSelected.size }}</span> selected</span>
                    <div class="flex items-center gap-2">
                        <Button variant="secondary" :disabled="savingRoles" @click="rolesOpen = false">Cancel</Button>
                        <Button :disabled="savingRoles" @click="submitRoles">
                            <Loader2 v-if="savingRoles" class="size-4 animate-spin" />
                            Save roles
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        <!-- Reset password dialog -->
        <Dialog v-model:open="pwdOpen">
            <DialogContent class="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Reset password</DialogTitle>
                    <DialogDescription>
                        Set a new password for <span class="font-mono text-foreground">{{ pwdUser?.username }}</span>.
                    </DialogDescription>
                </DialogHeader>
                <div class="space-y-1.5 py-1">
                    <Label for="rp-pwd">New password</Label>
                    <Input id="rp-pwd" v-model="pwdValue" type="password" autocomplete="new-password" @keydown.enter.prevent="pwdValid && submitReset()" />
                    <p v-if="pwdValue && !pwdValid" class="text-xs text-destructive-ink">At least 8 characters with letters and digits.</p>
                </div>
                <DialogFooter class="gap-2">
                    <Button variant="secondary" :disabled="savingPwd" @click="pwdOpen = false">Cancel</Button>
                    <Button :disabled="savingPwd || !pwdValid" @click="submitReset">
                        <Loader2 v-if="savingPwd" class="size-4 animate-spin" />
                        Set new password
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>


        <ConfirmDialog
            :open="deleteOpen"
            :title="`Delete user “${deleteTarget?.username ?? ''}”?`"
            description="They can no longer sign in. Their submissions stay."
            confirm-label="Delete user"
            :busy="deleting"
            @update:open="(v) => (deleteOpen = v)"
            @confirm="confirmDelete"
        />

        <ConfirmDialog
            :open="disableOpen"
            :title="`Disable user “${disableTarget?.username ?? ''}”?`"
            description="They're signed out everywhere and can't sign in until you enable them again."
            confirm-label="Disable user"
            :busy="disabling"
            @update:open="(v) => (disableOpen = v)"
            @confirm="confirmDisable"
        />
    </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { watchDebounced } from '@vueuse/core'
import {
    Search, X, Lock, UserPlus, UserX,
    Pencil, Shield, KeyRound, CheckCircle2, Trash2, Loader2,
} from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import PageHeader from '@/components/common/PageHeader.vue'
import ListStateShell from '@/components/common/ListStateShell.vue'
import PaginationFooter from '@/components/common/PaginationFooter.vue'
import RowActionsMenu from '@/components/common/RowActionsMenu.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import type { RowAction } from '@/components/common/rowActions'
import { isValidRange } from '@/lib/dateRange'
import { useFetch } from '@/composables/useFetch'
import { useToast } from '@/composables/useToast'
import { getErrorMessage } from '@/lib/errorMessage'
import { isValidUsername, isValidPassword, isValidEmail } from '@/lib/userValidators'
import userService from '@/services/userService'
import roleService from '@/services/roleService'
import { useAuthStore } from '@/stores/auth'
import { USER_STATUS, type UserResponse } from '@/types/user'
import type { Role } from '@/types/role'

const authStore = useAuthStore()
const { triggerToast, undo, error: errorToast } = useToast()

const canCreate = computed(() => authStore.hasPermission('user:create'))
const canUpdate = computed(() => authStore.hasPermission('user:update'))
const canDelete = computed(() => authStore.hasPermission('user:delete'))
const selfId = computed(() => authStore.user?.id ?? null)

// --- List + filters ---
const { data, isLoading, error, execute } = useFetch(userService.list, { immediate: false })
// Optimistic status per user id (a disable waiting out its undo window), laid over the fetched rows.
const statusOverride = ref(new Map<string, number>())
const users = computed<UserResponse[]>(() =>
    (data.value?.data ?? []).map((u) =>
        statusOverride.value.has(u.id) ? { ...u, status: statusOverride.value.get(u.id)! } : u,
    ),
)
const pagination = computed(() => data.value?.pagination ?? null)

const page = ref(0)
const size = ref(10)
const search = ref('')
const statusFilter = ref('all')
const roleFilter = ref('all')
const createdFrom = ref('')
const createdTo = ref('')

const hasFilters = computed(() =>
    !!search.value || statusFilter.value !== 'all' || roleFilter.value !== 'all' || !!createdFrom.value || !!createdTo.value,
)

const rangeValid = computed(() => isValidRange(createdFrom.value, createdTo.value))

const load = () => {
    if (!rangeValid.value) return
    return execute({
        page: page.value,
        size: size.value,
        search: search.value.trim() || undefined,
        status: statusFilter.value === 'all' ? undefined : Number(statusFilter.value),
        roleId: roleFilter.value === 'all' ? undefined : roleFilter.value,
        createdFrom: createdFrom.value || undefined,
        createdTo: createdTo.value || undefined,
    })
}

const reloadFirstPage = () => {
    page.value = 0
    load()
}

const clearFilters = () => {
    search.value = ''
    statusFilter.value = 'all'
    roleFilter.value = 'all'
    createdFrom.value = ''
    createdTo.value = ''
}

watchDebounced(search, reloadFirstPage, { debounce: 350 })
watch([statusFilter, roleFilter, createdFrom, createdTo], reloadFirstPage)

const onPageChange = (p: number) => {
    page.value = p
    load()
}
const onSizeChange = (n: number) => {
    size.value = n
    page.value = 0
    load()
}

// --- Roles (filter dropdown + assignment). SYS_ROOT is never assignable. ---
const { data: rolesData } = useFetch(roleService.getRoles, { immediate: true })
const roles = computed<Role[]>(() => rolesData.value?.data ?? [])
const assignableRoles = computed(() => roles.value.filter((r) => r.name !== 'SYS_ROOT'))

// --- Row helpers ---
const isSysRoot = (u: UserResponse) => u.roles?.some((r) => r.name === 'SYS_ROOT') ?? false
const isSelf = (u: UserResponse) => !!selfId.value && u.id === selfId.value

const formatDate = (d: string) => (d ? new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '-')
const initialsOf = (u: UserResponse) => {
    const parts = (u.name || u.username || '?').trim().split(/\s+/).filter(Boolean)
    const first = parts[0] ?? '?'
    const last = parts.length > 1 ? parts[parts.length - 1]! : ''
    return (last ? `${first.charAt(0)}${last.charAt(0)}` : first.slice(0, 2)).toUpperCase()
}

// --- Create dialog ---
const createOpen = ref(false)
const creating = ref(false)
const createForm = reactive({ username: '', name: '', email: '', password: '', status: String(USER_STATUS.ACTIVE) })
const createRoleIds = ref<Set<string>>(new Set())
const createValid = computed(
    () => isValidUsername(createForm.username) && isValidEmail(createForm.email) && isValidPassword(createForm.password),
)

const openCreate = () => {
    createForm.username = ''
    createForm.name = ''
    createForm.email = ''
    createForm.password = ''
    createForm.status = String(USER_STATUS.ACTIVE)
    createRoleIds.value = new Set()
    createOpen.value = true
}

const toggleCreateRole = (id: string, v: boolean | 'indeterminate') => {
    const next = new Set(createRoleIds.value)
    if (v === true) next.add(id)
    else next.delete(id)
    createRoleIds.value = next
}

const submitCreate = async () => {
    if (!createValid.value) return
    creating.value = true
    try {
        const roleIds = Array.from(createRoleIds.value)
        await userService.create({
            username: createForm.username.trim(),
            name: createForm.name.trim(),
            email: createForm.email.trim(),
            password: createForm.password,
            status: Number(createForm.status),
            roleIds: roleIds.length ? roleIds : undefined,
        })
        triggerToast('User created', 'success')
        createOpen.value = false
        load()
    } catch (err) {
        triggerToast(getErrorMessage(err, 'Could not create user.'), 'error')
    } finally {
        creating.value = false
    }
}

// --- Edit dialog ---
const editOpen = ref(false)
const saving = ref(false)
const editingUser = ref<UserResponse | null>(null)
const editForm = reactive({ name: '', email: '', status: '1' })
const editingSelf = computed(() => (editingUser.value ? isSelf(editingUser.value) : false))
const editValid = computed(() => isValidEmail(editForm.email))

const openEdit = (u: UserResponse) => {
    editingUser.value = u
    editForm.name = u.name ?? ''
    editForm.email = u.email ?? ''
    editForm.status = String(u.status === USER_STATUS.DISABLED ? USER_STATUS.DISABLED : USER_STATUS.ACTIVE)
    editOpen.value = true
}

const sendEdit = async () => {
    if (!editingUser.value || !editValid.value) return false
    saving.value = true
    try {
        const payload: { name: string; email: string; status?: number } = {
            name: editForm.name.trim(),
            email: editForm.email.trim(),
        }
        // The server blocks changing your own status; only send it for other users.
        if (!editingSelf.value) payload.status = Number(editForm.status)
        await userService.update(editingUser.value.id, payload)
        triggerToast('User updated', 'success')
        editOpen.value = false
        load()
        return true
    } catch (err) {
        triggerToast(getErrorMessage(err, 'Could not update user.'), 'error')
        return false
    } finally {
        saving.value = false
    }
}

const submitEdit = async () => {
    if (!editingUser.value || !editValid.value) return
    // Switching an active user to Disabled signs them out everywhere: confirm first.
    if (!editingSelf.value && editForm.status === String(USER_STATUS.DISABLED) && editingUser.value.status !== USER_STATUS.DISABLED) {
        askDisable(editingUser.value)
        return
    }
    await sendEdit()
}

// --- Manage roles dialog ---
const rolesOpen = ref(false)
const savingRoles = ref(false)
const rolesUser = ref<UserResponse | null>(null)
const rolesSelected = ref<Set<string>>(new Set())

const openRoles = (u: UserResponse) => {
    rolesUser.value = u
    rolesSelected.value = new Set((u.roles ?? []).map((r) => r.id))
    rolesOpen.value = true
}

const toggleRole = (id: string, v: boolean | 'indeterminate') => {
    const next = new Set(rolesSelected.value)
    if (v === true) next.add(id)
    else next.delete(id)
    rolesSelected.value = next
}

const submitRoles = async () => {
    if (!rolesUser.value) return
    savingRoles.value = true
    try {
        await userService.updateRoles(rolesUser.value.id, Array.from(rolesSelected.value))
        triggerToast('Roles updated', 'success')
        rolesOpen.value = false
        load()
    } catch (err) {
        triggerToast(getErrorMessage(err, 'Could not update roles.'), 'error')
    } finally {
        savingRoles.value = false
    }
}

// --- Reset password dialog ---
const pwdOpen = ref(false)
const savingPwd = ref(false)
const pwdUser = ref<UserResponse | null>(null)
const pwdValue = ref('')
const pwdValid = computed(() => isValidPassword(pwdValue.value))

const openReset = (u: UserResponse) => {
    pwdUser.value = u
    pwdValue.value = ''
    pwdOpen.value = true
}

const submitReset = async () => {
    if (!pwdUser.value || !pwdValid.value) return
    savingPwd.value = true
    try {
        await userService.resetPassword(pwdUser.value.id, pwdValue.value)
        triggerToast('Password reset', 'success')
        pwdOpen.value = false
    } catch (err) {
        triggerToast(getErrorMessage(err, 'Could not reset password.'), 'error')
    } finally {
        savingPwd.value = false
    }
}

// --- Enable (direct) / Disable (undo toast from the menu, confirmed from the edit dialog) ---
const enableUser = async (u: UserResponse) => {
    try {
        await userService.updateStatus(u.id, USER_STATUS.ACTIVE)
        triggerToast('User enabled', 'success')
        load()
    } catch (err) {
        triggerToast(getErrorMessage(err, 'Could not update status.'), 'error')
    }
}

const setOverride = (id: string, status: number) => {
    statusOverride.value = new Map(statusOverride.value).set(id, status)
}
const clearOverride = (id: string) => {
    const next = new Map(statusOverride.value)
    next.delete(id)
    statusOverride.value = next
}

// The row reads Disabled at once; the status change is sent when the undo window closes.
const startDisable = (u: UserResponse) => {
    if (statusOverride.value.has(u.id)) return
    setOverride(u.id, USER_STATUS.DISABLED)
    const name = u.name || u.username
    undo('User disabled', {
        description: `${name} can't sign in until you enable them again.`,
        onUndo: () => clearOverride(u.id),
        // Catches its own errors, so the toast engine never sees a rejection.
        commit: async () => {
            try {
                await userService.updateStatus(u.id, USER_STATUS.DISABLED)
                await load()
            } catch (err) {
                errorToast("Couldn't disable the user", {
                    description: getErrorMessage(err, `${name} can still sign in.`),
                    action: { label: 'Retry', onClick: () => startDisable(u) },
                })
            } finally {
                clearOverride(u.id)
            }
        },
    })
}

const disableOpen = ref(false)
const disabling = ref(false)
const disableTarget = ref<UserResponse | null>(null)

// Only the edit dialog asks: switching its status to Disabled saves the whole form.
const askDisable = (u: UserResponse) => {
    disableTarget.value = u
    disableOpen.value = true
}

const confirmDisable = async () => {
    if (!disableTarget.value || disabling.value) return
    disabling.value = true
    try {
        if (await sendEdit()) disableOpen.value = false
    } finally {
        disabling.value = false
    }
}

// The protected system account gets one disabled item that says why.
const protectedActions: RowAction[] = [
    { label: "Can't be changed", icon: Lock, disabled: true, hint: 'Protected system account', onSelect: () => {} },
]

const rowActions = (u: UserResponse): RowAction[] => {
    if (isSysRoot(u)) return protectedActions
    const items: RowAction[] = []
    if (canUpdate.value) {
        items.push({ label: 'Edit', icon: Pencil, onSelect: () => openEdit(u) })
        if (!isSelf(u)) items.push({ label: 'Assign roles', icon: Shield, onSelect: () => openRoles(u) })
        items.push({ label: 'Reset password', icon: KeyRound, onSelect: () => openReset(u) })
        if (!isSelf(u) && u.status === USER_STATUS.DISABLED)
            items.push({ label: 'Enable', icon: CheckCircle2, onSelect: () => enableUser(u) })
        if (!isSelf(u) && u.status === USER_STATUS.ACTIVE)
            items.push({ label: 'Disable', icon: UserX, onSelect: () => startDisable(u) })
    }
    if (canDelete.value && !isSelf(u) && u.status !== USER_STATUS.DELETED)
        items.push({ label: 'Delete…', icon: Trash2, destructive: true, onSelect: () => openDelete(u) })
    return items
}

// --- Delete confirm ---
const deleteOpen = ref(false)
const deleting = ref(false)
const deleteTarget = ref<UserResponse | null>(null)

const openDelete = (u: UserResponse) => {
    deleteTarget.value = u
    deleteOpen.value = true
}

const confirmDelete = async () => {
    if (!deleteTarget.value || deleting.value) return
    deleting.value = true
    try {
        await userService.remove(deleteTarget.value.id)
        triggerToast('User deleted', 'success')
        if (users.value.length === 1 && page.value > 0) page.value -= 1
        deleteOpen.value = false
        load()
    } catch (err) {
        triggerToast(getErrorMessage(err, 'Could not delete user.'), 'error')
    } finally {
        deleting.value = false
    }
}

onMounted(load)
</script>
