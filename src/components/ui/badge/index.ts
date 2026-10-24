import type { VariantProps } from "class-variance-authority"
import { cva } from "class-variance-authority"

export { default as Badge } from "./Badge.vue"

// Text first: a hairline and no fill. The status variants keep their status ink, the primary badge keeps its accent wash,
// and everything else reads in the secondary ink.
const plain = "border-border bg-transparent text-ink-2"
const success = "border-border bg-transparent text-success-ink"
const warning = "border-border bg-transparent text-warning-ink"
const danger = "border-border bg-transparent text-destructive-ink"
const primary = "border-transparent bg-primary-soft text-info-ink"

export const badgeVariants = cva(
  "inline-flex h-[22px] items-center justify-center rounded-sm border px-1.5 text-xs font-medium leading-none w-fit whitespace-nowrap shrink-0 [&>svg]:size-[13px] gap-[5px] [&>svg]:pointer-events-none aria-invalid:border-destructive transition-[color,border-color] overflow-hidden",
  {
    variants: {
      variant: {
        neutral: plain,
        primary,
        success,
        warning,
        danger,
        outline: plain,
        mono: `${plain} font-mono`,
        // Aliases kept for existing call sites.
        default: primary,
        secondary: plain,
        destructive: danger,
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  },
)
export type BadgeVariants = VariantProps<typeof badgeVariants>
