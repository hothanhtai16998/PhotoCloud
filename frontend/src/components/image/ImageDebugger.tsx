
import { useEffect, useState } from 'react';

interface ImageDebuggerProps {
  imageUrl?: string;
  thumbnailUrl?: string;
  smallUrl?: string;
  imageId: string;
}

export const ImageDebugger = ({
  imageUrl,
  thumbnailUrl,
  smallUrl,
  imageId,
}: ImageDebuggerProps) => {
  const [debugInfo, setDebugInfo] = useState<{
    imageUrlStatus: string;
    thumbnailUrlStatus: string;
    smallUrlStatus: string;
    error?: string;
  }>({
    imageUrlStatus: 'checking...',
    thumbnailUrlStatus: 'checking...',
    smallUrlStatus: 'checking...',
  });

  useEffect(() => {
    const checkImageUrl = async (url: string | undefined, name: string) => {
      if (!url) return `${name}: No URL provided`;

      try {
        const response = await fetch(url, { method: 'HEAD' });
        return `${name}: ${response.status} ${response.statusText}`;
      } catch (error) {
        return `${name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    };

    const checkAll = async () => {
      const [imageStatus, thumbStatus, smallStatus] = await Promise.all([
        checkImageUrl(imageUrl, 'imageUrl'),
        checkImageUrl(thumbnailUrl, 'thumbnailUrl'),
        checkImageUrl(smallUrl, 'smallUrl'),
      ]);

      setDebugInfo({
        imageUrlStatus: imageStatus,
        thumbnailUrlStatus: thumbStatus,
        smallUrlStatus: smallStatus,
      });
    };

    checkAll();
  }, [imageUrl, thumbnailUrl, smallUrl]);

  if (process.env.NODE_ENV !== 'development') return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 10,
        right: 10,
        background: '#000',
        color: '#0f0',
        padding: '10px',
        fontSize: '10px',
        fontFamily: 'monospace',
        maxWidth: '300px',
        zIndex: 9999,
        borderRadius: '4px',
        maxHeight: '200px',
        overflow: 'auto',
      }}
    >
      <div>ID: {imageId}</div>
      <div>{debugInfo.imageUrlStatus}</div>
      <div>{debugInfo.thumbnailUrlStatus}</div>
      <div>{debugInfo.smallUrlStatus}</div>
    </div>
  );
};
