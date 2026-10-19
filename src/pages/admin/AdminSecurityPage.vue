<template>
    <div class="flex flex-col gap-[22px]">
        <AdminPageHeader title="Security" description="Watch login attempts and block abusive IPs or devices.">
            <template v-if="canCreate && tab === 'bans'" #actions>
                <Button @click="openBanDialog('IP', '')">
                    <Plus class="size-4" />
                    New ban
                </Button>
            </template>
        </AdminPageHeader>

        <Tabs v-model="tab" class="gap-[22px]">
            <TabsList class="w-fit">
                <TabsTrigger v-for="t in tabs" :key="t.key" :value="t.key">{{ t.label }}</TabsTrigger>
            </TabsList>

            <!-- ============ Attempts tab ============ -->
            <TabsContent value="attempts" class="min-w-0 rounded-xl border border-border bg-card">
                <div class="flex flex-wrap items-end gap-3 border-b border-border p-[18px]">
                    <div class="w-full sm:w-[180px]">
                        <Input v-model="fIp" placeholder="Filter by IP" class="h-9" aria-label="Filter by IP" />
                    </div>
                    <div class="w-full sm:w-[200px]">
                        <Input v-model="fUsername" placeholder="Filter by username" class="h-9" aria-label="Filter by username" />
                    </div>
                    <div class="w-[150px]">
                        <Select v-model="fResult">
                            <SelectTrigger class="h-9"><SelectValue placeholder="Result" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All results</SelectItem>
                                <SelectItem value="ok">Success</SelectItem>
                                <SelectItem value="fail">Failed</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div class="flex items-end gap-2">
                        <div class="flex flex-col gap-1">
                            <label class="text-[11px] text-muted-foreground">From</label>
                            <Input v-model="fFrom" type="date" class="h-9 w-[150px]" aria-label="From date" />
                        </div>
                        <div class="flex flex-col gap-1">
                            <label class="text-[11px] text-muted-foreground">to</label>
                            <Input v-model="fTo" type="date" class="h-9 w-[150px]" aria-label="To date" />
                        </div>
                        <Button v-if="hasAttemptFilters" variant="ghost" size="sm" class="h-9" @click="clearAttemptFilters">
                            <X class="size-4" />
                            Clear filters
                        </Button>
                    </div>
                    <p v-if="!rangeValid" class="w-full text-xs text-destructive" role="alert">Start date must be before end date</p>
                </div>

                <ListStateShell
                    :loading="attemptsLoading"
                    :error="attemptsError ? 'error' : null"
                    :has-data="attemptsData !== null"
                    :empty="attempts.length === 0"
                    @retry="loadAttempts"
                >
                    <template #empty>
                        <div class="p-[18px] text-sm text-muted-foreground">
                            {{ hasAttemptFilters ? 'No login attempts match these filters.' : 'No login attempts yet.' }}
                        </div>
                    </template>
                    <div class="overflow-x-auto">
                        <table class="w-full text-sm">
                            <thead class="text-left text-muted-foreground">
                                <tr class="border-b border-border">
                                    <th class="px-[18px] py-2.5 font-medium">Time</th>
                                    <th class="px-3 py-2.5 font-medium">Username</th>
                                    <th class="px-3 py-2.5 font-medium">IP</th>
                                    <th class="px-3 py-2.5 font-medium">Device</th>
                                    <th class="px-3 py-2.5 font-medium">Result</th>
                                    <th class="px-[18px] py-2.5 text-right"><span class="sr-only">Actions</span></th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="a in attempts" :key="a.id" class="border-b border-border last:border-0">
                                    <td class="whitespace-nowrap px-[18px] py-2.5">{{ fmt(a.createdAt) }}</td>
                                    <td class="px-3 py-2.5">{{ a.username ?? '—' }}</td>
                                    <td class="px-3 py-2.5 font-mono text-xs">{{ a.ip ?? '—' }}</td>
                                    <td class="max-w-[160px] truncate px-3 py-2.5 font-mono text-xs" :title="a.deviceHash ?? ''">
                                        {{ a.deviceHash ?? '—' }}
                                    </td>
                                    <td class="px-3 py-2.5">
                                        <Badge :variant="a.success ? 'secondary' : 'destructive'">
                                            {{ a.success ? 'Success' : (a.errorCode ?? 'Failed') }}
                                        </Badge>
                                    </td>
                                    <td class="whitespace-nowrap px-[18px] py-2.5 text-right">
                                        <RowActionsMenu
                                            v-if="attemptActions(a).length"
                                            :items="attemptActions(a)"
                                            :label="a.username ?? a.ip ?? 'attempt'"
                                        />
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </ListStateShell>
                <PaginationFooter
                    :pagination="attemptsPagination ?? undefined"
                    @change-page="onAttemptPage"
                    @update:size="onAttemptSize"
                />
            </TabsContent>

            <!-- ============ Bans tab ============ -->
            <TabsContent value="bans" class="min-w-0 rounded-xl border border-border bg-card">
                <ListStateShell
                    :loading="bansLoading"
                    :error="bansError ? 'error' : null"
                    :has-data="bansData !== null"
                    :empty="bans.length === 0"
                    @retry="loadBans"
                >
                    <template #empty>
                        <div class="p-[18px] text-sm text-muted-foreground">
                            No active bans. Use “New ban” or ban straight from the Attempts tab.
                        </div>
                    </template>
                    <div class="overflow-x-auto">
                        <table class="w-full text-sm">
                            <thead class="text-left text-muted-foreground">
                                <tr class="border-b border-border">
                                    <th class="px-[18px] py-2.5 font-medium">Type</th>
                                    <th class="px-3 py-2.5 font-medium">Value</th>
                                    <th class="px-3 py-2.5 font-medium">Reason</th>
                                    <th class="px-3 py-2.5 font-medium">Expires</th>
                                    <th class="px-3 py-2.5 font-medium">By</th>
                                    <th class="px-[18px] py-2.5 text-right"><span class="sr-only">Actions</span></th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="b in bans" :key="b.id" class="border-b border-border last:border-0">
                                    <td class="px-[18px] py-2.5"><Badge variant="outline">{{ b.type }}</Badge></td>
                                    <td class="px-3 py-2.5 font-mono text-xs">{{ b.value }}</td>
                                    <td class="max-w-[220px] truncate px-3 py-2.5" :title="b.reason ?? ''">{{ b.reason ?? '—' }}</td>
                                    <td class="whitespace-nowrap px-3 py-2.5">{{ b.expiresAt ? fmt(b.expiresAt) : 'Permanent' }}</td>
                                    <td class="px-3 py-2.5">{{ b.createdBy ?? '—' }}</td>
                                    <td class="whitespace-nowrap px-[18px] py-2.5 text-right">
                                        <RowActionsMenu v-if="canDelete" :items="banActions(b)" :label="b.value" />
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </ListStateShell>
                <PaginationFooter :pagination="bansPagination ?? undefined" @change-page="onBanPage" @update:size="onBanSize" />
            </TabsContent>
        </Tabs>

        <!-- Create-ban dialog -->
        <Dialog v-model:open="banDialogOpen">
            <DialogContent class="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Ban {{ banForm.type === 'IP' ? 'IP address' : 'device' }}</DialogTitle>
                    <DialogDescription>
                        Blocked clients receive 403 on every request until the ban expires or is removed.
                    </DialogDescription>
                </DialogHeader>
                <div class="flex flex-col gap-3">
                    <div class="flex flex-col gap-1.5">
                        <Label>Type</Label>
                        <Select v-model="banForm.type">
                            <SelectTrigger class="w-full"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="IP">IP</SelectItem>
                                <SelectItem value="DEVICE">Device</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div class="flex flex-col gap-1.5">
                        <Label>Value</Label>
                        <Input v-model="banForm.value" :placeholder="banForm.type === 'IP' ? 'e.g. 203.0.113.7' : 'device hash'" />
                    </div>
                    <div class="flex flex-col gap-1.5">
                        <Label>Reason (optional)</Label>
                        <Input v-model="banForm.reason" placeholder="Why is this being blocked?" />
                    </div>
                    <div class="flex flex-col gap-1.5">
                        <Label>Duration</Label>
                        <Select v-model="banForm.duration">
                            <SelectTrigger class="w-full"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="1h">1 hour</SelectItem>
                                <SelectItem value="24h">24 hours</SelectItem>
                                <SelectItem value="7d">7 days</SelectItem>
                                <SelectItem value="permanent">Permanent</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" :disabled="banSaving" @click="banDialogOpen = false">Cancel</Button>
                    <Button :disabled="banSaving || !banForm.value.trim()" @click="submitBan">
                        <Loader2 v-if="banSaving" class="size-4 animate-spin" />
                        Ban
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        <ConfirmDialog
            :open="unbanOpen"
            :title="`Remove ban on ${unbanTarget?.value ?? ''}?`"
            description="Requests from it are allowed again."
            confirm-label="Unban"
            :busy="unbanning"
            @update:open="(v) => (unbanOpen = v)"
            @confirm="confirmUnban"
        />
    </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { watchDebounced } from '@vueuse/core'
import { Plus, X, Loader2, Globe, Fingerprint, ShieldOff } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import AdminPageHeader from '@/components/admin/AdminPageHeader.vue'
import ListStateShell from '@/components/common/ListStateShell.vue'
import PaginationFooter from '@/components/common/PaginationFooter.vue'
import RowActionsMenu from '@/components/common/RowActionsMenu.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import type { RowAction } from '@/components/common/rowActions'
import { isValidRange } from '@/lib/dateRange'
import { useFetch } from '@/composables/useFetch'
import { useToast } from '@/composables/useToast'
import { getErrorMessage } from '@/lib/errorMessage'
import securityService from '@/services/securityService'
import { useAuthStore } from '@/stores/auth'
import type { AccessBan, BanType, CreateBanPayload, LoginAttempt } from '@/types/security'

const authStore = useAuthStore()
const { triggerToast } = useToast()

const canCreate = computed(() => authStore.hasPermission('ban:create'))
const canDelete = computed(() => authStore.hasPermission('ban:delete'))

const tabs = [
    { key: 'attempts', label: 'Login attempts' },
    { key: 'bans', label: 'Bans' },
] as const
const tab = ref<'attempts' | 'bans'>('attempts')

// --- Attempts tab ---
const {
    data: attemptsData,
    isLoading: attemptsLoading,
    error: attemptsError,
    execute: executeAttempts,
} = useFetch(securityService.listAttempts, { immediate: false })

const attempts = computed<LoginAttempt[]>(() => attemptsData.value?.data ?? [])
const attemptsPagination = computed(() => attemptsData.value?.pagination ?? null)

const attemptPage = ref(0)
const attemptSize = ref(20)
const fIp = ref('')
const fUsername = ref('')
const fResult = ref<'all' | 'ok' | 'fail'>('all')
const fFrom = ref('')
const fTo = ref('')

const rangeValid = computed(() => isValidRange(fFrom.value, fTo.value))

const hasAttemptFilters = computed(
    () => !!fIp.value || !!fUsername.value || fResult.value !== 'all' || !!fFrom.value || !!fTo.value,
)

const loadAttempts = () => {
    if (!rangeValid.value) return
    return executeAttempts({
        page: attemptPage.value,
        size: attemptSize.value,
        ip: fIp.value.trim() || undefined,
        username: fUsername.value.trim() || undefined,
        success: fResult.value === 'all' ? undefined : fResult.value === 'ok',
        createdFrom: fFrom.value || undefined,
        createdTo: fTo.value || undefined,
    })
}

const clearAttemptFilters = () => {
    fIp.value = ''
    fUsername.value = ''
    fResult.value = 'all'
    fFrom.value = ''
    fTo.value = ''
}

watchDebounced([fIp, fUsername], () => { attemptPage.value = 0; loadAttempts() }, { debounce: 300 })
watch([fResult, fFrom, fTo], () => { attemptPage.value = 0; loadAttempts() })

const onAttemptPage = (p: number) => {
    attemptPage.value = p
    loadAttempts()
}
const onAttemptSize = (n: number) => {
    attemptSize.value = n
    attemptPage.value = 0
    loadAttempts()
}

const attemptActions = (a: LoginAttempt): RowAction[] => {
    if (!canCreate.value) return []
    const items: RowAction[] = []
    if (a.ip) items.push({ label: 'Ban IP…', icon: Globe, onSelect: () => openBanDialog('IP', a.ip!) })
    if (a.deviceHash) items.push({ label: 'Ban device…', icon: Fingerprint, onSelect: () => openBanDialog('DEVICE', a.deviceHash!) })
    return items
}

// --- Bans tab ---
const {
    data: bansData,
    isLoading: bansLoading,
    error: bansError,
    execute: executeBans,
} = useFetch(securityService.listBans, { immediate: false })

const bans = computed<AccessBan[]>(() => bansData.value?.data ?? [])
const bansPagination = computed(() => bansData.value?.pagination ?? null)

const banPage = ref(0)
const banSize = ref(10)
const loadBans = () => executeBans({ page: banPage.value, size: banSize.value })
const onBanPage = (p: number) => {
    banPage.value = p
    loadBans()
}
const onBanSize = (n: number) => {
    banSize.value = n
    banPage.value = 0
    loadBans()
}

const banActions = (b: AccessBan): RowAction[] => [
    { label: 'Unban…', icon: ShieldOff, destructive: true, onSelect: () => { unbanTarget.value = b; unbanOpen.value = true } },
]

onMounted(() => {
    loadAttempts()
    loadBans()
})

// --- Ban dialog (shared by both tabs) ---
const banDialogOpen = ref(false)
const banSaving = ref(false)
const banForm = ref<{ type: BanType; value: string; reason: string; duration: string }>({
    type: 'IP', value: '', reason: '', duration: 'permanent',
})

const DURATIONS: Record<string, number | null> = { '1h': 1, '24h': 24, '7d': 168, permanent: null }

function openBanDialog(type: BanType, value: string) {
    banForm.value = { type, value, reason: '', duration: 'permanent' }
    banDialogOpen.value = true
}

async function submitBan() {
    if (banSaving.value) return
    banSaving.value = true
    try {
        const payload: CreateBanPayload = {
            type: banForm.value.type,
            value: banForm.value.value.trim(),
            reason: banForm.value.reason.trim() || undefined,
            durationHours: DURATIONS[banForm.value.duration],
        }
        await securityService.createBan(payload)
        triggerToast(`Banned ${payload.type} ${payload.value}`, 'success')
        banDialogOpen.value = false
        banPage.value = 0
        loadBans()
    } catch (err) {
        triggerToast(getErrorMessage(err, 'Could not create ban'), 'error')
    } finally {
        banSaving.value = false
    }
}

// --- Unban ---
// The target stays set after the dialog closes so its title survives the close animation.
const unbanTarget = ref<AccessBan | null>(null)
const unbanOpen = ref(false)
const unbanning = ref(false)

async function confirmUnban() {
    if (!unbanTarget.value || unbanning.value) return
    unbanning.value = true
    try {
        await securityService.deleteBan(unbanTarget.value.id)
        triggerToast(`Unbanned ${unbanTarget.value.value}`, 'success')
        unbanOpen.value = false
        loadBans()
    } catch (err) {
        triggerToast(getErrorMessage(err, 'Could not remove ban'), 'error')
    } finally {
        unbanning.value = false
    }
}

const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString() : '—')
</script>
