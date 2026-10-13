import { useMemo } from 'react';
import type { SlideData } from '@/stores/useSliderStore';
import { TimedCardSlider } from './TimedCardSlider';
import { ImmersiveHomeChrome } from './ImmersiveHomeChrome';

export function CardOpeningStage({slides, current, select}: {slides: SlideData[]; current: number; select: (index: number) => void; zoom: (button: HTMLButtonElement) => void; playing: boolean; togglePlaying: () => void}) {
  const cards = useMemo(() => slides.map(slide => ({place: slide.category || 'PhotoCloud', region: slide.title, title: slide.title.toUpperCase(), image: slide.image, description: slide.author ? `Ảnh của ${slide.author}` : 'Bộ sưu tập ảnh PhotoCloud'})), [slides]);
  return <><TimedCardSlider slides={cards} current={current} onActiveChange={select} /><ImmersiveHomeChrome /></>;
}
