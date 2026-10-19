import type { Component } from 'vue'

export interface RowAction {
  label: string
  icon: Component
  onSelect: () => void
  destructive?: boolean
  disabled?: boolean
}
