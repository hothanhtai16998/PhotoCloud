import { useEffect, useRef, useState, type RefObject } from 'react';
import { NoFlashGrid, type NoFlashGridProps } from './NoFlashGrid/NoFlashGrid';

type Props = NoFlashGridProps & { scrollRoot: RefObject<HTMLDivElement | null> };

export function ImageRelatedGrid({ scrollRoot, ...props }: Props) {
  const sentinel = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(() => typeof IntersectionObserver === 'undefined');
  useEffect(() => {
    if (visible || !sentinel.current) return;
    // Keep below-fold card construction off the photo dialog's first commit.
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        setVisible(true);
        observer.disconnect();
      }
    }, { root: scrollRoot.current, rootMargin: '300px' });
    observer.observe(sentinel.current);
    return () => observer.disconnect();
  }, [scrollRoot, visible]);
  return <div ref={sentinel} style={{ minHeight: 400 }}>
    {visible && <NoFlashGrid {...props} />}
  </div>;
}
