import { useEffect, useState } from 'react';
import { getHeroCollections, type HeroCollection } from '@/services/heroService';

export type HomeCollectionsState = {
  collections: HeroCollection[];
  isAdminPicked: boolean;
  loading: boolean;
  error: boolean;
  retry: () => void;
};

/** Homepage owns one request shared by the hero and the collection story. */
export function useHomeCollections(enabled: boolean): HomeCollectionsState {
  const [result, setResult] = useState<Omit<HomeCollectionsState, 'retry'>>({ collections: [], isAdminPicked: false, loading: true, error: false });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    void getHeroCollections().then(response => {
      if (!cancelled) setResult({ collections: response.collections || [], isAdminPicked: Boolean(response.isAdminPicked), loading: false, error: false });
    }).catch(() => { if (!cancelled) setResult(value => ({ ...value, loading: false, error: true })); });
    return () => { cancelled = true; };
  }, [enabled, attempt]);
  return { ...result, retry: () => {
    setResult(value => ({ ...value, loading: true, error: false }));
    setAttempt(value => value + 1);
  } };
}
