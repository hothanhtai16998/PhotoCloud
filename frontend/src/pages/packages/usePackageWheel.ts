import { useEffect, useRef, type RefObject } from 'react';

/** Own the visible stage's wheel range, including fast entry from either side. */
export function usePackageWheel(ref: RefObject<HTMLDivElement | null>, index: number, count: number, select: (index: number) => void) {
    const gesture = useRef({ delta: 0, lastInput: 0, unlockAt: 0 });
    useEffect(() => {
        const stage = ref.current;
        if (!stage || count < 2) return;
        const wheel = (event: WheelEvent) => {
            const target = event.target;
            if (!(target instanceof Element) || target.closest('[role="dialog"], input, textarea, select')) return;
            if (event.ctrlKey || event.metaKey || event.shiftKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
            if (innerWidth < 900 || innerHeight < 700 || stage.offsetHeight > innerHeight - 130 || event.deltaY === 0) return;
            const rect = stage.getBoundingClientRect();
            const anchor = 112;
            const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? innerHeight : 1);
            const direction = Math.sign(delta);
            const crossesAnchor = direction > 0
                ? rect.top > anchor && rect.top - delta <= anchor
                : rect.top < anchor && rect.top - delta >= anchor;
            const nearAnchor = Math.abs(rect.top - anchor) <= 5;
            const overVisibleStage = stage.contains(target) && rect.top < innerHeight * .65 && rect.bottom > innerHeight * .4;
            if (!crossesAnchor && !nearAnchor && !overVisibleStage) return;
            const state = gesture.current;
            const now = performance.now();
            const gap = now - state.lastInput;
            state.lastInput = now;
            // Capture the whole entry gesture, even if it would jump past the stage.
            const entering = (direction > 0 && rect.top > anchor + 5) || (direction < 0 && rect.top < anchor - 5);
            if (entering) {
                event.preventDefault();
                scrollTo({
                    top: Math.max(0, scrollY + rect.top - anchor),
                    behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
                });
                state.delta = 0;
                state.unlockAt = now + 550;
                select(direction > 0 ? 0 : count - 1);
                return;
            }
            if (now < state.unlockAt && gap < 180) {
                event.preventDefault();
                return;
            }
            const next = index + direction;
            if (next < 0 || next >= count) {
                state.delta = 0;
                return;
            }
            event.preventDefault();
            if (now < state.unlockAt) return;
            if (gap > 180 || Math.sign(state.delta) !== direction) state.delta = 0;
            state.delta += delta;
            if (Math.abs(state.delta) < 60) return;
            state.delta = 0;
            state.unlockAt = now + 380;
            select(next);
        };
        window.addEventListener('wheel', wheel, { passive: false });
        return () => window.removeEventListener('wheel', wheel);
    }, [ref, index, count, select]);
}
