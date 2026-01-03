<template>
  <div class="p-6">
    <Card>
      <CardHeader>
        <CardTitle>Hello shadcn-vue!</CardTitle>
      </CardHeader>
      <CardContent>
        <Button variant="default" @click="increment" class="bg-blue-500 hover:bg-blue-600">Click me</Button>
      </CardContent>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const count = ref(0)

function increment() {
  count.value++
}

watch(count, (newCount) => {
  console.log(newCount)
})
</script>