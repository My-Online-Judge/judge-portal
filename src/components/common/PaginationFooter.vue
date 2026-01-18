<template>
    <div v-if="pagination" class="flex flex-col gap-4 py-4 sm:flex-row sm:items-center border-t border-slate-200 sm:justify-between mt-2">
        <!-- Results Text -->
        <p class="text-sm text-slate-500 font-medium">
            Showing {{ startItem }} to {{ endItem }} of {{ pagination.totalElements }} results
        </p>

        <div class="flex items-center gap-4">
            <!-- Pagination Controls -->
            <Pagination v-if="pagination.totalPages > 1" :page="currentPage" :total="pagination.totalElements" :sibling-count="1" show-edges
                :items-per-page="pagination.size" @update:page="handlePageChange">
                <PaginationContent v-slot="{ items }" class="flex items-center gap-1">
                    <PaginationFirst class="h-9 w-9" @click="handlePageChange(1)" :disabled="currentPage === 1">
                        <ChevronsLeft class="h-4 w-4" />
                    </PaginationFirst>
                    <PaginationPrevious class="h-9 w-9" @click="handlePageChange(currentPage - 1)" :disabled="!pagination.hasPrev">
                        <ChevronLeft class="h-4 w-4" />
                    </PaginationPrevious>

                    <template v-for="(item, index) in items">
                        <PaginationItem v-if="item.type === 'page'" :key="index" :value="item.value" as-child>
                            <Button class="w-9 h-9 p-0 text-sm cursor-pointer" :variant="item.value === currentPage ? 'default' : 'outline'"
                                :class="item.value === currentPage ? 'bg-blue-600 hover:bg-blue-700' : 'text-slate-600 border-slate-200 hover:bg-slate-50'"
                                @click="handlePageChange(item.value)">
                                {{ item.value }}
                            </Button>
                        </PaginationItem>
                        <PaginationEllipsis v-else :key="item.type" :index="index" />
                    </template>

                    <PaginationNext class="h-9 w-9" @click="handlePageChange(currentPage + 1)" :disabled="!pagination.hasNext">
                        <ChevronRight class="h-4 w-4" />
                    </PaginationNext>
                    <PaginationLast class="h-9 w-9" @click="handlePageChange(pagination.totalPages)"
                        :disabled="currentPage === pagination.totalPages">
                        <ChevronsRight class="h-4 w-4" />
                    </PaginationLast>
                </PaginationContent>
            </Pagination>

            <!-- Page Size Selector -->
            <div class="flex items-center gap-2">
                <Select :model-value="String(pagination.size)" @update:model-value="handleSizeChange">
                    <SelectTrigger class="w-[110px] h-9 text-sm bg-white border-slate-200">
                        <SelectValue placeholder="Size" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="10">10 / page</SelectItem>
                        <SelectItem value="20">20 / page</SelectItem>
                        <SelectItem value="50">50 / page</SelectItem>
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
    if (page < 0 || page > props.pagination.totalPages) return
    if (page === currentPage.value) return

    emit('change-page', page - 1)
}

const handleSizeChange = (value: any) => {
    if (value) {
        emit('update:size', Number(value))
    }
}
</script>
