import type { User } from './user';

export interface Slide {
	id: string;
	title: string;
	uploadedBy: User;
	backgroundImage: string;
	location?: string;
	cameraModel?: string;
	category?: string | { name: string };
	createdAt?: string;
	isPortrait?: boolean;
	isFirstSlide?: boolean;
}
