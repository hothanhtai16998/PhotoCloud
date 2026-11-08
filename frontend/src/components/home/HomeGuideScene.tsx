import type { ReactNode } from 'react';
import './HomeGuideScene.css';

/** A real column for Paper, paired with the content it introduces. */
export function HomeGuideScene({ children, enabled = true }: { children: ReactNode; enabled?: boolean }) {
  if (!enabled) return children;
  return <div className="home-guide-scene">
    <div className="home-scene-content">{children}</div>
  </div>;
}
