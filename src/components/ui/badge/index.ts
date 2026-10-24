import type { VariantProps } from "class-variance-authority"
import { cva } from "class-variance-authority"

export { default as Badge } from "./Badge.vue"

// Text first: a hairline, no fill, the label carries the meaning. Colour is spent on verdicts and on the primary badge only.
const plain = "border-border bg-transparent text-ink-2"
const primary = "border-transparent bg-primary-soft text-info-ink"

export const badgeVariants = cva(
  "inline-flex h-[22px] items-center justify-center rounded-sm border px-1.5 text-xs font-medium leading-none w-fit whitespace-nowrap shrink-0 [&>svg]:size-[13px] gap-[5px] [&>svg]:pointer-events-none aria-invalid:border-destructive transition-[color,border-color] overflow-hidden",
  {
    variants: {
      variant: {
        neutral: plain,
        primary,
        success: plain,
        warning: plain,
        danger: plain,
        outline: plain,
        mono: `${plain} font-mono`,
        // Aliases kept for existing call sites.
        default: primary,
        secondary: plain,
        destructive: plain,
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  },
)
export type BadgeVariants = VariantProps<typeof badgeVariants>
