<template>
    <Card>
        <CardContent class="p-0">
            <Table>
                <TableHeader>
                    <TableRow class="bg-slate-50 hover:bg-slate-50">
                        <TableHead class="w-[100px]">ID</TableHead>
                        <TableHead>When</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Time</TableHead>
                        <TableHead>Memory</TableHead>
                        <TableHead>Language</TableHead>
                        <TableHead>Author</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    <TableRow v-for="i in 5" :key="i">
                        <TableCell class="font-mono text-slate-500">#{{ 123456 + i }}</TableCell>
                        <TableCell class="text-slate-500">2 mins ago</TableCell>
                        <TableCell>
                            <Badge class="bg-emerald-500 hover:bg-emerald-600 border-0 rounded-md">Accepted</Badge>
                        </TableCell>
                        <TableCell class="text-slate-500">12ms</TableCell>
                        <TableCell class="text-slate-500">1280KB</TableCell>
                        <TableCell class="text-slate-500">C++</TableCell>
                        <TableCell class="text-blue-600 font-medium">user{{ i }}</TableCell>
                    </TableRow>
                </TableBody>
            </Table>
        </CardContent>
    </Card>
</template>

<script setup lang="ts">
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
</script>
