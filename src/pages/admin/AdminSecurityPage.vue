<template>
    <div class="flex flex-col gap-[18px]">
        <PageHeader title="Security" description="Sign-in attempts and the bans that block an IP address or a device.">
            <template v-if="canCreate" #actions>
                <Button @click="openBanDialog('IP', '')">
                    <Ban class="size-4" />
                    New ban
                </Button>
            </template>
        </PageHeader>

        <Tabs v-model="tab" class="gap-[18px]">
            <TabsList class="w-fit">
                <TabsTrigger v-for="t in tabs" :key="t.key" :value="t.key">
                    {{ t.label }}
                    <span
                        v-if="t.key === 'bans' && bansTotal !== null"
                        class="rounded-[4px] bg-muted px-[5px] font-mono text-[11px] text-muted-foreground"
                    >{{ bansTotal }}</span>
                </TabsTrigger>
            </TabsList>

            <!-- ============ Attempts tab ============ -->
            <TabsContent value="attempts" class="min-w-0 overflow-hidden rounded-xl border border-border bg-card">
                <div class="flex flex-wrap items-end gap-2 border-b border-border px-3 py-2.5">
                    <div class="relative w-full sm:w-[200px]">
                        <Search class="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                        <Input v-model="fUsername" type="search" placeholder="Username" class="pl-8" aria-label="Filter by username" />
                    </div>
                    <div class="w-full sm:w-[170px]">
                        <Input v-model="fIp" placeholder="IP address" class="font-mono" aria-label="Filter by IP" />
                    </div>
                    <div class="w-[150px]">
                        <Select v-model="fResult">
                            <SelectTrigger aria-label="Result"><SelectValue placeholder="Result" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Any result</SelectItem>
                                <SelectItem value="fail">Failed</SelectItem>
                                <SelectItem value="ok">Succeeded</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div class="flex items-end gap-2">
                        <div class="flex flex-col gap-1">
                            <label for="att-from" class="text-xs text-muted-foreground">From</label>
                            <Input id="att-from" v-model="fFrom" type="date" class="w-[150px]" />
                        </div>
                        <div class="flex flex-col gap-1">
                            <label for="att-to" class="text-xs text-muted-foreground">To</label>
                            <Input id="att-to" v-model="fTo" type="date" class="w-[150px]" />
                        </div>
                        <Button v-if="hasAttemptFilters" variant="ghost" size="sm" class="h-9" @click="clearAttemptFilters">
                            <X class="size-4" />
                            Clear filters
                        </Button>
                    </div>
                    <p v-if="!rangeValid" class="w-full text-xs text-destructive-ink" role="alert">The start date must be before the end date.</p>
                </div>

                <ListStateShell
                    :loading="attemptsLoading"
                    :error="attemptsError ? 'The request failed. Check your connection and try again.' : null"
                    :has-data="attemptsData !== null"
                    :empty="attempts.length === 0"
                    :filtered="hasAttemptFilters"
                    empty-title="No sign-in attempts yet"
                    empty-hint="Every sign-in to the admin console is logged here."
                    @retry="loadAttempts"
                    @clear-filters="clearAttemptFilters"
                >
                    <div class="overflow-x-auto">
                        <table class="dt min-w-[860px]">
                            <thead>
                                <tr>
                                    <th class="pl-4">Time</th>
                                    <th>Result</th>
                                    <th>Username</th>
                                    <th>IP</th>
                                    <th>Device</th>
                                    <th>Browser</th>
                                    <th><span class="sr-only">Actions</span></th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="a in attempts" :key="a.id">
                                    <td class="pl-4 font-mono text-xs whitespace-nowrap">{{ fmt(a.createdAt) }}</td>
                                    <td class="py-2">
                                        <Badge v-if="a.success" variant="success">
                                            <Check aria-hidden="true" />
                                            Succeeded
                                        </Badge>
                                        <template v-else>
                                            <Badge variant="danger">
                                                <X aria-hidden="true" />
                                                Failed
                                            </Badge>
                                            <div v-if="a.errorCode" class="slug mt-[3px]">{{ a.errorCode }}</div>
                                        </template>
                                    </td>
                                    <td>
                                        <span v-if="a.username" class="font-mono text-xs">{{ a.username }}</span>
                                        <span v-else class="text-xs text-muted-foreground">-</span>
                                    </td>
                                    <td class="font-mono text-xs">{{ a.ip ?? '-' }}</td>
                                    <td class="max-w-[140px] truncate font-mono text-xs text-muted-foreground" :title="a.deviceHash ? `Device hash ${a.deviceHash}` : undefined">
                                        {{ a.deviceHash ?? '-' }}
                                    </td>
                                    <td class="max-w-[220px] truncate text-xs text-muted-foreground" :title="a.userAgent ?? undefined">
                                        {{ a.userAgent ?? '-' }}
                                    </td>
                                    <td class="act">
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
                <div class="px-4">
                    <PaginationFooter
                        :pagination="attemptsPagination ?? undefined"
                        @change-page="onAttemptPage"
                        @update:size="onAttemptSize"
                    />
                </div>
            </TabsContent>

            <!-- ============ Bans tab ============ -->
            <TabsContent value="bans" class="min-w-0 overflow-hidden rounded-xl border border-border bg-card">
                <ListStateShell
                    :loading="bansLoading"
                    :error="bansError ? 'The request failed. Check your connection and try again.' : null"
                    :has-data="bansData !== null"
                    :empty="bans.length === 0"
                    empty-title="No active bans"
                    empty-hint="Use New ban, or ban an IP or device from a sign-in attempt."
                    @retry="loadBans"
                >
                    <div class="overflow-x-auto">
                        <table class="dt min-w-[760px]">
                            <thead>
                                <tr>
                                    <th class="pl-4">Type</th>
                                    <th>Value</th>
                                    <th>Reason</th>
                                    <th>Expires</th>
                                    <th>Created</th>
                                    <th><span class="sr-only">Actions</span></th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="b in bans" :key="b.id">
                                    <td class="pl-4">
                                        <Badge variant="mono">
                                            <Globe v-if="b.type === 'IP'" aria-hidden="true" />
                                            <MonitorSmartphone v-else aria-hidden="true" />
                                            {{ b.type }}
                                        </Badge>
                                    </td>
                                    <td class="font-mono text-xs">{{ b.value }}</td>
                                    <td class="max-w-[240px] truncate text-[13px]" :title="b.reason ?? undefined">
                                        <template v-if="b.reason">{{ b.reason }}</template>
                                        <span v-else class="text-muted-foreground">-</span>
                                    </td>
                                    <td class="text-[13px] whitespace-nowrap">
                                        <template v-if="b.expiresAt">{{ fmt(b.expiresAt) }}</template>
                                        <Badge v-else variant="outline" title="Permanent">
                                            <InfinityIcon aria-hidden="true" />
                                            Never
                                        </Badge>
                                    </td>
                                    <td class="text-xs text-muted-foreground">
                                        <span class="font-mono">{{ b.createdBy ?? '-' }}</span>
                                        <span v-if="b.createdAt">, {{ fmt(b.createdAt) }}</span>
                                    </td>
                                    <td class="act">
                                        <RowActionsMenu v-if="canDelete" :items="banActions(b)" :label="b.value" />
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </ListStateShell>
                <div class="px-4">
                    <PaginationFooter :pagination="bansPagination ?? undefined" @change-page="onBanPage" @update:size="onBanSize" />
                </div>
            </TabsContent>
        </Tabs>

        <!-- Create-ban dialog -->
        <Dialog v-model:open="banDialogOpen">
            <DialogContent class="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Ban {{ banForm.type === 'IP' ? 'IP address' : 'device' }}</DialogTitle>
                    <DialogDescription>
                        A banned client gets 403 on every request until the ban expires or is removed.
                    </DialogDescription>
                </DialogHeader>
                <div class="flex flex-col gap-3">
                    <div class="flex flex-col gap-1.5">
                        <Label for="ban-type">Type</Label>
                        <Select v-model="banForm.type">
                            <SelectTrigger id="ban-type" class="w-full"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="IP">IP</SelectItem>
                                <SelectItem value="DEVICE">Device</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div class="flex flex-col gap-1.5">
                        <Label for="ban-value">{{ banForm.type === 'IP' ? 'IP address' : 'Device hash' }}</Label>
                        <Input id="ban-value" v-model="banForm.value" class="font-mono" :placeholder="banForm.type === 'IP' ? '203.0.113.7' : 'Device hash'" />
                    </div>
                    <div class="flex flex-col gap-1.5">
                        <Label for="ban-reason">Reason <span class="font-normal text-muted-foreground">(optional)</span></Label>
                        <Input id="ban-reason" v-model="banForm.reason" placeholder="Why is this being blocked?" />
                    </div>
                    <div class="flex flex-col gap-1.5">
                        <Label for="ban-duration">Duration</Label>
                        <Select v-model="banForm.duration">
                            <SelectTrigger id="ban-duration" class="w-full"><SelectValue /></SelectTrigger>
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
                    <Button variant="secondary" :disabled="banSaving" @click="banDialogOpen = false">Cancel</Button>
                    <Button :disabled="banSaving || !banForm.value.trim()" @click="submitBan">
                        <Loader2 v-if="banSaving" class="size-4 animate-spin" />
                        {{ banForm.type === 'IP' ? 'Ban IP address' : 'Ban device' }}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

    </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { watchDebounced } from '@vueuse/core'
import { Ban, Check, Fingerprint, Globe, Infinity as InfinityIcon, Loader2, MonitorSmartphone, Search, ShieldOff, X } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import PageHeader from '@/components/common/PageHeader.vue'
import ListStateShell from '@/components/common/ListStateShell.vue'
import PaginationFooter from '@/components/common/PaginationFooter.vue'
import RowActionsMenu from '@/components/common/RowActionsMenu.vue'
import type { RowAction } from '@/components/common/rowActions'
import { isValidRange } from '@/lib/dateRange'
import { useFetch } from '@/composables/useFetch'
import { useToast } from '@/composables/useToast'
import { usePendingDeletes, isAlreadyGone } from '@/composables/usePendingDeletes'
import { getErrorMessage } from '@/lib/errorMessage'
import securityService from '@/services/securityService'
import { useAuthStore } from '@/stores/auth'
import type { AccessBan, BanType, CreateBanPayload, LoginAttempt } from '@/types/security'

const authStore = useAuthStore()
const { triggerToast, undo, error: errorToast } = useToast()

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
    if (a.ip) items.push({ label: 'Ban IP address…', icon: Globe, onSelect: () => openBanDialog('IP', a.ip!) })
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

// Bans removed optimistically and still waiting out their undo window or request.
const pendingUnbans = usePendingDeletes()
const bans = computed<AccessBan[]>(() => pendingUnbans.filter(bansData.value?.data ?? [], (b) => b.id))
const bansPagination = computed(() => bansData.value?.pagination ?? null)
const bansTotal = computed(() => bansPagination.value?.totalElements ?? null)

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
    { label: 'Remove ban', icon: ShieldOff, onSelect: () => startUnban(b) },
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
        triggerToast(`Banned ${payload.type === 'IP' ? 'IP address' : 'device'} ${payload.value}`, 'success')
        banDialogOpen.value = false
        banPage.value = 0
        loadBans()
    } catch (err) {
        triggerToast(getErrorMessage(err, 'Could not create ban'), 'error')
    } finally {
        banSaving.value = false
    }
}

// --- Remove ban: the row goes at once; the DELETE is sent when the undo window closes ---
const startUnban = (b: AccessBan) => {
    if (!pendingUnbans.add(b.id)) return
    undo('Ban removed', {
        description: `${b.type === 'IP' ? 'IP address' : 'Device'} ${b.value}`,
        onUndo: () => pendingUnbans.remove(b.id),
        // Catches its own errors, so the toast engine never sees a rejection.
        commit: async () => {
            try {
                try {
                    await securityService.deleteBan(b.id)
                } catch (err) {
                    if (!isAlreadyGone(err)) throw err
                }
                // If that was the last row on a later page, step back.
                if (bans.value.length === 0 && banPage.value > 0) banPage.value -= 1
                await loadBans()
            } catch (err) {
                errorToast("Couldn't remove the ban", {
                    description: getErrorMessage(err, `${b.value} is still banned.`),
                    action: { label: 'Retry', onClick: () => startUnban(b) },
                })
            } finally {
                pendingUnbans.remove(b.id)
            }
        },
    })
}

const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString() : '-')
</script>
