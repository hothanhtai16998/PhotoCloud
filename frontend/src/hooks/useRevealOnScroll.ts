import { useEffect, useRef, type RefObject } from 'react';

interface UseRevealOnScrollOptions {
  /** Threshold for IntersectionObserver (0–1). Default 0.15. */
  threshold?: number;
  /** If true, only reveal once. Default true. */
  once?: boolean;
  /** Optional root margin, e.g. "0px 0px -10% 0px". */
  rootMargin?: string;
  /** Optional delay in ms before applying the .is-revealed class. */
  delay?: number;
}

type RevealReturn<T extends HTMLElement> = [RefObject<T | null>, boolean];

/**
 * Adds a "studio-reveal" class to the target element and toggles "is-revealed"
 * when the element scrolls into view. Designed to be safe with SSR / null
 * refs and respects `prefers-reduced-motion` via CSS.
 */
export function useRevealOnScroll<T extends HTMLElement = HTMLDivElement>(
  options: UseRevealOnScrollOptions = {}
): RevealReturn<T> {
  const { threshold = 0.15, once = true, rootMargin = '0px 0px -8% 0px', delay = 0 } = options;
  const ref = useRef<T | null>(null);
  const revealedRef = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Add the base class so the CSS opacity:0 + translateY applies.
    el.classList.add('studio-reveal');

    // If user prefers reduced motion, just reveal immediately.
    const reduceMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) {
      el.classList.add('is-revealed');
      revealedRef.current = true;
      return;
    }

    if (typeof IntersectionObserver === 'undefined') {
      el.classList.add('is-revealed');
      revealedRef.current = true;
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && !revealedRef.current) {
            revealedRef.current = true;
            if (delay > 0) {
              window.setTimeout(() => el.classList.add('is-revealed'), delay);
            } else {
              el.classList.add('is-revealed');
            }
            if (once) observer.disconnect();
          } else if (!entry.isIntersecting && !once && revealedRef.current) {
            el.classList.remove('is-revealed');
            revealedRef.current = false;
          }
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(el);
    return () => observer.disconnect();
    // The hook only depends on its options; ref contents are read inside the effect.
  }, [threshold, once, rootMargin, delay]);

  return [ref, revealedRef.current];
}
