<template>
    <div class="flex flex-col gap-[18px]">
        <PageHeader title="Permissions" description="The permission catalog, grouped by resource. Roles grant these. Read-only.">
            <template #actions>
                <Button variant="secondary" :disabled="isLoading" @click="load">
                    <RefreshCw :class="isLoading && 'animate-spin motion-reduce:animate-none'" />
                    Refresh
                </Button>
            </template>
        </PageHeader>

        <div class="min-w-0 overflow-hidden rounded-xl border border-border bg-card">
            <ListStateShell
                :loading="isLoading"
                :error="error ? 'The request failed. Check your connection and try again.' : null"
                :has-data="data !== null"
                :empty="permissions.length === 0"
                :rows="8"
                empty-title="No permissions in the catalog"
                empty-hint="The server seeds the catalog. It appears here once it's available."
                @retry="load"
            >
                <div class="overflow-x-auto">
                    <table class="dt min-w-[560px]">
                        <thead>
                            <tr>
                                <th class="w-[280px]">Permission</th>
                                <th>Description</th>
                            </tr>
                        </thead>
                        <tbody>
                            <template v-for="group in groups" :key="group.resource">
                                <tr class="bg-[color-mix(in_oklch,var(--muted)_50%,var(--card))]">
                                    <td colspan="2" class="h-[38px] font-semibold">
                                        {{ group.label }}
                                        <span class="ml-1.5 font-mono text-[11px] font-normal text-muted-foreground">{{ group.names.length }}</span>
                                    </td>
                                </tr>
                                <tr v-for="name in group.names" :key="name">
                                    <td class="h-10 pl-7 font-mono text-xs">{{ name }}</td>
                                    <td class="h-10 text-[13px] text-muted-foreground">{{ descOf(name) || '-' }}</td>
                                </tr>
                            </template>
                        </tbody>
                    </table>
                </div>
            </ListStateShell>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { RefreshCw } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import PageHeader from '@/components/common/PageHeader.vue'
import ListStateShell from '@/components/common/ListStateShell.vue'
import { useFetch } from '@/composables/useFetch'
import permissionService from '@/services/permissionService'
import { groupByResource } from '@/lib/permissionDisplay'
import type { Permission } from '@/types/permission'

const { data, isLoading, error, execute } = useFetch(permissionService.getPermissions)

const load = () => execute()

const permissions = computed<Permission[]>(() => data.value?.data ?? [])
const groups = computed(() => groupByResource(permissions.value.map((p) => p.name)))

const permByName = computed(() => new Map(permissions.value.map((p) => [p.name, p])))
const descOf = (name: string) => permByName.value.get(name)?.description
</script>
