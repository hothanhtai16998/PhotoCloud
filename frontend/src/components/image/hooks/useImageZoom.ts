import { useState, useRef, useCallback, useEffect } from 'react';

interface UseImageZoomOptions {
  minZoom?: number;
  maxZoom?: number;
  zoomStep?: number;
  doubleClickZoom?: number;
}

export type UseImageZoomReturn = ReturnType<typeof useImageZoom>;

export const useImageZoom = ({
  minZoom = 1,
  maxZoom = 5,
  zoomStep = 0.25,
  doubleClickZoom = 2,
}: UseImageZoomOptions = {}) => {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isZoomed, setIsZoomed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Reset zoom and pan when image changes
  const resetZoom = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setIsZoomed(false);
  }, []);

  // Zoom in
  const zoomIn = useCallback(() => {
    setZoom(prev => {
      const newZoom = Math.min(prev + zoomStep, maxZoom);
      setIsZoomed(newZoom > minZoom);
      return newZoom;
    });
  }, [zoomStep, maxZoom, minZoom]);

  // Zoom out
  const zoomOut = useCallback(() => {
    setZoom(prev => {
      const newZoom = Math.max(prev - zoomStep, minZoom);
      if (newZoom === minZoom) {
        resetZoom();
      } else {
        setIsZoomed(true);
      }
      return newZoom;
    });
  }, [zoomStep, minZoom, resetZoom]);

  // Set zoom level
  const setZoomLevel = useCallback((level: number) => {
    const clampedZoom = Math.max(minZoom, Math.min(level, maxZoom));
    setZoom(clampedZoom);
    setIsZoomed(clampedZoom > minZoom);
    if (clampedZoom === minZoom) {
      setPan({ x: 0, y: 0 });
    }
  }, [minZoom, maxZoom]);

  // Handle double click to zoom
  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    if (!imageRef.current || !containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const imageRect = imageRef.current.getBoundingClientRect();
    
    const clickX = e.clientX - containerRect.left;
    const clickY = e.clientY - containerRect.top;
    
    const imageX = clickX - (containerRect.width - imageRect.width) / 2;
    const imageY = clickY - (containerRect.height - imageRect.height) / 2;

    if (zoom === 1) {
      // Zoom in at click position
      setZoom(doubleClickZoom);
      setIsZoomed(true);
      setPan({
        x: -(imageX - containerRect.width / 2) * (doubleClickZoom - 1),
        y: -(imageY - containerRect.height / 2) * (doubleClickZoom - 1),
      });
    } else {
      // Reset zoom
      resetZoom();
    }
  }, [zoom, doubleClickZoom, resetZoom]);

  // Handle mouse wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    // Only zoom if Ctrl/Cmd is pressed or if already zoomed
    if (!e.ctrlKey && !e.metaKey && !isZoomed && zoom === 1) return;
    
    e.preventDefault();
    
    const delta = e.deltaY > 0 ? -zoomStep : zoomStep;
    const newZoom = Math.max(minZoom, Math.min(zoom + delta, maxZoom));
    
    if (newZoom === minZoom) {
      resetZoom();
    } else {
      setZoom(newZoom);
      setIsZoomed(true);
      
      // Adjust pan to zoom towards mouse position
      if (containerRef.current && imageRef.current) {
        const containerRect = containerRef.current.getBoundingClientRect();
        const mouseX = e.clientX - containerRect.left;
        const mouseY = e.clientY - containerRect.top;
        
        const zoomRatio = newZoom / zoom;
        setPan(prev => ({
          x: (prev.x - containerRect.width / 2 + mouseX) * zoomRatio - mouseX + containerRect.width / 2,
          y: (prev.y - containerRect.height / 2 + mouseY) * zoomRatio - mouseY + containerRect.height / 2,
        }));
      }
    }
  }, [zoom, zoomStep, minZoom, maxZoom, isZoomed, resetZoom]);

  // Handle mouse down for panning
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (zoom <= 1) return;
    if (e.button !== 0) return; // Only left mouse button
    
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  }, [zoom, pan]);

  // Handle mouse move for panning
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || zoom <= 1) return;
    
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  }, [isDragging, zoom, dragStart]);

  // Handle mouse up
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Handle touch events for mobile
  const [touchStart, setTouchStart] = useState<{ x: number; y: number; distance: number } | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      // Single touch - start panning
      if (zoom > 1 && e.touches[0]) {
        setIsDragging(true);
        setTouchStart({
          x: e.touches[0].clientX - pan.x,
          y: e.touches[0].clientY - pan.y,
          distance: 0,
        });
      }
    } else if (e.touches.length === 2) {
      // Two touches - pinch to zoom
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      if (touch1 && touch2) {
        const distance = Math.hypot(
          touch2.clientX - touch1.clientX,
          touch2.clientY - touch1.clientY
        );
        setTouchStart({
          x: (touch1.clientX + touch2.clientX) / 2,
          y: (touch1.clientY + touch2.clientY) / 2,
          distance,
        });
      }
    }
  }, [zoom, pan]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStart) return;
    
    if (e.touches.length === 1 && isDragging && e.touches[0]) {
      // Single touch - panning
      setPan({
        x: e.touches[0].clientX - touchStart.x,
        y: e.touches[0].clientY - touchStart.y,
      });
    } else if (e.touches.length === 2) {
      // Two touches - pinch to zoom
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      if (touch1 && touch2 && touchStart.distance > 0) {
        const distance = Math.hypot(
          touch2.clientX - touch1.clientX,
          touch2.clientY - touch1.clientY
        );
        
        const scale = distance / touchStart.distance;
        const newZoom = Math.max(minZoom, Math.min(zoom * scale, maxZoom));
        setZoom(newZoom);
        setIsZoomed(newZoom > minZoom);
        
        if (newZoom === minZoom) {
          resetZoom();
        }
      }
    }
  }, [touchStart, isDragging, zoom, minZoom, maxZoom, resetZoom]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
    setTouchStart(null);
  }, []);

  // Constrain pan to image bounds
  useEffect(() => {
    if (!containerRef.current || !imageRef.current || zoom <= 1) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPan({ x: 0, y: 0 });
      return;
    }

    const containerRect = containerRef.current.getBoundingClientRect();
    const imageRect = imageRef.current.getBoundingClientRect();
    
    const maxX = Math.max(0, (imageRect.width * zoom - containerRect.width) / 2);
    const maxY = Math.max(0, (imageRect.height * zoom - containerRect.height) / 2);
    
    setPan(prev => ({
      x: Math.max(-maxX, Math.min(maxX, prev.x)),
      y: Math.max(-maxY, Math.min(maxY, prev.y)),
    }));
  }, [zoom]);

  // Reset on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isZoomed) {
        resetZoom();
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isZoomed, resetZoom]);

  return {
    zoom,
    pan,
    isZoomed,
    isDragging,
    containerRef,
    imageRef,
    zoomIn,
    zoomOut,
    setZoomLevel,
    resetZoom,
    handleDoubleClick,
    handleWheel,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  };
};

