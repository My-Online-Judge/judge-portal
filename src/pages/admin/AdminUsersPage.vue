<template>
    <div class="flex flex-col gap-[22px]">
        <!-- Page header -->
        <div class="flex flex-wrap items-start justify-between gap-4">
            <div class="min-w-0">
                <h1 class="text-[24px] font-semibold leading-tight tracking-tight text-foreground">Users</h1>
                <p class="mt-1 text-sm text-muted-foreground">Manage accounts and the roles assigned to them.</p>
            </div>
            <Button v-if="canCreate" class="h-[38px]" @click="openCreate">
                <Plus class="size-4" />
                Create user
            </Button>
        </div>

        <!-- List card -->
        <div class="min-w-0 rounded-xl border border-border bg-card">
            <!-- Filters -->
            <div class="flex flex-wrap items-end gap-3 border-b border-border p-[18px]">
                <div class="relative w-full sm:w-[240px]">
                    <Search class="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input v-model="search" placeholder="Search username, email, name…" class="h-9 pl-8" aria-label="Search users" />
                </div>
                <div class="w-[140px]">
                    <Select v-model="statusFilter">
                        <SelectTrigger class="h-9"><SelectValue placeholder="Status" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All statuses</SelectItem>
                            <SelectItem value="1">Active</SelectItem>
                            <SelectItem value="0">Disabled</SelectItem>
                            <SelectItem value="2">Deleted</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div class="w-[160px]">
                    <Select v-model="roleFilter">
                        <SelectTrigger class="h-9"><SelectValue placeholder="Role" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All roles</SelectItem>
                            <SelectItem v-for="role in roles" :key="role.id" :value="role.id">{{ role.name }}</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div class="flex items-end gap-2">
                    <div class="flex flex-col gap-1">
                        <label class="text-[11px] text-muted-foreground">Created from</label>
                        <Input v-model="createdFrom" type="date" class="h-9 w-[150px]" aria-label="Created from" />
                    </div>
                    <div class="flex flex-col gap-1">
                        <label class="text-[11px] text-muted-foreground">to</label>
                        <Input v-model="createdTo" type="date" class="h-9 w-[150px]" aria-label="Created to" />
                    </div>
                    <Button v-if="hasFilters" variant="ghost" size="sm" class="h-9" @click="clearFilters">
                        <X class="size-4" />
                        Clear
                    </Button>
                </div>
            </div>

            <!-- Loading -->
            <div v-if="isLoading" class="space-y-2.5 p-[18px]">
                <div v-for="n in 6" :key="n" class="h-11 w-full rounded bg-muted animate-ojpulse" />
            </div>

            <!-- Error -->
            <div v-else-if="error" class="p-[18px]">
                <div class="flex flex-col items-center gap-3 rounded-lg border border-dashed border-err/40 bg-err/5 px-6 py-12 text-center">
                    <TriangleAlert class="size-6 text-err" />
                    <p class="text-sm font-medium text-foreground">Couldn't load users.</p>
                    <p class="max-w-xs text-xs text-muted-foreground">The request failed. Check your connection and try again.</p>
                    <Button variant="outline" size="sm" @click="load">
                        <RefreshCw class="size-4" />
                        Retry
                    </Button>
                </div>
            </div>

            <!-- Empty -->
            <div v-else-if="users.length === 0" class="p-[18px]">
                <div class="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border px-6 py-12 text-center">
                    <UsersIcon class="size-6 text-muted-foreground" />
                    <p class="text-sm font-medium text-foreground">
                        {{ hasFilters ? 'No users match these filters.' : 'No users yet.' }}
                    </p>
                    <Button v-if="hasFilters" variant="outline" size="sm" @click="clearFilters">Clear filters</Button>
                </div>
            </div>

            <!-- Data -->
            <template v-else>
                <div class="overflow-x-auto">
                    <table class="w-full min-w-[820px] border-collapse text-sm">
                        <thead>
                            <tr class="border-b border-border text-left">
                                <th class="px-[18px] py-2.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">User</th>
                                <th class="px-3 py-2.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Email</th>
                                <th class="px-3 py-2.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Roles</th>
                                <th class="px-3 py-2.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Status</th>
                                <th class="px-3 py-2.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Created</th>
                                <th class="px-[18px] py-2.5 text-right"><span class="sr-only">Actions</span></th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="u in users" :key="u.id" class="border-b border-border last:border-b-0 hover:bg-muted/40">
                                <td class="px-[18px] py-3">
                                    <div class="flex min-w-0 flex-col">
                                        <span class="font-medium text-foreground">
                                            {{ u.name || u.username }}
                                            <span v-if="isSelf(u)" class="ml-1 text-[11px] font-normal text-muted-foreground">(you)</span>
                                        </span>
                                        <span class="font-mono text-[11px] text-muted-foreground">{{ u.username }}</span>
                                    </div>
                                </td>
                                <td class="px-3 py-3 text-[13px] text-muted-foreground">{{ u.email }}</td>
                                <td class="px-3 py-3">
                                    <div v-if="u.roles?.length" class="flex flex-wrap gap-1">
                                        <Badge
                                            v-for="r in u.roles"
                                            :key="r.id"
                                            :variant="r.name === 'SYS_ROOT' ? 'default' : 'secondary'"
                                            class="font-mono text-[11px] font-normal"
                                        >
                                            {{ r.name }}
                                        </Badge>
                                    </div>
                                    <span v-else class="text-[12px] text-muted-foreground">No roles</span>
                                </td>
                                <td class="whitespace-nowrap px-3 py-3">
                                    <span class="inline-flex items-center gap-1.5 rounded-full border border-border px-2 py-0.5 text-[12px] text-foreground">
                                        <span class="size-1.5 rounded-full" :class="statusDot(u.status)" />
                                        {{ statusLabel(u.status) }}
                                    </span>
                                </td>
                                <td class="whitespace-nowrap px-3 py-3 font-mono text-[12px] text-muted-foreground">{{ formatDate(u.createdAt) }}</td>
                                <td class="whitespace-nowrap px-[18px] py-3 text-right">
                                    <span
                                        v-if="isSysRoot(u)"
                                        class="inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-[12px] text-muted-foreground"
                                        title="Protected system account — cannot be modified."
                                    >
                                        <Lock class="size-3.5" />
                                        Protected
                                    </span>
                                    <DropdownMenu v-else-if="canUpdate || canDelete">
                                        <DropdownMenuTrigger
                                            class="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                            aria-label="User actions"
                                        >
                                            <MoreHorizontal class="size-4" />
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" class="w-44">
                                            <DropdownMenuItem v-if="canUpdate" @select="openEdit(u)">
                                                <Pencil class="size-4" />
                                                Edit
                                            </DropdownMenuItem>
                                            <DropdownMenuItem v-if="canUpdate && !isSelf(u)" @select="openRoles(u)">
                                                <Shield class="size-4" />
                                                Manage roles
                                            </DropdownMenuItem>
                                            <DropdownMenuItem v-if="canUpdate" @select="openReset(u)">
                                                <KeyRound class="size-4" />
                                                Reset password
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                v-if="canUpdate && !isSelf(u) && u.status !== USER_STATUS.DELETED"
                                                @select="toggleStatus(u)"
                                            >
                                                <component :is="u.status === USER_STATUS.ACTIVE ? Ban : CheckCircle2" class="size-4" />
                                                {{ u.status === USER_STATUS.ACTIVE ? 'Disable' : 'Enable' }}
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                v-if="canDelete && !isSelf(u) && u.status !== USER_STATUS.DELETED"
                                                variant="destructive"
                                                @select="openDelete(u)"
                                            >
                                                <Trash2 class="size-4" />
                                                Delete
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <!-- Footer -->
                <div class="flex items-center justify-between gap-3 border-t border-border p-[18px]">
                    <p class="text-[12px] text-muted-foreground">
                        Showing <span class="font-mono text-foreground">{{ users.length }}</span> of
                        <span class="font-mono text-foreground">{{ totalElements }}</span>
                    </p>
                    <div class="flex items-center gap-2">
                        <Button variant="outline" size="sm" :disabled="!canPrev" @click="goPrev">Previous</Button>
                        <Button variant="outline" size="sm" :disabled="!canNext" @click="goNext">Next</Button>
                    </div>
                </div>
            </template>
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
                            <p v-if="createForm.username && !isValidUsername(createForm.username)" class="text-[11px] text-err">3-32 chars: letters, digits, underscore.</p>
                        </div>
                        <div class="space-y-1.5">
                            <Label for="cu-name">Display name</Label>
                            <Input id="cu-name" v-model="createForm.name" placeholder="Jane Doe" />
                        </div>
                    </div>
                    <div class="space-y-1.5">
                        <Label for="cu-email">Email</Label>
                        <Input id="cu-email" v-model="createForm.email" type="email" placeholder="jane@example.com" />
                        <p v-if="createForm.email && !isValidEmail(createForm.email)" class="text-[11px] text-err">Enter a valid email.</p>
                    </div>
                    <div class="space-y-1.5">
                        <Label for="cu-password">Password</Label>
                        <Input id="cu-password" v-model="createForm.password" type="password" autocomplete="new-password" />
                        <p v-if="createForm.password && !isValidPassword(createForm.password)" class="text-[11px] text-err">At least 8 characters with letters and digits.</p>
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
                    <Button variant="outline" :disabled="creating" @click="createOpen = false">Cancel</Button>
                    <Button :disabled="creating || !createValid" @click="submitCreate">
                        <Loader2 v-if="creating" class="size-4 animate-spin" />
                        Create
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
                        <span class="font-mono text-foreground">{{ editingUser?.username }}</span> — username can't be changed.
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
                        <p v-if="editForm.email && !isValidEmail(editForm.email)" class="text-[11px] text-err">Enter a valid email.</p>
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
                    <Button variant="outline" :disabled="saving" @click="editOpen = false">Cancel</Button>
                    <Button :disabled="saving || !editValid" @click="submitEdit">
                        <Loader2 v-if="saving" class="size-4 animate-spin" />
                        Save
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        <!-- Manage roles dialog -->
        <Dialog v-model:open="rolesOpen">
            <DialogContent class="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Manage roles</DialogTitle>
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
                        <Button variant="outline" :disabled="savingRoles" @click="rolesOpen = false">Cancel</Button>
                        <Button :disabled="savingRoles" @click="submitRoles">
                            <Loader2 v-if="savingRoles" class="size-4 animate-spin" />
                            Save
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
                    <p v-if="pwdValue && !pwdValid" class="text-[11px] text-err">At least 8 characters with letters and digits.</p>
                </div>
                <DialogFooter class="gap-2">
                    <Button variant="outline" :disabled="savingPwd" @click="pwdOpen = false">Cancel</Button>
                    <Button :disabled="savingPwd || !pwdValid" @click="submitReset">
                        <Loader2 v-if="savingPwd" class="size-4 animate-spin" />
                        Reset
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        <!-- Delete confirm -->
        <Dialog v-model:open="deleteOpen">
            <DialogContent class="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Delete user?</DialogTitle>
                    <DialogDescription>
                        This deactivates <span class="font-mono text-foreground">{{ deleteTarget?.username }}</span> and blocks their sign-in. Their submissions are kept.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter class="gap-2">
                    <Button variant="outline" :disabled="deleting" @click="deleteOpen = false">Cancel</Button>
                    <Button variant="destructive" :disabled="deleting" @click="confirmDelete">
                        <Loader2 v-if="deleting" class="size-4 animate-spin" />
                        Delete
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { watchDebounced } from '@vueuse/core'
import {
    Plus, Search, X, TriangleAlert, RefreshCw, Users as UsersIcon, Lock, MoreHorizontal,
    Pencil, Shield, KeyRound, Ban, CheckCircle2, Trash2, Loader2,
} from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu'
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
const { triggerToast } = useToast()

const canCreate = computed(() => authStore.hasPermission('user:create'))
const canUpdate = computed(() => authStore.hasPermission('user:update'))
const canDelete = computed(() => authStore.hasPermission('user:delete'))
const selfId = computed(() => authStore.user?.id ?? null)

// --- List + filters ---
const { data, isLoading, error, execute } = useFetch(userService.list, { immediate: false })
const users = computed<UserResponse[]>(() => data.value?.data ?? [])
const pagination = computed(() => data.value?.pagination ?? null)
const totalElements = computed(() => pagination.value?.totalElements ?? users.value.length)
const canPrev = computed(() => (pagination.value ? pagination.value.hasPrev : page.value > 0))
const canNext = computed(() => pagination.value?.hasNext ?? false)

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

const load = () =>
    execute({
        page: page.value,
        size: size.value,
        search: search.value.trim() || undefined,
        status: statusFilter.value === 'all' ? undefined : Number(statusFilter.value),
        roleId: roleFilter.value === 'all' ? undefined : roleFilter.value,
        createdFrom: createdFrom.value || undefined,
        createdTo: createdTo.value || undefined,
    })

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

const goPrev = () => {
    if (!canPrev.value) return
    page.value = Math.max(0, page.value - 1)
    load()
}
const goNext = () => {
    if (!canNext.value) return
    page.value += 1
    load()
}

// --- Roles (filter dropdown + assignment). SYS_ROOT is never assignable. ---
const { data: rolesData } = useFetch(roleService.getRoles, { immediate: true })
const roles = computed<Role[]>(() => rolesData.value?.data ?? [])
const assignableRoles = computed(() => roles.value.filter((r) => r.name !== 'SYS_ROOT'))

// --- Row helpers ---
const isSysRoot = (u: UserResponse) => u.roles?.some((r) => r.name === 'SYS_ROOT') ?? false
const isSelf = (u: UserResponse) => !!selfId.value && u.id === selfId.value

const statusLabel = (s: number) => (s === USER_STATUS.ACTIVE ? 'Active' : s === USER_STATUS.DISABLED ? 'Disabled' : 'Deleted')
const statusDot = (s: number) =>
    s === USER_STATUS.ACTIVE ? 'bg-emerald-500' : s === USER_STATUS.DISABLED ? 'bg-amber-500' : 'bg-rose-500'
const formatDate = (d: string) => (d ? new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '—')

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

const submitEdit = async () => {
    if (!editingUser.value || !editValid.value) return
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
    } catch (err) {
        triggerToast(getErrorMessage(err, 'Could not update user.'), 'error')
    } finally {
        saving.value = false
    }
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

// --- Status toggle ---
const toggleStatus = async (u: UserResponse) => {
    const next = u.status === USER_STATUS.ACTIVE ? USER_STATUS.DISABLED : USER_STATUS.ACTIVE
    try {
        await userService.updateStatus(u.id, next)
        triggerToast(next === USER_STATUS.ACTIVE ? 'User enabled' : 'User disabled', 'success')
        load()
    } catch (err) {
        triggerToast(getErrorMessage(err, 'Could not update status.'), 'error')
    }
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
    if (!deleteTarget.value) return
    deleting.value = true
    try {
        await userService.remove(deleteTarget.value.id)
        triggerToast('User deleted', 'success')
        if (users.value.length === 1 && page.value > 0) page.value -= 1
        deleteOpen.value = false
        deleteTarget.value = null
        load()
    } catch (err) {
        triggerToast(getErrorMessage(err, 'Could not delete user.'), 'error')
    } finally {
        deleting.value = false
    }
}

onMounted(load)
</script>
