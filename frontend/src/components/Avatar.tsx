import type { User } from '@/types/user';

interface AvatarProps {
  user: User | { username?: string; displayName?: string; avatarUrl?: string };
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
  const displayName = 'displayName' in user ? user.displayName : undefined;
  const username = 'username' in user ? user.username : undefined;
  const avatarUrl = 'avatarUrl' in user ? user.avatarUrl : undefined;

  const initials = (
    displayName?.trim() || username || 'U'
  ).charAt(0).toUpperCase();

  const sizeStyle =
    typeof size === 'number' ? { width: size, height: size } : {};

  return (
    <div className={`avatar-container ${className}`}>
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={displayName || username || 'User'}
          className={`avatar-image ${className}`}
          style={sizeStyle}
          onError={(e) => {
            // Hide avatar if it fails to load
            e.currentTarget.style.display = 'none';
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

