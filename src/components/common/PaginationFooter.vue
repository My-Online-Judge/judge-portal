<template>
    <div v-if="pagination" class="flex flex-col gap-4 py-4 sm:flex-row sm:items-center border-t border-border sm:justify-between mt-2">
        <!-- Results Text -->
        <p class="text-sm text-muted-foreground">
            <template v-if="pagination.totalElements === 0">No results</template>
            <template v-else>
                <span :class="pagination.totalPages > 1 ? 'hidden sm:inline' : ''" class="tabular-nums">Showing <b class="font-medium tabular-nums text-foreground">{{ startItem }}-{{ endItem }}</b> of <b class="font-medium tabular-nums text-foreground">{{ pagination.totalElements }}</b></span>
                <span v-if="pagination.totalPages > 1" class="tabular-nums sm:hidden">Page <b class="font-medium tabular-nums text-foreground">{{ currentPage }}</b> of <b class="font-medium tabular-nums text-foreground">{{ pagination.totalPages }}</b></span>
            </template>
        </p>

        <div v-if="pagination.totalElements > 0" class="flex items-center gap-4">
            <!-- Pagination Controls -->
            <div v-if="pagination.totalPages > 1" class="flex items-center gap-2 sm:hidden">
                <Button variant="outline" size="sm" :disabled="!pagination.hasPrev" @click="handlePageChange(currentPage - 1)">Previous</Button>
                <Button variant="outline" size="sm" :disabled="!pagination.hasNext" @click="handlePageChange(currentPage + 1)">Next</Button>
            </div>
            <Pagination v-if="pagination.totalPages > 1" class="hidden sm:block" :page="currentPage" :total="pagination.totalElements" :sibling-count="1" show-edges
                :items-per-page="pagination.size" @update:page="handlePageChange">
                <PaginationContent v-slot="{ items }" class="flex items-center gap-1">
                    <PaginationFirst size="icon" :disabled="currentPage === 1">
                        <ChevronsLeft class="size-4" />
                    </PaginationFirst>
                    <PaginationPrevious size="icon" :disabled="!pagination.hasPrev">
                        <ChevronLeft class="size-4" />
                    </PaginationPrevious>

                    <template v-for="(item, index) in items">
                        <PaginationItem v-if="item.type === 'page'" :key="index" :value="item.value" as-child>
                            <Button size="icon" class="cursor-pointer tabular-nums"
                                :variant="item.value === currentPage ? 'outline' : 'ghost'"
                                :class="item.value === currentPage ? 'border-primary bg-primary-soft text-info-ink hover:bg-primary-soft hover:border-primary' : ''">
                                {{ item.value }}
                            </Button>
                        </PaginationItem>
                        <PaginationEllipsis v-else :key="item.type" :index="index" class="text-muted-foreground" />
                    </template>

                    <PaginationNext size="icon" :disabled="!pagination.hasNext">
                        <ChevronRight class="size-4" />
                    </PaginationNext>
                    <PaginationLast size="icon"
                        :disabled="currentPage === pagination.totalPages">
                        <ChevronsRight class="size-4" />
                    </PaginationLast>
                </PaginationContent>
            </Pagination>

            <!-- Page Size Selector -->
            <div class="flex items-center gap-2">
                <Select :model-value="String(pagination.size)" @update:model-value="handleSizeChange">
                    <SelectTrigger class="w-36">
                        <SelectValue placeholder="Size" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="10">10 per page</SelectItem>
                        <SelectItem value="20">20 per page</SelectItem>
                        <SelectItem value="50">50 per page</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
    Pagination,
    PaginationEllipsis,
    PaginationFirst,
    PaginationLast,
    PaginationContent,
    PaginationNext,
    PaginationPrevious,
    PaginationItem
} from '@/components/ui/pagination'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-vue-next'
import type { Pagination as PaginationType } from '@/types/common'

const props = defineProps<{
    pagination?: PaginationType
}>()

const emit = defineEmits<{
    (e: 'change-page', page: number): void
    (e: 'update:size', size: number): void
}>()

// Convert 0-indexed API page to 1-indexed UI page
const currentPage = computed(() => (props.pagination?.page ?? 0) + 1)

const startItem = computed(() => {
    if (!props.pagination) return 0
    return props.pagination.page * props.pagination.size + 1
})

const endItem = computed(() => {
    if (!props.pagination) return 0
    const end = (props.pagination.page + 1) * props.pagination.size
    return Math.min(end, props.pagination.totalElements)
})

const handlePageChange = (page: number) => {
    if (!props.pagination) return
    if (page < 1 || page > props.pagination.totalPages) return
    if (page === currentPage.value) return

    emit('change-page', page - 1)
}

const handleSizeChange = (value: unknown) => {
    if (value) {
        emit('update:size', Number(value))
    }
}
</script>
