import type { Component } from 'vue'

export interface RowAction {
  label: string
  icon: Component
  onSelect: () => void
  destructive?: boolean
  disabled?: boolean
  /** Why a disabled item is disabled, shown in a tooltip and read with the item. */
  hint?: string
}
