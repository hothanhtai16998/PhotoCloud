import { useNavigate } from 'react-router-dom';
import type { Image } from '@/types/image';
import ProgressiveImage from '@/components/ProgressiveImage';
import { generateImageSlug } from '@/lib/utils';
import { useIsMobile } from '@/hooks/useIsMobile';
import './PinnedImages.css';

interface PinnedImagesProps {
    images: Image[];
    isOwnProfile: boolean;
}

export function PinnedImages({ images }: PinnedImagesProps) {
    const navigate = useNavigate();
    const isMobile = useIsMobile();

    if (!images || images.length === 0) {
        return null;
    }

    const handleImageClick = (image: Image) => {
        if (isMobile) {
            navigate(`/photos/${generateImageSlug(image.imageTitle || '', image._id)}`, {
                state: {
                    images: images,
                    fromGrid: true
                }
            });
        } else {
            // On desktop, could open modal or navigate
            navigate(`/photos/${generateImageSlug(image.imageTitle || '', image._id)}`);
        }
    };

    return (
        <div className="pinned-images-container">
            <div className="pinned-images-grid">
                {images.slice(0, 6).map((image, index) => (
                    <div
                        key={image._id}
                        className="pinned-image-item"
                        onClick={() => handleImageClick(image)}
                        style={{ '--index': index } as React.CSSProperties}
                    >
                        <ProgressiveImage
                            src={image.imageUrl}
                            thumbnailUrl={image.thumbnailUrl}
                            smallUrl={image.smallUrl}
                            regularUrl={image.regularUrl}
                            alt={image.imageTitle || 'Pinned image'}
                            className="pinned-image"
                        />
                        <div className="pinned-image-overlay">
                            <span className="pinned-image-number">{index + 1}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

