import { getSessionItem } from './safeStorage';

// A visual hint, never an authorization source; no profile data is persisted.
export function getPublicChromeHint(): 'guest' | 'member' | 'manager' | 'admin' {
  const value = getSessionItem('publicChromeHint');
  return value === 'member' || value === 'manager' || value === 'admin' ? value : 'guest';
}
