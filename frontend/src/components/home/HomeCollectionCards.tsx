import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Images } from 'lucide-react';
import type { HeroCollection } from '@/services/heroService';
import { collectionService } from '@/services/collectionService';
import { collectionCaption } from './homeGuideFacts';

function imageSource(value: unknown): string {
  if (!value || typeof value !== 'object') return '';
  for (const key of ['regularUrl', 'smallUrl', 'thumbnailUrl', 'imageUrl', 'url']) {
    if (key in value) { const source = Reflect.get(value, key); if (typeof source === 'string' && source.trim()) return source; }
  }
  return '';
}

function CollectionCard({ collection, active, select }: { collection: HeroCollection; active: boolean; select: () => void }) {
  const element = useRef<HTMLElement>(null);
  const initial = imageSource(collection.coverImage) || collection.sampleImages?.map(imageSource).find(Boolean) || '';
  const [cover, setCover] = useState(initial);
  const [state, setState] = useState<'loading' | 'ready' | 'missing'>(initial ? 'ready' : 'loading');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (initial || !element.current) return;
    const abort = new AbortController();
    const observer = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return;
      observer.disconnect();
      void collectionService.getCollectionById(collection._id, abort.signal).then(detail => {
        if (abort.signal.aborted) return;
        const source = imageSource(detail.coverImage) || (Array.isArray(detail.images) ? detail.images.map(imageSource).find(Boolean) : '') || '';
        setCover(source); setState(source ? 'ready' : 'missing');
      }).catch(() => { if (!abort.signal.aborted) setState('missing'); });
    }, { rootMargin: '250px' });
    observer.observe(element.current);
    return () => { observer.disconnect(); abort.abort(); };
  }, [collection._id, initial, attempt]);
  return <article ref={element} className="home-collection-story" onPointerEnter={select} onFocus={select}
    data-guide-auto={active ? 'true' : undefined} data-guide-action="album" data-guide-caption={collectionCaption(collection)} data-guide-target={`/collections/${collection._id}`}>
    <Link className="home-collection-cover" to={`/collections/${collection._id}`} aria-label={`Mở bộ sưu tập ${collection.name}`}>
      {cover && state === 'ready' ? <img src={cover} alt={collection.name} loading="lazy" decoding="async" onError={() => setState('missing')} /> : <span className="home-collection-cover-empty"><Images size={30} aria-hidden="true" /><span>{state === 'loading' ? 'Đang tải ảnh bìa…' : 'Chưa có ảnh bìa hiển thị'}</span></span>}
    </Link>
    <h3>{collection.name}</h3>
    {typeof collection.imageCount === 'number' && collection.imageCount >= 0 && <p className="home-collection-count">{collection.imageCount} ảnh trong bộ sưu tập</p>}
    {collection.description && <p>{collection.description}</p>}
    <Link className="home-story-link home-collection-open" to={`/collections/${collection._id}`}>Mở bộ sưu tập này<ArrowUpRight size={17} /></Link>
    {state === 'missing' && !initial && <button type="button" className="home-story-link" onClick={() => { setState('loading'); setAttempt(value => value + 1); }}>Thử tải ảnh bìa</button>}
  </article>;
}

export function HomeCollectionCards({ collections }: { collections: HeroCollection[] }) {
  const [selected, setSelected] = useState<string | null>(null);
  const visible = collections.slice(0, 2);
  return <div className="home-collection-cards">{visible.map((collection, index) => <CollectionCard key={collection._id} collection={collection} active={visible.some(item => item._id === selected) ? selected === collection._id : index === 0} select={() => setSelected(collection._id)} />)}</div>;
}
