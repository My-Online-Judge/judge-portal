import type { VariantProps } from "class-variance-authority"
import { cva } from "class-variance-authority"

export { default as Badge } from "./Badge.vue"

const neutral = "border-border bg-muted text-foreground"
const primary = "border-transparent bg-primary-soft text-info-ink"
const danger = "border-transparent bg-destructive-soft text-destructive-ink"

export const badgeVariants = cva(
  "inline-flex h-[22px] items-center justify-center rounded-md border px-2 text-xs font-medium leading-none w-fit whitespace-nowrap shrink-0 [&>svg]:size-[13px] gap-[5px] [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 aria-invalid:border-destructive transition-[color,box-shadow] overflow-hidden",
  {
    variants: {
      variant: {
        neutral,
        primary,
        success: "border-transparent bg-success-soft text-success-ink",
        warning: "border-transparent bg-warning-soft text-warning-ink",
        danger,
        outline: "border-input bg-transparent text-foreground",
        mono: "border-border bg-muted font-mono text-[11.5px] text-foreground",
        // Aliases kept for existing call sites.
        default: primary,
        secondary: neutral,
        destructive: danger,
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  },
)
export type BadgeVariants = VariantProps<typeof badgeVariants>
