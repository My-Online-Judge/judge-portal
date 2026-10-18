<template>
    <div class="flex flex-col gap-[22px]">
        <!-- Page header -->
        <div class="flex flex-wrap items-start justify-between gap-4">
            <div class="min-w-0">
                <h1 class="text-[24px] font-semibold leading-tight tracking-tight text-foreground">Security</h1>
                <p class="mt-1 text-sm text-muted-foreground">Watch login attempts and block abusive IPs or devices.</p>
            </div>
            <Button v-if="canCreate && tab === 'bans'" class="h-[38px]" @click="openBanDialog('IP', '')">
                <Plus class="size-4" />
                New ban
            </Button>
        </div>

        <!-- Tabs -->
        <div class="flex gap-1 border-b border-border" role="tablist">
            <button
                v-for="t in tabs"
                :key="t.key"
                role="tab"
                :aria-selected="tab === t.key"
                class="-mb-px border-b-2 px-3 py-2 text-sm transition-colors"
                :class="tab === t.key ? 'border-primary font-medium text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'"
                @click="tab = t.key"
            >
                {{ t.label }}
            </button>
        </div>

        <!-- ============ Attempts tab ============ -->
        <div v-if="tab === 'attempts'" class="min-w-0 rounded-xl border border-border bg-card">
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
                        Clear
                    </Button>
                </div>
            </div>

            <div v-if="attemptsLoading" class="p-[18px] text-sm text-muted-foreground">Loading…</div>
            <div v-else-if="attemptsError" class="flex items-center gap-2 p-[18px] text-sm text-destructive">
                <TriangleAlert class="size-4" />
                {{ getErrorMessage(attemptsError, 'Could not load login attempts') }}
                <Button variant="outline" size="sm" @click="loadAttempts">
                    <RefreshCw class="size-4" />
                    Retry
                </Button>
            </div>
            <div v-else-if="!attempts.length" class="p-[18px] text-sm text-muted-foreground">
                No login attempts match these filters.
            </div>
            <div v-else class="overflow-x-auto">
                <table class="w-full text-sm">
                    <thead class="text-left text-muted-foreground">
                        <tr class="border-b border-border">
                            <th class="px-[18px] py-2.5 font-medium">Time</th>
                            <th class="px-3 py-2.5 font-medium">Username</th>
                            <th class="px-3 py-2.5 font-medium">IP</th>
                            <th class="px-3 py-2.5 font-medium">Device</th>
                            <th class="px-3 py-2.5 font-medium">Result</th>
                            <th class="px-3 py-2.5 text-right font-medium">Actions</th>
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
                            <td class="whitespace-nowrap px-3 py-2.5 text-right">
                                <Button v-if="canCreate && a.ip" variant="ghost" size="sm" @click="openBanDialog('IP', a.ip)">
                                    Ban IP
                                </Button>
                                <Button v-if="canCreate && a.deviceHash" variant="ghost" size="sm" @click="openBanDialog('DEVICE', a.deviceHash)">
                                    Ban device
                                </Button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div class="flex items-center justify-between border-t border-border p-[18px] text-sm">
                <span class="text-muted-foreground">{{ attemptTotal }} attempts</span>
                <div class="flex gap-2">
                    <Button variant="outline" size="sm" :disabled="!attemptsCanPrev" @click="attemptPage--">Previous</Button>
                    <Button variant="outline" size="sm" :disabled="!attemptsCanNext" @click="attemptPage++">Next</Button>
                </div>
            </div>
        </div>

        <!-- ============ Bans tab ============ -->
        <div v-else class="min-w-0 rounded-xl border border-border bg-card">
            <div v-if="bansLoading" class="p-[18px] text-sm text-muted-foreground">Loading…</div>
            <div v-else-if="bansError" class="flex items-center gap-2 p-[18px] text-sm text-destructive">
                <TriangleAlert class="size-4" />
                {{ getErrorMessage(bansError, 'Could not load bans') }}
                <Button variant="outline" size="sm" @click="loadBans">
                    <RefreshCw class="size-4" />
                    Retry
                </Button>
            </div>
            <div v-else-if="!bans.length" class="p-[18px] text-sm text-muted-foreground">
                No active bans. Use “New ban” or ban straight from the Attempts tab.
            </div>
            <div v-else class="overflow-x-auto">
                <table class="w-full text-sm">
                    <thead class="text-left text-muted-foreground">
                        <tr class="border-b border-border">
                            <th class="px-[18px] py-2.5 font-medium">Type</th>
                            <th class="px-3 py-2.5 font-medium">Value</th>
                            <th class="px-3 py-2.5 font-medium">Reason</th>
                            <th class="px-3 py-2.5 font-medium">Expires</th>
                            <th class="px-3 py-2.5 font-medium">By</th>
                            <th class="px-3 py-2.5 text-right font-medium">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="b in bans" :key="b.id" class="border-b border-border last:border-0">
                            <td class="px-[18px] py-2.5"><Badge variant="outline">{{ b.type }}</Badge></td>
                            <td class="px-3 py-2.5 font-mono text-xs">{{ b.value }}</td>
                            <td class="max-w-[220px] truncate px-3 py-2.5" :title="b.reason ?? ''">{{ b.reason ?? '—' }}</td>
                            <td class="whitespace-nowrap px-3 py-2.5">{{ b.expiresAt ? fmt(b.expiresAt) : 'Permanent' }}</td>
                            <td class="px-3 py-2.5">{{ b.createdBy ?? '—' }}</td>
                            <td class="whitespace-nowrap px-3 py-2.5 text-right">
                                <Button v-if="canDelete" variant="ghost" size="sm" class="text-destructive" @click="unbanTarget = b">
                                    Unban
                                </Button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div class="flex items-center justify-between border-t border-border p-[18px] text-sm">
                <span class="text-muted-foreground">{{ banTotal }} bans</span>
                <div class="flex gap-2">
                    <Button variant="outline" size="sm" :disabled="!bansCanPrev" @click="banPage--">Previous</Button>
                    <Button variant="outline" size="sm" :disabled="!bansCanNext" @click="banPage++">Next</Button>
                </div>
            </div>
        </div>

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
                    <Button variant="outline" @click="banDialogOpen = false">Cancel</Button>
                    <Button :disabled="banSaving || !banForm.value.trim()" @click="submitBan">
                        <Loader2 v-if="banSaving" class="size-4 animate-spin" />
                        Ban
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        <!-- Unban confirm -->
        <Dialog :open="!!unbanTarget" @update:open="(v: boolean) => { if (!v) unbanTarget = null }">
            <DialogContent class="sm:max-w-sm">
                <DialogHeader>
                    <DialogTitle>Remove this ban?</DialogTitle>
                    <DialogDescription>
                        {{ unbanTarget?.type }} <span class="font-mono">{{ unbanTarget?.value }}</span> will immediately regain access.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button variant="outline" @click="unbanTarget = null">Cancel</Button>
                    <Button variant="destructive" :disabled="unbanning" @click="confirmUnban">
                        <Loader2 v-if="unbanning" class="size-4 animate-spin" />
                        Unban
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { watchDebounced } from '@vueuse/core'
import { Plus, X, TriangleAlert, RefreshCw, Loader2 } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from '@/components/ui/dialog'
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
const attemptTotal = computed(() => attemptsPagination.value?.totalElements ?? attempts.value.length)
const attemptsCanPrev = computed(() => (attemptsPagination.value ? attemptsPagination.value.hasPrev : attemptPage.value > 0))
const attemptsCanNext = computed(() => attemptsPagination.value?.hasNext ?? false)

const attemptPage = ref(0)
const size = 20
const fIp = ref('')
const fUsername = ref('')
const fResult = ref<'all' | 'ok' | 'fail'>('all')
const fFrom = ref('')
const fTo = ref('')

const hasAttemptFilters = computed(
    () => !!fIp.value || !!fUsername.value || fResult.value !== 'all' || !!fFrom.value || !!fTo.value,
)

const loadAttempts = () =>
    executeAttempts({
        page: attemptPage.value,
        size,
        ip: fIp.value.trim() || undefined,
        username: fUsername.value.trim() || undefined,
        success: fResult.value === 'all' ? undefined : fResult.value === 'ok',
        createdFrom: fFrom.value || undefined,
        createdTo: fTo.value || undefined,
    })

const clearAttemptFilters = () => {
    fIp.value = ''
    fUsername.value = ''
    fResult.value = 'all'
    fFrom.value = ''
    fTo.value = ''
}

watchDebounced([fIp, fUsername], () => { attemptPage.value = 0; loadAttempts() }, { debounce: 300 })
watch([fResult, fFrom, fTo], () => { attemptPage.value = 0; loadAttempts() })
watch(attemptPage, loadAttempts)

// --- Bans tab ---
const {
    data: bansData,
    isLoading: bansLoading,
    error: bansError,
    execute: executeBans,
} = useFetch(securityService.listBans, { immediate: false })

const bans = computed<AccessBan[]>(() => bansData.value?.data ?? [])
const bansPagination = computed(() => bansData.value?.pagination ?? null)
const banTotal = computed(() => bansPagination.value?.totalElements ?? bans.value.length)
const bansCanPrev = computed(() => (bansPagination.value ? bansPagination.value.hasPrev : banPage.value > 0))
const bansCanNext = computed(() => bansPagination.value?.hasNext ?? false)

const banPage = ref(0)
const loadBans = () => executeBans({ page: banPage.value, size })
watch(banPage, loadBans)

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
const unbanTarget = ref<AccessBan | null>(null)
const unbanning = ref(false)

async function confirmUnban() {
    if (!unbanTarget.value) return
    unbanning.value = true
    try {
        await securityService.deleteBan(unbanTarget.value.id)
        triggerToast(`Unbanned ${unbanTarget.value.value}`, 'success')
        unbanTarget.value = null
        loadBans()
    } catch (err) {
        triggerToast(getErrorMessage(err, 'Could not remove ban'), 'error')
    } finally {
        unbanning.value = false
    }
}

const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString() : '—')
</script>
