<template>
    <div class="flex flex-col gap-4 py-4 sm:flex-row sm:items-center border-t border-slate-200 sm:justify-between mt-2">
        <!-- Results Text -->
        <p class="text-sm text-slate-500 font-medium">
            Showing 1 to 10 of 97 results
        </p>

        <div class="flex items-center gap-4">
            <!-- Pagination Controls -->
            <Pagination v-slot="{ page }" :total="100" :sibling-count="1" show-edges :default-page="1" :items-per-page="10">
                <PaginationContent v-slot="{ items }" class="flex items-center gap-1">
                    <PaginationFirst class="h-9 w-9">
                        <ChevronsLeft class="h-4 w-4" />
                    </PaginationFirst>
                    <PaginationPrevious class="h-9 w-9">
                        <ChevronLeft class="h-4 w-4" />
                    </PaginationPrevious>

                    <template v-for="(item, index) in items">
                        <PaginationItem v-if="item.type === 'page'" :key="index" :value="item.value" as-child>
                            <Button class="w-9 h-9 p-0 text-sm cursor-pointer" :variant="item.value === page ? 'default' : 'outline'"
                                :class="item.value === page ? 'bg-blue-600 hover:bg-blue-700' : 'text-slate-600 border-slate-200 hover:bg-slate-50'">
                                {{ item.value }}
                            </Button>
                        </PaginationItem>
                        <PaginationEllipsis v-else :key="item.type" :index="index" />
                    </template>

                    <PaginationNext class="h-9 w-9">
                        <ChevronRight class="h-4 w-4" />
                    </PaginationNext>
                    <PaginationLast class="h-9 w-9">
                        <ChevronsRight class="h-4 w-4" />
                    </PaginationLast>
                </PaginationContent>
            </Pagination>

            <!-- Page Size Selector -->
            <div class="flex items-center gap-2">
                <Select default-value="10">
                    <SelectTrigger class="w-[110px] h-9 text-sm bg-white border-slate-200">
                        <SelectValue placeholder="10 / page" />
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
</script>
