import { nextTick, type InjectionKey } from 'vue'

/**
 * Makes the verdict console visible, for a layout that can hide it (the mobile Problem | Code switch keeps it in
 * the Code view). The problem page provides it; without a provider the console is always visible.
 */
export type ShowConsole = () => void
export const SHOW_CONSOLE: InjectionKey<ShowConsole> = Symbol('showConsole')

/** The verdict toast's View: show the console first, then scroll to it once the DOM has caught up. */
export async function revealConsole(show: ShowConsole | undefined, el: () => HTMLElement | null): Promise<void> {
  show?.()
  await nextTick()
  el()?.scrollIntoView({ block: 'nearest' })
}
