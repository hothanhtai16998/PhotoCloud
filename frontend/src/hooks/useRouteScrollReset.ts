import { useLayoutEffect, useRef } from 'react';
import { useNavigationType, type Location } from 'react-router-dom';
import { getImagePageScroll } from '@/utils/imagePageScroll';
import {
  discardSavedScrollForOtherPath,
  hasSavedScrollFor,
  isGridScrollRestoreInProgress,
  validateModalState,
} from '@/utils/modalNavigation';

const ADMIN_PATH = '/admin';

function isAdminPath(pathname: string): boolean {
  return pathname === ADMIN_PATH || pathname.startsWith(`${ADMIN_PATH}/`);
}

/**
 * Single owner of "a freshly opened page starts at the top edge".
 *
 * Before this, the only reset lived in the mobile header sidebar, so desktop
 * header tabs kept the previous page's scroll offset. The position is kept on
 * purpose for entries that restore it themselves:
 * - Back/Forward: the history entry owns its own restore.
 * - Hash targets: the anchor owns its own position.
 * - The photo modal: its background page stays where the reader left it.
 * - A grid or photo page that saved a position for this same entry.
 */
export function useRouteScrollReset(location: Location): void {
  const navigationType = useNavigationType();
  const handledEntryRef = useRef<string | null>(null);

  useLayoutEffect(() => {
    if (handledEntryRef.current === location.key) return;
    handledEntryRef.current = location.key;
    if (navigationType === 'POP') return;
    // The admin shell locks body scroll and manages its own surface.
    if (isAdminPath(location.pathname)) return;
    if (location.hash) return;
    if (validateModalState(location.state).isValid) return;
    if (isGridScrollRestoreInProgress()) return;
    if (getImagePageScroll(location)) return;
    if (hasSavedScrollFor(location.pathname)) return;

    let frame = 0;
    const scrollToTop = (): void => {
      window.scrollTo({ top: 0, behavior: 'instant' });
    };
    // The second pass wins over browser restoration of the new entry.
    scrollToTop();
    frame = requestAnimationFrame(scrollToTop);
    // Moving to a page that never saved this grid position makes it stale.
    discardSavedScrollForOtherPath(location.pathname);
    return () => cancelAnimationFrame(frame);
  }, [location, navigationType]);
}
