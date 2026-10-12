import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { imageService } from '@/services/imageService';
import type { Image } from '@/types/image';

export interface SlideData {
	id: string;
	title: string;
    author?: string;
    category?: string;
	image: string; // Low quality for initial display
	fullImage: string; // High quality for upgrade
	highQualityUrl?: string; // Optional legacy upgrade URL
	width: number;
	height: number;
	imageInfo?: {
		location?: string;
		cameraModel?: string;
		cameraMake?: string;
		focalLength?: string;
		aperture?: string;
		shutterSpeed?: string;
		iso?: number;
	};
}


// Use the display-sized variant for navigation; originals are reserved for zoom.
function toSlides(images: Image[]): SlideData[] {
  return images.filter(img =>
    Number.isFinite(img.width) && img.width > 0 &&
    Number.isFinite(img.height) && img.height > 0
  ).map(img => ({
    id: img._id,
    author: img.uploadedBy?.username,
    category: (typeof img.imageCategory === 'string' ? img.imageCategory : img.imageCategory?.name) || 'Khám phá',
    title: img.imageTitle || (typeof img.imageCategory === 'string' ? img.imageCategory : img.imageCategory?.name) || 'Image',
    image: img.regularAvifUrl || img.regularUrl || img.smallAvifUrl || img.smallUrl || img.imageAvifUrl || img.imageUrl || '',
    fullImage: img.imageAvifUrl || img.imageUrl || img.regularAvifUrl || img.regularUrl || img.smallUrl || '',
    width: img.width,
    height: img.height,
  }));
}

// PHOTOCLOUD-style: 15 minutes stale threshold (slider changes less frequently)
const STALE_THRESHOLD = 15 * 60 * 1000; // 15 minutes

export interface SliderState {
	slides: SlideData[];
	loading: boolean;
	hasLoaded: boolean;
	lastFetchedAt: number | null;
	fetchSlides: (signal?: AbortSignal) => Promise<void>;
	resetLoading: () => void;
	clearSlides: () => void;
	checkAndRefreshIfStale: (signal?: AbortSignal) => Promise<void>;
}

export const useSliderStore = create(
	immer<SliderState>((set, get) => ({
		slides: [],
		loading: false,
		hasLoaded: false,
		lastFetchedAt: null,

		fetchSlides: async (signal?: AbortSignal) => {
			const currentState = get();
			
			// Set loading if we have no slides (simple - same as NoFlashGrid pattern)
			if (currentState.slides.length === 0) {
				set((state) => {
					state.loading = true;
				});
			}

			try {
				const response = await imageService.fetchImages({ 
					limit: 10, // Fetch 10 images for the slider
					_refresh: true 
				}, signal);
				
				// Check if request was aborted after fetch completes
				if (signal?.aborted) {
					return;
				}
				
				const slideData = toSlides(response.images || []);

				// Check again if aborted before updating state
				if (signal?.aborted) {
					return;
				}
				
				set((state) => {
					state.slides = slideData;
					state.hasLoaded = true;
					state.lastFetchedAt = Date.now();
					state.loading = false;
				});
			} catch (error: unknown) {
				// Ignore abort/cancellation errors (expected when component unmounts)
				if (
					(error instanceof Error && (error.name === 'AbortError' || error.name === 'CanceledError')) ||
					(error && typeof error === 'object' && 'code' in error && error.code === 'ERR_CANCELED') ||
					(signal?.aborted)
				) {
					// Always reset loading state on abort to prevent stuck spinner
					// This is critical for rapid refresh scenarios
					set((state) => {
						state.loading = false;
					});
					return;
				}
				if (!signal?.aborted) {
					set((state) => {
						state.slides = [];
						state.loading = false;
					});
				}
			}
		},

		resetLoading: () => {
			set((state) => {
				// Only reset loading if we have slides (simple - same as NoFlashGrid pattern)
				if (state.slides.length > 0) {
					state.loading = false;
				}
			});
		},

		clearSlides: () => {
			set((state) => {
				state.slides = [];
				state.hasLoaded = false;
				state.lastFetchedAt = null;
				state.loading = false;
			});
		},

		checkAndRefreshIfStale: async (signal?: AbortSignal) => {
			const currentState = get();
			
			// Don't refresh if already loading or never loaded
			if (currentState.loading || !currentState.hasLoaded || !currentState.lastFetchedAt) {
				return;
			}
			
			// Check if data is stale (>15 minutes old for slider)
			const age = Date.now() - currentState.lastFetchedAt;
			if (age <= STALE_THRESHOLD) {
				return;
			}
			
			// Silent background refresh - no loading state
			try {
				const response = await imageService.fetchImages({ 
					limit: 10,
					_refresh: true 
				}, signal);
				
				if (signal?.aborted) return;
				const slideData = toSlides(response.images || []);

				set((state) => {
					state.slides = slideData;
					state.lastFetchedAt = Date.now();
					// Don't set loading - this is a silent background refresh
				});
			} catch (error: unknown) {
				// Ignore abort/cancellation errors
				if (
					(error instanceof Error && (error.name === 'AbortError' || error.name === 'CanceledError')) ||
					(error && typeof error === 'object' && 'code' in error && error.code === 'ERR_CANCELED') ||
					(signal?.aborted)
				) {
					return;
				}
				// Silent fail - keep showing cached data
			}
		},
	}))
);

