<template>
  <div
    class="grid grid-cols-2 overflow-hidden rounded-xl border bg-card max-[760px]:[&>*:nth-child(even)]:border-l max-[760px]:[&>*:nth-child(n+3)]:border-t min-[761px]:grid-cols-4 min-[761px]:[&>*:not(:first-child)]:border-l [&>*]:border-border"
  >
    <slot />
  </div>
</template>
