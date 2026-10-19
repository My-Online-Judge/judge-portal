<template>
  <div
    class="grid grid-cols-2 overflow-hidden rounded-xl border bg-card min-[761px]:grid-cols-4 [&>*:nth-child(n+3)]:border-t [&>*:nth-child(n+3)]:border-border [&>*:nth-child(odd)]:border-l-0 min-[761px]:[&>*:nth-child(n+3)]:border-t-0 min-[761px]:[&>*:nth-child(odd)]:border-l [&>*:first-child]:border-l-0 [&>*+*]:border-l [&>*+*]:border-border"
  >
    <slot />
  </div>
</template>
