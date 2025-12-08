
import { memo } from 'react';
import { Blurhash } from 'react-blurhash';
import './BlurhashPlaceholder.css';

interface BlurhashPlaceholderProps {
  hash: string;
  className?: string;
  isLoaded: boolean;
}

const BlurhashPlaceholder = ({
  hash,
  className,
  isLoaded,
}: BlurhashPlaceholderProps) => {
  if (!hash) {
    return null;
  }

  return (
    <Blurhash
      hash={hash}
      width="100%"
      height="100%"
      resolutionX={32}
      resolutionY={32}
      punch={1}
      className={`blurhash-placeholder ${className || ''} ${
        isLoaded ? 'blurhash-placeholder--loaded' : ''
      }`}
    />
  );
};

export default memo(BlurhashPlaceholder);
