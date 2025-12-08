import { useEffect, useRef, useState } from 'react';
import './VideoPlayer.css';

interface VideoPlayerProps {
  src: string;
  thumbnail?: string;
  alt?: string;
  className?: string;
  autoplay?: boolean;
  loop?: boolean;
  muted?: boolean;
  playsInline?: boolean;
  onLoad?: () => void;
}

/**
 * VideoPlayer component with IntersectionObserver for auto-pause when not visible
 * Saves CPU, memory, and battery by pausing videos outside viewport
 */
export function VideoPlayer({
  src,
  thumbnail,
  alt = 'Video',
  className = '',
  autoplay = true,
  loop = true,
  muted = true,
  playsInline = true,
  onLoad,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isIntersecting, setIsIntersecting] = useState(false);

  // IntersectionObserver to pause video when not visible
  useEffect(() => {
    const video = videoRef.current;
    const container = containerRef.current;
    
    if (!video || !container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const isVisible = entry.isIntersecting;
          setIsIntersecting(isVisible);

          if (isVisible) {
            // Video is visible - play if autoplay is enabled
            if (autoplay && muted) {
              video.play().catch((err) => {
                // Autoplay may fail in some browsers
                console.warn('Autoplay failed:', err);
              });
              setIsPlaying(true);
            }
          } else {
            // Video is not visible - pause to save resources
            video.pause();
            setIsPlaying(false);
          }
        });
      },
      {
        rootMargin: '50px', // Start loading 50px before entering viewport
        threshold: 0.1, // Trigger when 10% of video is visible
      }
    );

    observer.observe(container);

    return () => {
      observer.disconnect();
    };
  }, [autoplay, muted]);

  // Handle video load
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedData = () => {
      if (onLoad) {
        onLoad();
      }
    };

    video.addEventListener('loadeddata', handleLoadedData);

    return () => {
      video.removeEventListener('loadeddata', handleLoadedData);
    };
  }, [onLoad]);

  // Handle play/pause on user interaction
  const handlePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play();
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  return (
    <div ref={containerRef} className={`video-player-container ${className}`}>
      <video
        ref={videoRef}
        src={src}
        poster={thumbnail}
        loop={loop}
        muted={muted}
        playsInline={playsInline}
        className="video-player"
        preload="metadata"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onClick={handlePlayPause}
        aria-label={alt}
      />
      {!isPlaying && isIntersecting && (
        <div className="video-play-overlay" onClick={handlePlayPause}>
          <svg
            width="64"
            height="64"
            viewBox="0 0 64 64"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="video-play-button"
          >
            <circle cx="32" cy="32" r="32" fill="rgba(0, 0, 0, 0.6)" />
            <path
              d="M24 20L44 32L24 44V20Z"
              fill="white"
            />
          </svg>
        </div>
      )}
    </div>
  );
}

