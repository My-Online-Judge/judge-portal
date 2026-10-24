<script setup lang="ts">
import { SplitterResizeHandle } from 'reka-ui'
</script>

<template>
    <!-- The gap between two workspace cards is the drag target. A short grip sits in it, darker on hover and drag
         (reka's data-state) and ringed on keyboard focus; reka keeps the arrow, Home and End keys. -->
    <SplitterResizeHandle
        class="group/gap relative flex shrink-0 items-center justify-center outline-none data-[orientation=horizontal]:w-2.5 data-[orientation=horizontal]:cursor-col-resize data-[orientation=vertical]:h-2.5 data-[orientation=vertical]:cursor-row-resize">
        <span aria-hidden="true"
            class="rounded-full bg-border transition-colors group-hover/gap:bg-input group-focus-visible/gap:bg-ring group-data-[orientation=horizontal]/gap:h-8 group-data-[orientation=horizontal]/gap:w-[3px] group-data-[orientation=vertical]/gap:h-[3px] group-data-[orientation=vertical]/gap:w-8 group-data-[state=drag]/gap:bg-primary motion-reduce:transition-none" />
    </SplitterResizeHandle>
</template>
