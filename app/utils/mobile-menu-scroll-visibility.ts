export const MOBILE_MENU_SCROLL_IDLE_MS = 160

export type MobileMenuTriggerVisibility =
  | 'visible'
  | 'hidden-during-scroll'
  | 'forced-visible'

export function hasActualScrollDelta(
  previousScrollY: number,
  nextScrollY: number,
): boolean {
  return Math.abs(nextScrollY - previousScrollY) >= 1
}

export function resolveMobileMenuTriggerVisibility(
  menuOpen: boolean,
  scrolling: boolean,
): MobileMenuTriggerVisibility {
  if (menuOpen) return 'forced-visible'
  return scrolling ? 'hidden-during-scroll' : 'visible'
}
