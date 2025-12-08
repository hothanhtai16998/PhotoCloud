
import './ImageSkeleton.css';

interface ImageSkeletonProps {
  className?: string;
}

export const ImageSkeleton = ({ className = '' }: ImageSkeletonProps) => {
  return (
    <div className={`image-skeleton ${className}`}>
      <div className="skeleton-shimmer"></div>
    </div>
  );
};

export default ImageSkeleton;
