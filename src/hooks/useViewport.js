import { useSyncExternalStore } from 'react'

function subscribe(cb) {
  window.addEventListener('resize', cb)
  return () => window.removeEventListener('resize', cb)
}
function getSnapshot() { return window.innerWidth }
function getServerSnapshot() { return 1280 }

export function useViewport() {
  const w = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  return {
    w,
    isMobile: w < 700,
    isTablet: w >= 700 && w < 1024,
    isDesktop: w >= 1024,
    narrow: w < 1024,
  }
}
