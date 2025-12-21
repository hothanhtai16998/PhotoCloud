import { useState, useEffect } from 'react';
import type { User } from '@/types/user';

interface AvatarProps {
  user: User | { username?: string; displayName?: string; avatarUrl?: string } | null | undefined;
  size?: number | string;
  className?: string;
  fallbackClassName?: string;
  showName?: boolean;
}

export function Avatar({
  user,
  size = 32,
  className = '',
  fallbackClassName = '',
  showName = false,
}: AvatarProps) {
  // Handle null/undefined user
  const userObj = user || {};
  const displayName = 'displayName' in userObj ? userObj.displayName : undefined;
  const username = 'username' in userObj ? userObj.username : undefined;
  const avatarUrl = 'avatarUrl' in userObj ? userObj.avatarUrl : undefined;

  const initials = (
    displayName?.trim() || username || 'U'
  ).charAt(0).toUpperCase();

  const sizeStyle =
    typeof size === 'number' ? { width: size, height: size } : {};

  // Avatar images are stored at 200x200 but displayed at smaller sizes
  // Add explicit width/height to prevent layout shift (CLS)
  const numericSize = typeof size === 'number' ? size : (typeof size === 'string' ? parseInt(size, 10) : undefined);
  const displaySize = numericSize || 32;
  
  // Use state to handle image load errors and fallback to placeholder
  const [imageError, setImageError] = useState(false);

  // Reset error state when avatarUrl changes
  useEffect(() => {
    if (avatarUrl) {
      setImageError(false);
    }
  }, [avatarUrl]);

  return (
    <div className={`avatar-container ${className}`}>
      {avatarUrl && !imageError ? (
        <img
          src={avatarUrl}
          alt={displayName || username || 'User'}
          className={`avatar-image ${className}`}
          width={displaySize}
          height={displaySize}
          style={sizeStyle}
          onError={() => {
            // Fallback to placeholder if image fails to load
            setImageError(true);
          }}
        />
      ) : (
        <div
          className={`avatar-placeholder ${fallbackClassName || className}`}
          style={sizeStyle}
        >
          {initials}
        </div>
      )}
      {showName && (
        <span className="avatar-name">
          {displayName?.trim() || username}
        </span>
      )}
    </div>
  );
}

