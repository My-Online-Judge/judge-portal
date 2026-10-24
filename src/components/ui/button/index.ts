import type { VariantProps } from "class-variance-authority"
import { cva } from "class-variance-authority"

export { default as Button } from "./Button.vue"

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md border border-transparent text-sm font-medium transition-[background-color,border-color,color,transform] duration-[120ms] motion-reduce:transition-none active:translate-y-px disabled:pointer-events-none disabled:opacity-55 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-primary-hover",
        destructive:
          "bg-destructive text-[var(--destructive-foreground)] hover:bg-[color-mix(in_oklch,var(--destructive)_86%,var(--foreground))] focus-visible:outline-destructive",
        secondary:
          "border-rule-2 bg-transparent text-foreground hover:bg-muted hover:border-input",
        outline:
          "border-rule-2 bg-transparent text-foreground hover:bg-muted hover:border-input",
        ghost:
          "text-ink-2 hover:bg-muted hover:text-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      // Two heights (36 and 32px). Each carries an ::after that pads the hit target to 44px. The inset counts from the
      // padding edge, so it is 1px more than the 4px (6px) of padding wanted outside the 1px border.
      size: {
        "default": "relative h-9 px-4 has-[>svg]:px-3 after:absolute after:inset-x-0 after:-inset-y-1.25",
        "sm": "relative h-8 gap-1.5 px-3 has-[>svg]:px-2.5 after:absolute after:inset-x-0 after:-inset-y-1.75",
        "lg": "relative h-9 px-4 has-[>svg]:px-3 after:absolute after:inset-x-0 after:-inset-y-1.25",
        "icon": "relative size-9 after:absolute after:inset-x-0 after:-inset-y-1.25",
        "icon-sm": "relative size-8 after:absolute after:inset-x-0 after:-inset-y-1.75",
        "icon-lg": "relative size-9 after:absolute after:inset-x-0 after:-inset-y-1.25",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
)
export type ButtonVariants = VariantProps<typeof buttonVariants>
