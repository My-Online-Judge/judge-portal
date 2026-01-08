<template>
    <div class="space-y-6">
        <Tabs default-value="description" class="w-full">
            <Card>
                <CardHeader class="px-6 pb-0 space-y-4 border-b">
                    <!-- Header Info -->
                    <ProblemHeader :problem="problem" />

                    <!-- Tabs Navigation -->
                    <TabsList class="w-full justify-start rounded-none bg-transparent p-0 -mb-px">
                        <TabsTrigger value="description"
                            class="rounded-none border-b-2 border-transparent px-4 py-2 text-slate-600 hover:text-slate-900 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 data-[state=active]:shadow-none">
                            Problem
                        </TabsTrigger>
                        <TabsTrigger value="submit"
                            class="rounded-none border-b-2 border-transparent px-4 py-2 text-slate-600 hover:text-slate-900 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 data-[state=active]:shadow-none">
                            Submit
                        </TabsTrigger>
                        <TabsTrigger value="submissions"
                            class="rounded-none border-b-2 border-transparent px-4 py-2 text-slate-600 hover:text-slate-900 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 data-[state=active]:shadow-none">
                            Submissions
                        </TabsTrigger>
                    </TabsList>
                </CardHeader>

                <CardContent>
                    <div class="grid grid-cols-1 lg:grid-cols-[9.5fr_2.5fr] gap-6">
                        <!-- Left Column -->
                        <div>
                            <!-- Tab: Description -->
                            <TabsContent value="description" class="space-y-6 mt-0">
                                <ProblemDescription :problem="problem" />
                            </TabsContent>

                            <!-- Tab: Submit -->
                            <TabsContent value="submit" class="mt-0">
                                <ProblemSubmit />
                            </TabsContent>

                            <!-- Tab: Submissions -->
                            <TabsContent value="submissions" class="mt-0">
                                <ProblemSubmissions />
                            </TabsContent>
                        </div>

                        <!-- Sidebar -->
                        <ProblemSidebar :problem="problem" />
                    </div>
                </CardContent>
            </Card>
        </Tabs>
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import ProblemHeader from '@/components/problem/detail/ProblemHeader.vue'
import ProblemDescription from '@/components/problem/detail/ProblemDescription.vue'
import ProblemSubmit from '@/components/problem/detail/ProblemSubmit.vue'
import ProblemSubmissions from '@/components/problem/detail/ProblemSubmissions.vue'
import ProblemSidebar from '@/components/problem/detail/ProblemSidebar.vue'

// Mock Data (simulating data passed from list or fetched)
const problem = ref({
    id: 1,
    title: 'Simple A + B Problem',
    timeLimit: 1000,
    memoryLimit: 32,
    createdBy: 'root',
    level: 'Easy',
    total: 9717,
    acRate: 47.9,
    description: `Calculate the sum of two integers and output the result.<br>Be careful not to have unnecessary output, such as "Please enter the values of a and b". See the hidden part for sample code.`,
    inputDesc: `Two integers separated by spaces.`,
    outputDesc: `Sum of two numbers.`,
    sampleInput: `1 1`,
    sampleOutput: `2`,
    hint: `#include <stdio.h>\nint main() {\n    int a, b;\n    scanf("%d%d", &a, &b);\n    printf("%d\\n", a+b);\n    return 0;\n}`
})
</script>
