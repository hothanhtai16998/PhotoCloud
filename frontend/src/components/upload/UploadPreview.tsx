import { useState, useEffect, useRef, memo, useMemo } from 'react';
import { X, MapPin } from 'lucide-react';
import type { ImageData } from './hooks/useImageUpload';
import { reverseGeocode, delay } from '@/utils/geocoding';
import { timingConfig } from '@/config/timingConfig';
import { t } from '@/i18n';
import './UploadPreview.css';

interface UploadPreviewProps {
  imageData: ImageData;
  index: number;
  onRemove: () => void;
  onLocationUpdate?: (location: string) => void;
  onOrientationChange?: (isPortrait: boolean) => void;
}

export const UploadPreview = memo(({ imageData, index, onRemove, onLocationUpdate, onOrientationChange }: UploadPreviewProps) => {
  const isUploading = imageData.isUploading === true;
  const uploadError = imageData.uploadError;
  const hasPreUploadData = !!imageData.preUploadData;
  const isUploaded = hasPreUploadData && !uploadError && !isUploading;

  // Memoize object URL to prevent recreation on every render
  const imageUrl = useMemo(() => {
    return URL.createObjectURL(imageData.file);
  }, [imageData.file]);

  // Cleanup object URL on unmount
  useEffect(() => {
    return () => {
      URL.revokeObjectURL(imageUrl);
    };
  }, [imageUrl]);

  // Simple overlay - show when uploading or before upload completes
  const showOverlay = isUploading || (!hasPreUploadData && !uploadError);

  // State for location input overlay - show if location already exists, otherwise start hidden
  const [showLocationInput, setShowLocationInput] = useState(!!imageData.location);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const locationInputRef = useRef<HTMLInputElement>(null);

  // Auto-detect location using geolocation API
  const handleDetectLocation = async () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by this browser');
      return;
    }

    setIsDetectingLocation(true);

    try {
      // Get GPS coordinates
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          {
            enableHighAccuracy: true,
            timeout: timingConfig.geolocation.timeoutMs,
            maximumAge: timingConfig.geolocation.maximumAgeMs,
          }
        );
      });

      const coords = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };

      // Reverse geocode coordinates to location name
      await delay(timingConfig.geocoding.rateLimitDelayMs);
      const geocodeResult = await reverseGeocode(
        coords.latitude,
        coords.longitude,
        'vi' // Vietnamese language
      );

      // Update the location
      if (onLocationUpdate && geocodeResult.location) {
        onLocationUpdate(geocodeResult.location);
      }

      setIsDetectingLocation(false);
    } catch (error) {
      setIsDetectingLocation(false);
      console.warn('Error detecting location:', error);
      alert('Không thể phát hiện vị trí. Vui lòng nhập thủ công.');
    }
  };

  // Detect image orientation and dimensions
  const [isPortrait, setIsPortrait] = useState<boolean | null>(null);
  const [_imageWidth, setImageWidth] = useState<number | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const img = imgRef.current;
    if (img && img.complete) {
      const portrait = img.naturalHeight > img.naturalWidth;
      setIsPortrait(portrait);
      // For portrait images, use actual width (capped at 440px) to avoid empty space for small images
      if (portrait) {
        setImageWidth(Math.min(img.naturalWidth, 440));
      }
      // Notify parent of orientation change
      if (onOrientationChange) {
        onOrientationChange(portrait);
      }
    }
  }, [onOrientationChange]);

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const portrait = img.naturalHeight > img.naturalWidth;
    setIsPortrait(portrait);
    // For portrait images, use actual width (capped at 440px) to avoid empty space for small images
    if (portrait) {
      setImageWidth(Math.min(img.naturalWidth, 440));
    }
    // Notify parent of orientation change
    if (onOrientationChange) {
      onOrientationChange(portrait);
    }
  };

  // Fixed width for both landscape and portrait - memoize to prevent recalculation
  const fixedWidth = useMemo(() => '420px', []);

  // Outer container - fixed width for both orientations, matches form width
  const containerStyle: React.CSSProperties = useMemo(() => ({
    position: 'relative',
    display: 'block',
    width: fixedWidth,
    margin: 0,
    marginBottom: 0,
    padding: 0,
    background: 'transparent',
  }), [fixedWidth]);

  // Image container - fixed width, natural height based on aspect ratio
  // Container should collapse to exactly image height, location button is absolutely positioned inside
  const imageContainerStyle: React.CSSProperties = useMemo(() => ({
    position: 'relative',
    display: 'block',
    width: '100%',
    background: 'transparent',
    margin: 0,
    padding: 0,
    height: 'auto', // Natural height based on image aspect ratio
    minHeight: 0, // Ensure no minimum height
    lineHeight: 0, // Remove inline spacing
    fontSize: 0, // Remove inline spacing
  }), []);

  // Image - fixed width, natural height, no padding
  const imageStyle: React.CSSProperties = useMemo(() => ({
    width: '100%',
    height: 'auto', // Natural height based on aspect ratio
    objectFit: 'contain', // Show full image without cropping
    borderRadius: '0',
    border: 'none',
    display: 'block',
    transition: 'opacity 0.3s ease',
    background: 'transparent',
    margin: 0,
    padding: 0,
    verticalAlign: 'top', // Remove inline spacing
    maxHeight: 'none', // Remove any max-height constraints
  }), []);

  return (
    <div
      style={containerStyle}
      className={isPortrait ? 'upload-preview-container-portrait' : 'upload-preview-container-landscape'}
    >
      <div style={imageContainerStyle} className="upload-image-container-wrapper">
        <img
          ref={imgRef}
          src={imageUrl}
          alt={`Preview ${index + 1}`}
          style={imageStyle}
          onLoad={handleImageLoad}
          decoding="async"
        />
        {/* Simple Overlay - shows during upload */}
        {showOverlay && (
          <>
            <div
              className="image-upload-overlay"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                // Remove backdrop-filter blur to avoid costly repaints during scroll
                background: 'rgba(0, 0, 0, 0.5)',
                borderRadius: '8px',
                zIndex: 10,
                pointerEvents: 'none',
                animation: 'fadeIn 0.2s ease'
              }}
            />
            {/* Scrolling Loader - above overlay */}
            <div
              className="upload-loader-container"
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                zIndex: 20,
                pointerEvents: 'none'
              }}
            >
              <div className="loader">
                <div className="text"><span>Loading</span></div>
                <div className="text"><span>Loading</span></div>
                <div className="text"><span>Loading</span></div>
                <div className="text"><span>Loading</span></div>
                <div className="text"><span>Loading</span></div>
                <div className="text"><span>Loading</span></div>
                <div className="text"><span>Loading</span></div>
                <div className="text"><span>Loading</span></div>
                <div className="text"><span>Loading</span></div>
                <div className="line"></div>
              </div>
            </div>
          </>
        )}
        {/* Success Indicator - Show after upload completes */}
        {isUploaded && !isUploading && (
          <div style={{
            position: 'absolute',
            top: '8px',
            left: '8px',
            background: '#10b981',
            color: 'white',
            padding: '6px 12px',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: '600',
            zIndex: 100,
            pointerEvents: 'none',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
            animation: 'fadeIn 0.3s ease'
          }}>
            ✓ Đã tải lên
          </div>
        )}
        {/* Error Indicator */}
        {uploadError && (
          <div style={{
            position: 'absolute',
            top: '8px',
            left: '8px',
            background: '#dc2626',
            color: 'white',
            padding: '4px 10px',
            borderRadius: '4px',
            fontSize: '12px',
            fontWeight: '600',
            zIndex: 100,
            pointerEvents: 'none'
          }}>
            ✗ Lỗi
          </div>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            background: 'rgba(0, 0, 0, 0.7)',
            border: 'none',
            borderRadius: '50%',
            width: '28px',
            height: '28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: 'white'
          }}
        >
          <X size={16} />
        </button>
        {/* Location Button - bottom left (shown when location input is hidden) */}
        {onLocationUpdate && !showLocationInput && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowLocationInput(true);
              // Focus input after state update
              setTimeout(() => {
                locationInputRef.current?.focus();
              }, 0);
            }}
            className="upload-location-button"
            style={{
              position: 'absolute',
              bottom: '8px',
              left: '8px',
              zIndex: 200,
              margin: 0,
              padding: 0,
            }}
          >
            <MapPin size={16} />
            <span>{t('image.locationPlaceholder')}</span>
          </button>
        )}

        {/* Location Input Overlay - appears at button position when button is clicked */}
        {onLocationUpdate && showLocationInput && (
          <div className="upload-location-input-overlay">
            <div className="upload-location-input-wrapper">
              <input
                ref={locationInputRef}
                type="text"
                value={imageData.location || ''}
                onChange={(e) => onLocationUpdate(e.target.value)}
                onBlur={() => {
                  // Hide input if empty, show button again
                  if (!imageData.location || imageData.location.trim() === '') {
                    setShowLocationInput(false);
                  }
                }}
                onClick={(e) => {
                  // Prevent click from bubbling up
                  e.stopPropagation();
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setShowLocationInput(false);
                  }
                }}
                placeholder={t('image.locationPlaceholder')}
                className="upload-location-input"
              />
              <button
                type="button"
                onMouseDown={(e) => {
                  // Prevent input blur when clicking button
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleDetectLocation();
                }}
                disabled={isDetectingLocation}
                className="upload-location-detect-button"
                title="Auto-detect location"
              >
                {isDetectingLocation ? (
                  <div className="upload-location-spinner" />
                ) : (
                  <MapPin size={16} />
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison to prevent unnecessary re-renders
  return (
    prevProps.imageData.file === nextProps.imageData.file &&
    prevProps.imageData.isUploading === nextProps.imageData.isUploading &&
    prevProps.imageData.uploadProgress === nextProps.imageData.uploadProgress &&
    prevProps.imageData.uploadError === nextProps.imageData.uploadError &&
    prevProps.imageData.preUploadData === nextProps.imageData.preUploadData &&
    prevProps.imageData.location === nextProps.imageData.location &&
    prevProps.index === nextProps.index
  );
});
