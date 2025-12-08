import type { User } from './user';
import type { Category } from './category';
import type { Coordinates } from './common';

export interface Image {
  _id: string;
  imageTitle?: string;
  description?: string;
  imageUrl: string;
  width: number;
  height: number;
  // Multiple image sizes for progressive loading (like Unsplash)
  base64Thumbnail?: string; // Tiny base64 BMP (20x20px) for instant blur-up - data:image/bmp;base64,...
  thumbnailUrl?: string; // Small thumbnail for blur-up effect - WebP
  smallUrl?: string; // Small size for grid view - WebP
  regularUrl?: string; // Regular size for detail view - WebP
  // AVIF versions for better compression (modern browsers)
  thumbnailAvifUrl?: string; // Small thumbnail - AVIF
  smallAvifUrl?: string; // Small size - AVIF
  regularAvifUrl?: string; // Regular size - AVIF
  imageAvifUrl?: string; // Original - AVIF
  // Video support (for converted GIFs and direct video uploads)
  isVideo?: boolean; // True if this is a video file
  videoUrl?: string; // URL to video file (MP4/WebM)
  videoThumbnail?: string; // Thumbnail image for video preview
  videoDuration?: number; // Video duration in seconds
  // imageCategory can be a string (legacy) or populated Category object
  imageCategory: string | Category;
  uploadedBy: User & { avatarUrl?: string };
  location?: string;
  coordinates?: Coordinates;
  cameraModel?: string;
  // EXIF metadata
  cameraMake?: string; // Camera manufacturer (e.g., "Canon", "Nikon")
  focalLength?: number; // Focal length in mm (e.g., 60.0)
  aperture?: number; // Aperture f-stop (e.g., 9.0)
  shutterSpeed?: string; // Shutter speed (e.g., "1/80", "2s")
  iso?: number; // ISO sensitivity (e.g., 100)
  dominantColors?: string[]; // Array of color names: 'red', 'orange', 'yellow', etc.
  tags?: string[]; // Array of tag strings for searchability
  views?: number;
  downloads?: number;
  // Daily views and downloads tracking (date string as key: "YYYY-MM-DD")
  dailyViews?: Record<string, number>;
  dailyDownloads?: Record<string, number>;
  // Moderation status
  isModerated?: boolean;
  moderationStatus?: 'pending' | 'approved' | 'rejected' | 'flagged';
  moderatedAt?: string;
  moderationNotes?: string;
  createdAt: string;
  updatedAt: string;
}

// API Request/Response Types
export interface FetchImagesParams {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  location?: string;
  color?: string;
  tag?: string;
  _refresh?: boolean;
}

export interface FetchImagesResponse {
  images: Image[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface PreUploadResponse {
  message: string;
  uploadId: string;
  uploadKey: string;
  uploadUrl: string;
  expiresIn: number;
  maxFileSize: number;
}

export interface FinalizeImageData {
  uploadId: string;
  uploadKey: string;
  imageTitle?: string; // Optional - normal users can upload without title
  imageCategory?: string; // Optional - normal users can upload without category (admin adds later)
  location?: string;
  coordinates?: Coordinates;
  cameraModel?: string;
  tags?: string[];
}

export interface FinalizeImageResponse {
  message: string;
  image: Image;
}

export interface IncrementViewResponse {
  views: number;
  dailyViews: Record<string, number>;
}

export interface IncrementDownloadResponse {
  downloads: number;
  dailyDownloads: Record<string, number>;
}

export interface FetchLocationsResponse {
  locations: string[];
}
