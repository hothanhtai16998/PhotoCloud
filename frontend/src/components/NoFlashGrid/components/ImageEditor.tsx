import { useState, useRef, useEffect, useCallback } from 'react';
import { RotateCcw, Download, Save, Crop, Type, Sliders, RotateCw, FlipHorizontal, FlipVertical, Maximize2, Undo2, Redo2, Palette, Eye, EyeOff, PenTool, Square, Circle, Minus } from 'lucide-react';
import './ImageEditor.css';

interface ImageEditorProps {
  imageUrl: string;
  imageTitle: string;
  onSave: (editedImageBlob: Blob) => Promise<void>;
  onCancel: () => void;
}

interface FilterSettings {
  brightness: number; // -100 to 100
  contrast: number; // -100 to 100
  saturation: number; // -100 to 100
  blur: number; // 0 to 20
  sharpen: number; // 0 to 100
  grayscale: number; // 0 to 100
  sepia: number; // 0 to 100
  vintage: number; // 0 to 100
  vignette: number; // 0 to 100
  colorTemperature: number; // -100 (cool) to 100 (warm)
}

interface CropSettings {
  x: number;
  y: number;
  width: number;
  height: number;
  aspectRatio?: number | null; // null = freeform, number = fixed ratio
  rotation?: number; // rotation angle in degrees
}

interface WatermarkSettings {
  enabled: boolean;
  type: 'text' | 'image'; // Text or image watermark
  text: string;
  imageUrl: string | null; // For image watermark
  position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' | 'center';
  opacity: number; // 0 to 100
  fontSize: number; // 12 to 72
  fontFamily: string;
  fontStyle: 'normal' | 'bold' | 'italic' | 'bold italic';
  textColor: string;
  strokeColor: string;
  strokeWidth: number; // 0 to 10
  shadowEnabled: boolean;
  shadowBlur: number; // 0 to 20
  shadowOffsetX: number; // -20 to 20
  shadowOffsetY: number; // -20 to 20
  shadowColor: string;
  imageSize: number; // 10 to 100 (percentage of image size)
}

interface TransformSettings {
  rotation: number; // 0, 90, 180, 270 degrees
  flipHorizontal: boolean;
  flipVertical: boolean;
  width: number | null; // null = original
  height: number | null; // null = original
  maintainAspectRatio: boolean;
  straighten: number; // -45 to 45 degrees
}

interface EditState {
  filters: FilterSettings;
  crop: CropSettings | null;
  watermark: WatermarkSettings;
  transform: TransformSettings;
}

export const ImageEditor = ({ imageUrl, imageTitle, onSave, onCancel }: ImageEditorProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [activeTool, setActiveTool] = useState<'filters' | 'crop' | 'watermark' | 'transform' | 'draw'>('filters');
  const [isProcessing, setIsProcessing] = useState(false);
  const [originalImageLoaded, setOriginalImageLoaded] = useState(false);
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);
  const [cropOverlayStyle, setCropOverlayStyle] = useState<React.CSSProperties | null>(null);
  
  // Undo/Redo system
  const [editHistory, setEditHistory] = useState<EditState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const maxHistorySize = 50;
  
  // Before/After comparison
  const [showBeforeAfter, setShowBeforeAfter] = useState(false);
  const originalCanvasRef = useRef<HTMLCanvasElement | null>(null);
  
  // Presets
  const [presets, setPresets] = useState<Array<{ name: string; state: EditState }>>([]);
  
  // Export settings
  const [exportSettings, setExportSettings] = useState({
    quality: 92, // 0-100
    format: 'jpeg' as 'jpeg' | 'png' | 'webp',
    sizePreset: 'original' as 'original' | '1920x1080' | '1280x720' | '1024x768' | '800x600' | 'custom',
    customWidth: 0,
    customHeight: 0,
  });
  const [showExportOptions, setShowExportOptions] = useState(false);

  // Drawing settings
  const [drawingSettings, setDrawingSettings] = useState({
    tool: 'pen' as 'pen' | 'rectangle' | 'circle' | 'line' | 'text',
    color: '#000000',
    strokeWidth: 3,
    fillColor: 'transparent',
    fillEnabled: false,
    fontSize: 24,
    fontFamily: 'Arial',
  });
  const [drawings, setDrawings] = useState<Array<{
    type: 'pen' | 'rectangle' | 'circle' | 'line' | 'text';
    points: Array<{ x: number; y: number }>;
    startX?: number;
    startY?: number;
    endX?: number;
    endY?: number;
    text?: string;
    color: string;
    strokeWidth: number;
    fillColor?: string;
    fillEnabled?: boolean;
    fontSize?: number;
    fontFamily?: string;
  }>>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentDrawing, setCurrentDrawing] = useState<{
    type: 'pen' | 'rectangle' | 'circle' | 'line' | 'text';
    points: Array<{ x: number; y: number }>;
    startX?: number;
    startY?: number;
    endX?: number;
    endY?: number;
    text?: string;
    color: string;
    strokeWidth: number;
    fillColor?: string;
    fillEnabled?: boolean;
    fontSize?: number;
    fontFamily?: string;
  } | null>(null);

  // Filter settings
  const [filters, setFilters] = useState<FilterSettings>({
    brightness: 0,
    contrast: 0,
    saturation: 0,
    blur: 0,
    sharpen: 0,
    grayscale: 0,
    sepia: 0,
    vintage: 0,
    vignette: 0,
    colorTemperature: 0,
  });

  // Crop settings
  const [crop, setCrop] = useState<CropSettings | null>(null);
  const [isCropping, setIsCropping] = useState(false);
  const cropStartRef = useRef<{ x: number; y: number } | null>(null);
  const cropContainerRef = useRef<HTMLDivElement>(null);
  const [cropAspectRatio, setCropAspectRatio] = useState<number | null>(null); // null = freeform
  const [cropRotation, setCropRotation] = useState(0);

  // Watermark settings
  const [watermark, setWatermark] = useState<WatermarkSettings>({
    enabled: false,
    type: 'text',
    text: imageTitle || 'Watermark',
    imageUrl: null,
    position: 'bottom-right',
    opacity: 50,
    fontSize: 24,
    fontFamily: 'Arial',
    fontStyle: 'bold',
    textColor: '#ffffff',
    strokeColor: '#000000',
    strokeWidth: 2,
    shadowEnabled: false,
    shadowBlur: 5,
    shadowOffsetX: 2,
    shadowOffsetY: 2,
    shadowColor: '#000000',
    imageSize: 30,
  });

  const watermarkImageRef = useRef<HTMLImageElement | null>(null);

  // Transform settings
  const [transform, setTransform] = useState<TransformSettings>({
    rotation: 0,
    flipHorizontal: false,
    flipVertical: false,
    width: null,
    height: null,
    maintainAspectRatio: true,
    straighten: 0,
  });

  // Load original image
  useEffect(() => {
    const img = new Image();
    // Removed crossOrigin to avoid CORS issues
    // img.crossOrigin = 'anonymous';
    img.onload = () => {
      imageRef.current = img;
      setImageDimensions({ width: img.width, height: img.height });
      setOriginalImageLoaded(true);
      
      // Initialize history with original state
      const initialState: EditState = {
        filters: {
          brightness: 0,
          contrast: 0,
          saturation: 0,
          blur: 0,
          sharpen: 0,
          grayscale: 0,
          sepia: 0,
          vintage: 0,
          vignette: 0,
          colorTemperature: 0,
        },
        crop: null,
        watermark: {
          enabled: false,
          type: 'text',
          text: imageTitle || 'Watermark',
          imageUrl: null,
          position: 'bottom-right',
          opacity: 50,
          fontSize: 24,
          fontFamily: 'Arial',
          fontStyle: 'bold',
          textColor: '#ffffff',
          strokeColor: '#000000',
          strokeWidth: 2,
          shadowEnabled: false,
          shadowBlur: 5,
          shadowOffsetX: 2,
          shadowOffsetY: 2,
          shadowColor: '#000000',
          imageSize: 30,
        },
        transform: {
          rotation: 0,
          flipHorizontal: false,
          flipVertical: false,
          width: null,
          height: null,
          maintainAspectRatio: true,
          straighten: 0,
        },
      };
      setEditHistory([initialState]);
      setHistoryIndex(0);
      
      // Draw original to comparison canvas
      if (originalCanvasRef.current) {
        const origCanvas = originalCanvasRef.current;
        origCanvas.width = img.width;
        origCanvas.height = img.height;
        const origCtx = origCanvas.getContext('2d');
        if (origCtx) {
          origCtx.drawImage(img, 0, 0);
        }
      }
      
      // drawImage will be called after it's declared via useEffect below
    };
    img.src = imageUrl;
  }, [imageUrl, imageTitle]);

  // Calculate crop overlay style when crop or canvas changes
  useEffect(() => {
    if (activeTool === 'crop' && crop && crop.width > 0 && crop.height > 0 && canvasRef.current) {
      const canvas = canvasRef.current;
      const canvasRect = canvas.getBoundingClientRect();
      const scaleX = canvasRect.width / canvas.width;
      const scaleY = canvasRect.height / canvas.height;
      setCropOverlayStyle({
        position: 'absolute',
        left: `${crop.x * scaleX}px`,
        top: `${crop.y * scaleY}px`,
        width: `${crop.width * scaleX}px`,
        height: `${crop.height * scaleY}px`,
        pointerEvents: 'none',
      });
    } else {
      setCropOverlayStyle(null);
    }
  }, [activeTool, crop]);

  // Apply advanced filters using pixel manipulation
  const applyAdvancedFilters = useCallback((
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    filters: FilterSettings
  ) => {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Apply sharpen (unsharp mask)
    if (filters.sharpen > 0) {
      const sharpenAmount = filters.sharpen / 100;
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      const tempCtx = tempCanvas.getContext('2d');
      if (tempCtx) {
        tempCtx.putImageData(imageData, 0, 0);
        tempCtx.filter = `blur(1px)`;
        tempCtx.drawImage(canvas, 0, 0);
        const blurredData = tempCtx.getImageData(0, 0, canvas.width, canvas.height).data;
        
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const br = blurredData[i];
          const bg = blurredData[i + 1];
          const bb = blurredData[i + 2];
          if (r !== undefined && g !== undefined && b !== undefined && br !== undefined && bg !== undefined && bb !== undefined) {
            data[i] = Math.min(255, Math.max(0, r + (r - br) * sharpenAmount));
            data[i + 1] = Math.min(255, Math.max(0, g + (g - bg) * sharpenAmount));
            data[i + 2] = Math.min(255, Math.max(0, b + (b - bb) * sharpenAmount));
          }
        }
      }
    }

    // Apply color temperature
    if (filters.colorTemperature !== 0) {
      const temp = filters.colorTemperature / 100;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const b = data[i + 2];
        if (r !== undefined && b !== undefined) {
          if (temp > 0) {
            // Warm (increase red, decrease blue)
            data[i] = Math.min(255, r + temp * 20);
            data[i + 2] = Math.max(0, b - temp * 20);
          } else {
            // Cool (decrease red, increase blue)
            data[i] = Math.max(0, r + temp * 20);
            data[i + 2] = Math.min(255, b - temp * 20);
          }
        }
      }
    }

    // Apply vintage effect (warm sepia with slight desaturation)
    if (filters.vintage > 0) {
      const vintageAmount = filters.vintage / 100;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        
        if (r !== undefined && g !== undefined && b !== undefined) {
          // Vintage sepia formula
          const tr = (r * 0.393 + g * 0.769 + b * 0.189) * vintageAmount + r * (1 - vintageAmount);
          const tg = (r * 0.349 + g * 0.686 + b * 0.168) * vintageAmount + g * (1 - vintageAmount);
          const tb = (r * 0.272 + g * 0.534 + b * 0.131) * vintageAmount + b * (1 - vintageAmount);
        
          // Slight desaturation
          const gray = tr * 0.299 + tg * 0.587 + tb * 0.114;
          data[i] = tr * (1 - vintageAmount * 0.3) + gray * (vintageAmount * 0.3);
          data[i + 1] = tg * (1 - vintageAmount * 0.3) + gray * (vintageAmount * 0.3);
          data[i + 2] = tb * (1 - vintageAmount * 0.3) + gray * (vintageAmount * 0.3);
        }
      }
    }

    // Apply vignette
    if (filters.vignette > 0) {
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const maxDistance = Math.sqrt(centerX * centerX + centerY * centerY);
      const vignetteAmount = filters.vignette / 100;

      for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
          const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
          const darkness = (distance / maxDistance) * vignetteAmount;
          const i = (y * canvas.width + x) * 4;
          
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          if (r !== undefined && g !== undefined && b !== undefined) {
            data[i] = Math.max(0, r * (1 - darkness));
            data[i + 1] = Math.max(0, g * (1 - darkness));
            data[i + 2] = Math.max(0, b * (1 - darkness));
          }
        }
      }
    }

    ctx.putImageData(imageData, 0, 0);
  }, []);

  // Draw image with all edits applied
  const drawImage = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Calculate base dimensions (after resize)
    let baseWidth = transform.width || img.width;
    let baseHeight = transform.height || img.height;
    
    // Maintain aspect ratio if enabled
    if (transform.maintainAspectRatio && transform.width && !transform.height) {
      baseHeight = (transform.width / img.width) * img.height;
    } else if (transform.maintainAspectRatio && transform.height && !transform.width) {
      baseWidth = (transform.height / img.height) * img.width;
    } else if (transform.maintainAspectRatio && transform.width && transform.height) {
      const widthRatio = transform.width / img.width;
      const heightRatio = transform.height / img.height;
      const ratio = Math.min(widthRatio, heightRatio);
      baseWidth = img.width * ratio;
      baseHeight = img.height * ratio;
    }

    // Calculate canvas size (accounting for rotation and straighten)
    let canvasWidth = baseWidth;
    let canvasHeight = baseHeight;
    
    // If rotated 90 or 270 degrees, swap dimensions
    if (transform.rotation === 90 || transform.rotation === 270) {
      canvasWidth = baseHeight;
      canvasHeight = baseWidth;
    }

    // Account for straighten (add padding for rotation)
    if (transform.straighten !== 0) {
      const angle = Math.abs(transform.straighten) * Math.PI / 180;
      const extraWidth = Math.abs(canvasHeight * Math.sin(angle));
      const extraHeight = Math.abs(canvasWidth * Math.sin(angle));
      canvasWidth += extraWidth;
      canvasHeight += extraHeight;
    }

    // Apply crop if active (crop is applied after resize but before rotation)
    let drawWidth = baseWidth;
    let drawHeight = baseHeight;
    let drawX = 0;
    let drawY = 0;

    if (crop && crop.width > 0 && crop.height > 0) {
      // Scale crop coordinates to match resized image
      const scaleX = baseWidth / img.width;
      const scaleY = baseHeight / img.height;
      drawWidth = crop.width * scaleX;
      drawHeight = crop.height * scaleY;
      drawX = -crop.x * scaleX;
      drawY = -crop.y * scaleY;
      canvasWidth = drawWidth;
      canvasHeight = drawHeight;
    }

    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Apply transformations
    ctx.save();
    
    // Move to center for rotation/straighten
    ctx.translate(canvas.width / 2, canvas.height / 2);
    
    // Apply straighten
    if (transform.straighten !== 0) {
      ctx.rotate((transform.straighten * Math.PI) / 180);
    }
    
    // Apply rotation
    if (transform.rotation !== 0) {
      ctx.rotate((transform.rotation * Math.PI) / 180);
    }
    
    // Apply flips
    if (transform.flipHorizontal) {
      ctx.scale(-1, 1);
    }
    if (transform.flipVertical) {
      ctx.scale(transform.flipHorizontal ? 1 : -1, -1);
    }
    
    // Move back
    ctx.translate(-canvas.width / 2, -canvas.height / 2);

    // Build filter string
    const filterParts: string[] = [];
    
    if (filters.brightness !== 0) {
      filterParts.push(`brightness(${100 + filters.brightness}%)`);
    }
    if (filters.contrast !== 0) {
      filterParts.push(`contrast(${100 + filters.contrast}%)`);
    }
    if (filters.saturation !== 0) {
      filterParts.push(`saturate(${100 + filters.saturation}%)`);
    }
    if (filters.blur > 0) {
      filterParts.push(`blur(${filters.blur}px)`);
    }
    if (filters.grayscale > 0) {
      filterParts.push(`grayscale(${filters.grayscale}%)`);
    }
    if (filters.sepia > 0) {
      filterParts.push(`sepia(${filters.sepia}%)`);
    }
    
    // Apply CSS filters
    if (filterParts.length > 0) {
      ctx.filter = filterParts.join(' ');
    } else {
      ctx.filter = 'none';
    }

    // Draw image (scaled if resize is active)
    const finalDrawWidth = drawWidth;
    const finalDrawHeight = drawHeight;
    const finalDrawX = drawX + (canvas.width - finalDrawWidth) / 2;
    const finalDrawY = drawY + (canvas.height - finalDrawHeight) / 2;
    
    ctx.drawImage(img, drawX, drawY, img.width, img.height, finalDrawX, finalDrawY, finalDrawWidth, finalDrawHeight);
    
    ctx.restore();

    // Apply advanced filters that require pixel manipulation
    if (filters.sharpen > 0 || filters.vintage > 0 || filters.colorTemperature !== 0 || filters.vignette > 0) {
      applyAdvancedFilters(ctx, canvas, filters);
    }

    // Reset filter for watermark
    ctx.filter = 'none';

    // Apply watermark if enabled
    if (watermark.enabled) {
      ctx.save();
      ctx.globalAlpha = watermark.opacity / 100;

      if (watermark.type === 'text' && watermark.text) {
        // Text watermark
        // Build font string
        const fontStyle = watermark.fontStyle === 'bold italic' ? 'bold italic' : watermark.fontStyle;
        ctx.font = `${fontStyle} ${watermark.fontSize}px ${watermark.fontFamily}`;
        ctx.fillStyle = watermark.textColor;
        ctx.strokeStyle = watermark.strokeColor;
        ctx.lineWidth = watermark.strokeWidth;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Apply shadow if enabled
        if (watermark.shadowEnabled) {
          ctx.shadowBlur = watermark.shadowBlur;
          ctx.shadowOffsetX = watermark.shadowOffsetX;
          ctx.shadowOffsetY = watermark.shadowOffsetY;
          ctx.shadowColor = watermark.shadowColor;
        } else {
          ctx.shadowBlur = 0;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 0;
        }

        const textMetrics = ctx.measureText(watermark.text);
        const textWidth = textMetrics.width;
        const textHeight = watermark.fontSize;

        let x = 0;
        let y = 0;
        const padding = 20;

        switch (watermark.position) {
          case 'top-left':
            x = padding + textWidth / 2;
            y = padding + textHeight / 2;
            break;
          case 'top-right':
            x = canvas.width - padding - textWidth / 2;
            y = padding + textHeight / 2;
            break;
          case 'bottom-left':
            x = padding + textWidth / 2;
            y = canvas.height - padding - textHeight / 2;
            break;
          case 'bottom-right':
            x = canvas.width - padding - textWidth / 2;
            y = canvas.height - padding - textHeight / 2;
            break;
          case 'center':
            x = canvas.width / 2;
            y = canvas.height / 2;
            break;
        }

        // Draw text with stroke for visibility
        if (watermark.strokeWidth > 0) {
          ctx.strokeText(watermark.text, x, y);
        }
        ctx.fillText(watermark.text, x, y);
      } else if (watermark.type === 'image' && watermarkImageRef.current) {
        // Image watermark
        const watermarkImg = watermarkImageRef.current;
        const size = (Math.min(canvas.width, canvas.height) * watermark.imageSize) / 100;
        const aspectRatio = watermarkImg.width / watermarkImg.height;
        let imgWidth = size;
        let imgHeight = size / aspectRatio;

        // If height exceeds size, scale by height instead
        if (imgHeight > size) {
          imgHeight = size;
          imgWidth = size * aspectRatio;
        }

        let x = 0;
        let y = 0;
        const padding = 20;

        switch (watermark.position) {
          case 'top-left':
            x = padding;
            y = padding;
            break;
          case 'top-right':
            x = canvas.width - imgWidth - padding;
            y = padding;
            break;
          case 'bottom-left':
            x = padding;
            y = canvas.height - imgHeight - padding;
            break;
          case 'bottom-right':
            x = canvas.width - imgWidth - padding;
            y = canvas.height - imgHeight - padding;
            break;
          case 'center':
            x = (canvas.width - imgWidth) / 2;
            y = (canvas.height - imgHeight) / 2;
            break;
        }

        ctx.drawImage(watermarkImg, x, y, imgWidth, imgHeight);
      }

      ctx.restore();
    }

    // Draw all drawings on top
    if (drawings.length > 0 || currentDrawing) {
      const allDrawings = currentDrawing ? [...drawings, currentDrawing] : drawings;
      allDrawings.forEach((drawing) => {
        ctx.save();
        ctx.strokeStyle = drawing.color;
        ctx.fillStyle = drawing.fillColor || 'transparent';
        ctx.lineWidth = drawing.strokeWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        if (drawing.type === 'pen') {
          if (drawing.points.length > 1 && drawing.points[0]) {
            ctx.beginPath();
            ctx.moveTo(drawing.points[0].x, drawing.points[0].y);
            for (let i = 1; i < drawing.points.length; i++) {
              const point = drawing.points[i];
              if (point) {
                ctx.lineTo(point.x, point.y);
              }
            }
            ctx.stroke();
          }
        } else if (drawing.type === 'rectangle' && drawing.startX !== undefined && drawing.startY !== undefined && drawing.endX !== undefined && drawing.endY !== undefined) {
          const x = Math.min(drawing.startX, drawing.endX);
          const y = Math.min(drawing.startY, drawing.endY);
          const width = Math.abs(drawing.endX - drawing.startX);
          const height = Math.abs(drawing.endY - drawing.startY);
          if (drawing.fillEnabled && drawing.fillColor) {
            ctx.fillRect(x, y, width, height);
          }
          ctx.strokeRect(x, y, width, height);
        } else if (drawing.type === 'circle' && drawing.startX !== undefined && drawing.startY !== undefined && drawing.endX !== undefined && drawing.endY !== undefined) {
          const centerX = (drawing.startX + drawing.endX) / 2;
          const centerY = (drawing.startY + drawing.endY) / 2;
          const radiusX = Math.abs(drawing.endX - drawing.startX) / 2;
          const radiusY = Math.abs(drawing.endY - drawing.startY) / 2;
          ctx.beginPath();
          ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
          if (drawing.fillEnabled && drawing.fillColor) {
            ctx.fill();
          }
          ctx.stroke();
        } else if (drawing.type === 'line' && drawing.startX !== undefined && drawing.startY !== undefined && drawing.endX !== undefined && drawing.endY !== undefined) {
          ctx.beginPath();
          ctx.moveTo(drawing.startX, drawing.startY);
          ctx.lineTo(drawing.endX, drawing.endY);
          ctx.stroke();
        } else if (drawing.type === 'text' && drawing.text && drawing.startX !== undefined && drawing.startY !== undefined) {
          ctx.font = `${drawing.fontSize || 24}px ${drawing.fontFamily || 'Arial'}`;
          ctx.fillStyle = drawing.color;
          ctx.textBaseline = 'top';
          ctx.fillText(drawing.text, drawing.startX, drawing.startY);
        }
        ctx.restore();
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, crop, watermark, transform, drawings, currentDrawing]);

  // Save state to history when edits change
  const saveToHistory = useCallback(() => {
    const currentState: EditState = {
      filters: { ...filters },
      crop: crop ? { ...crop } : null,
      watermark: { ...watermark },
      transform: { ...transform },
    };
    
    setEditHistory((prev) => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(currentState);
      // Limit history size
      if (newHistory.length > maxHistorySize) {
        newHistory.shift();
        return newHistory;
      }
      return newHistory;
    });
    setHistoryIndex((prev) => Math.min(prev + 1, maxHistorySize - 1));
  }, [filters, crop, watermark, transform, historyIndex]);

  // Debounced history save (save after user stops editing for 500ms)
  const saveToHistoryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (originalImageLoaded && historyIndex >= 0) {
      if (saveToHistoryRef.current) {
        clearTimeout(saveToHistoryRef.current);
      }
      saveToHistoryRef.current = setTimeout(() => {
        saveToHistory();
      }, 500);
      
      return () => {
        if (saveToHistoryRef.current) {
          clearTimeout(saveToHistoryRef.current);
        }
      };
    }
    return undefined;
  }, [filters, crop, watermark, transform, originalImageLoaded, historyIndex, saveToHistory]);

  useEffect(() => {
    if (originalImageLoaded) {
      drawImage();
    }
  }, [filters, crop, watermark, transform, originalImageLoaded, drawImage]);

  // Undo function
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const prevState = editHistory[historyIndex - 1];
      if (prevState) {
        setFilters(prevState.filters);
        setCrop(prevState.crop);
        setWatermark(prevState.watermark);
        setTransform(prevState.transform);
        setHistoryIndex(historyIndex - 1);
      }
    }
  }, [historyIndex, editHistory]);

  // Redo function
  const handleRedo = useCallback(() => {
    if (historyIndex < editHistory.length - 1) {
      const nextState = editHistory[historyIndex + 1];
      if (nextState) {
        setFilters(nextState.filters);
        setCrop(nextState.crop);
        setWatermark(nextState.watermark);
        setTransform(nextState.transform);
        setHistoryIndex(historyIndex + 1);
      }
    }
  }, [historyIndex, editHistory]);

  // Save preset
  const handleSavePreset = useCallback(() => {
    const presetName = prompt('Nhập tên preset:');
    if (presetName?.trim()) {
      const currentState: EditState = {
        filters: { ...filters },
        crop: crop ? { ...crop } : null,
        watermark: { ...watermark },
        transform: { ...transform },
      };
      setPresets((prev) => [...prev, { name: presetName.trim(), state: currentState }]);
      
      // Save to localStorage
      const savedPresets = JSON.parse(localStorage.getItem('imageEditorPresets') || '[]');
      savedPresets.push({ name: presetName.trim(), state: currentState });
      localStorage.setItem('imageEditorPresets', JSON.stringify(savedPresets));
    }
  }, [filters, crop, watermark, transform]);

  // Load preset
  const handleLoadPreset = useCallback((preset: { name: string; state: EditState }) => {
    setFilters(preset.state.filters);
    setCrop(preset.state.crop);
    setWatermark(preset.state.watermark);
    setTransform(preset.state.transform);
  }, []);

  // Delete preset
  const handleDeletePreset = useCallback((index: number) => {
    setPresets((prev) => {
      const newPresets = prev.filter((_, i) => i !== index);
      localStorage.setItem('imageEditorPresets', JSON.stringify(newPresets));
      return newPresets;
    });
  }, []);

  // Load presets from localStorage on mount
  useEffect(() => {
    const savedPresets = JSON.parse(localStorage.getItem('imageEditorPresets') || '[]');
    setPresets(savedPresets);
  }, []);

  // Redraw when settings change or image loads
  useEffect(() => {
    if (originalImageLoaded) {
      drawImage();
    }
  }, [filters, crop, watermark, originalImageLoaded, drawImage, imageUrl, imageTitle]);

  // Handle crop start
  const handleCropStart = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (activeTool !== 'crop' || !canvasRef.current) return;
    setIsCropping(true);
    const canvas = canvasRef.current;
    const canvasRect = canvas.getBoundingClientRect();
    
    // Calculate position relative to canvas
    const x = e.clientX - canvasRect.left;
    const y = e.clientY - canvasRect.top;
    
    // Convert to actual image coordinates
    const scaleX = canvas.width / canvasRect.width;
    const scaleY = canvas.height / canvasRect.height;
    
    cropStartRef.current = { 
      x: x * scaleX, 
      y: y * scaleY 
    };
  }, [activeTool]);

  // Handle crop move
  const handleCropMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!isCropping || !cropStartRef.current || !canvasRef.current || !imageRef.current) return;
    const canvas = canvasRef.current;
    const canvasRect = canvas.getBoundingClientRect();
    
    const currentX = e.clientX - canvasRect.left;
    const currentY = e.clientY - canvasRect.top;

    // Convert to actual image coordinates
    const scaleX = canvas.width / canvasRect.width;
    const scaleY = canvas.height / canvasRect.height;
    
    const actualCurrentX = currentX * scaleX;
    const actualCurrentY = currentY * scaleY;
    
    const startImageX = cropStartRef.current.x;
    const startImageY = cropStartRef.current.y;
    
    let width = actualCurrentX - startImageX;
    let height = actualCurrentY - startImageY;
    
    // Apply aspect ratio if set
    if (cropAspectRatio !== null && cropAspectRatio > 0) {
      const absWidth = Math.abs(width);
      const absHeight = Math.abs(height);
      
      if (absWidth / absHeight > cropAspectRatio) {
        // Width is too large, adjust height
        height = Math.abs(width) / cropAspectRatio * (height < 0 ? -1 : 1);
      } else {
        // Height is too large, adjust width
        width = Math.abs(height) * cropAspectRatio * (width < 0 ? -1 : 1);
      }
    }
    
    // Calculate final position
    const finalX = startImageX + width;
    const finalY = startImageY + height;
    
    const x = Math.max(0, Math.min(startImageX, finalX));
    const y = Math.max(0, Math.min(startImageY, finalY));
    const maxX = Math.min(canvas.width, Math.max(startImageX, finalX));
    const maxY = Math.min(canvas.height, Math.max(startImageY, finalY));
    
    // Recalculate width/height if aspect ratio is enforced
    let finalWidth = maxX - x;
    let finalHeight = maxY - y;
    
    if (cropAspectRatio !== null && cropAspectRatio > 0) {
      if (finalWidth / finalHeight > cropAspectRatio) {
        finalHeight = finalWidth / cropAspectRatio;
        if (y + finalHeight > canvas.height) {
          finalHeight = canvas.height - y;
          finalWidth = finalHeight * cropAspectRatio;
        }
      } else {
        finalWidth = finalHeight * cropAspectRatio;
        if (x + finalWidth > canvas.width) {
          finalWidth = canvas.width - x;
          finalHeight = finalWidth / cropAspectRatio;
        }
      }
    }

    setCrop({ 
      x, 
      y, 
      width: finalWidth, 
      height: finalHeight,
      aspectRatio: cropAspectRatio,
      rotation: cropRotation,
    });
  }, [isCropping, cropAspectRatio, cropRotation]);

  // Handle crop end
  const handleCropEnd = useCallback(() => {
    setIsCropping(false);
    cropStartRef.current = null;
  }, []);

  // Drawing handlers
  const handleDrawStart = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (activeTool !== 'draw' || !canvasRef.current) return;
    setIsDrawing(true);
    const canvas = canvasRef.current;
    const canvasRect = canvas.getBoundingClientRect();
    const x = e.clientX - canvasRect.left;
    const y = e.clientY - canvasRect.top;
    const scaleX = canvas.width / canvasRect.width;
    const scaleY = canvas.height / canvasRect.height;
    
    const startX = x * scaleX;
    const startY = y * scaleY;
    
    if (drawingSettings.tool === 'text') {
      const text = prompt('Nhập text:');
      if (text) {
        const newDrawing = {
          type: 'text' as const,
          points: [],
          startX,
          startY,
          text,
          color: drawingSettings.color,
          strokeWidth: drawingSettings.strokeWidth,
          fontSize: drawingSettings.fontSize,
          fontFamily: drawingSettings.fontFamily,
        };
        setDrawings((prev) => [...prev, newDrawing]);
      }
    } else {
      setCurrentDrawing({
        type: drawingSettings.tool,
        points: drawingSettings.tool === 'pen' ? [{ x: startX, y: startY }] : [],
        startX,
        startY,
        color: drawingSettings.color,
        strokeWidth: drawingSettings.strokeWidth,
        fillColor: drawingSettings.fillEnabled ? drawingSettings.fillColor : undefined,
        fillEnabled: drawingSettings.fillEnabled,
      });
    }
  }, [activeTool, drawingSettings, canvasRef]);

  const handleDrawMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDrawing || !currentDrawing || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const canvasRect = canvas.getBoundingClientRect();
    const x = e.clientX - canvasRect.left;
    const y = e.clientY - canvasRect.top;
    const scaleX = canvas.width / canvasRect.width;
    const scaleY = canvas.height / canvasRect.height;
    
    const currentX = x * scaleX;
    const currentY = y * scaleY;
    
    if (currentDrawing.type === 'pen') {
      setCurrentDrawing({
        ...currentDrawing,
        points: [...currentDrawing.points, { x: currentX, y: currentY }],
      });
    } else {
      setCurrentDrawing({
        ...currentDrawing,
        endX: currentX,
        endY: currentY,
      });
    }
  }, [isDrawing, currentDrawing, canvasRef]);

  const handleDrawEnd = useCallback(() => {
    if (isDrawing && currentDrawing) {
      setDrawings((prev) => [...prev, currentDrawing]);
      setCurrentDrawing(null);
    }
    setIsDrawing(false);
  }, [isDrawing, currentDrawing]);

  // Reset all edits
  const handleReset = useCallback(() => {
    setFilters({
      brightness: 0,
      contrast: 0,
      saturation: 0,
      blur: 0,
      sharpen: 0,
      grayscale: 0,
      sepia: 0,
      vintage: 0,
      vignette: 0,
      colorTemperature: 0,
    });
    setCrop(null);
    setWatermark({ ...watermark, enabled: false });
  }, [watermark]);

  // Save edited image
  const handleSave = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setIsProcessing(true);
    try {
      // Determine output dimensions
      let outputWidth = canvas.width;
      let outputHeight = canvas.height;
      
      if (exportSettings.sizePreset !== 'original') {
        if (exportSettings.sizePreset === 'custom') {
          outputWidth = exportSettings.customWidth || canvas.width;
          outputHeight = exportSettings.customHeight || canvas.height;
        } else {
          const [width, height] = exportSettings.sizePreset.split('x').map(Number);
          // Maintain aspect ratio
          if (width && height && !isNaN(width) && !isNaN(height)) {
            const aspectRatio = canvas.width / canvas.height;
            if (width / height > aspectRatio) {
              outputWidth = height * aspectRatio;
              outputHeight = height;
            } else {
              outputWidth = width;
              outputHeight = width / aspectRatio;
            }
          }
        }
      }

      // Create output canvas if resizing needed
      let outputCanvas = canvas;
      if (outputWidth !== canvas.width || outputHeight !== canvas.height) {
        outputCanvas = document.createElement('canvas');
        outputCanvas.width = outputWidth;
        outputCanvas.height = outputHeight;
        const ctx = outputCanvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(canvas, 0, 0, outputWidth, outputHeight);
        }
      }

      // Determine MIME type and quality
      const mimeType = exportSettings.format === 'png' 
        ? 'image/png' 
        : exportSettings.format === 'webp'
        ? 'image/webp'
        : 'image/jpeg';
      
      const quality = exportSettings.format === 'png' ? undefined : exportSettings.quality / 100;

      outputCanvas.toBlob(async (blob) => {
        if (blob) {
          await onSave(blob);
        }
        setIsProcessing(false);
      }, mimeType, quality);
    } catch (error) {
      console.error('Failed to save image:', error);
      setIsProcessing(false);
    }
  }, [onSave, exportSettings]);

  if (!originalImageLoaded) {
    return (
      <div className="image-editor-loading">
        <div className="loading-spinner" />
        <p>Đang tải ảnh...</p>
      </div>
    );
  }

  return (
    <div className="image-editor">
      <div className="image-editor-header">
        <h3>Chỉnh sửa ảnh</h3>
        <div className="image-editor-actions">
          {/* Undo/Redo */}
          <div className="image-editor-history-controls">
            <button
              className="image-editor-btn icon"
              onClick={handleUndo}
              disabled={historyIndex <= 0}
              title="Hoàn tác (Ctrl+Z)"
            >
              <Undo2 size={18} />
            </button>
            <button
              className="image-editor-btn icon"
              onClick={handleRedo}
              disabled={historyIndex >= editHistory.length - 1}
              title="Làm lại (Ctrl+Y)"
            >
              <Redo2 size={18} />
            </button>
          </div>
          
          {/* Before/After Toggle */}
          <button
            className={`image-editor-btn icon ${showBeforeAfter ? 'active' : ''}`}
            onClick={() => setShowBeforeAfter(!showBeforeAfter)}
            title="So sánh trước/sau"
          >
            {showBeforeAfter ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
          
          {/* Presets */}
          <div className="image-editor-presets-dropdown">
            <button
              className="image-editor-btn icon"
              onClick={handleSavePreset}
              title="Lưu preset"
            >
              <Palette size={18} />
            </button>
            {presets.length > 0 && (
              <div className="image-editor-presets-menu">
                <div className="presets-header">Presets</div>
                {presets.map((preset, index) => (
                  <div key={index} className="preset-item">
                    <button
                      className="preset-load"
                      onClick={() => handleLoadPreset(preset)}
                    >
                      {preset.name}
                    </button>
                    <button
                      className="preset-delete"
                      onClick={() => handleDeletePreset(index)}
                      title="Xóa preset"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <button
            className="image-editor-btn secondary"
            onClick={handleReset}
            title="Đặt lại tất cả"
          >
            <RotateCcw size={18} />
            <span>Đặt lại</span>
          </button>
          <button
            className="image-editor-btn secondary"
            onClick={onCancel}
            disabled={isProcessing}
          >
            Hủy
          </button>
          <div className="image-editor-export-wrapper">
            <button
              className="image-editor-btn icon"
              onClick={() => setShowExportOptions(!showExportOptions)}
              title="Tùy chọn xuất ảnh"
            >
              <Download size={18} />
            </button>
            {showExportOptions && (
              <div className="image-editor-export-menu">
                <div className="export-menu-header">Tùy chọn xuất ảnh</div>
                
                {/* Format Selection */}
                <div className="export-menu-section">
                  <label>Định dạng</label>
                  <div className="export-format-options">
                    <button
                      className={`export-format-btn ${exportSettings.format === 'jpeg' ? 'active' : ''}`}
                      onClick={() => setExportSettings({ ...exportSettings, format: 'jpeg' })}
                    >
                      JPEG
                    </button>
                    <button
                      className={`export-format-btn ${exportSettings.format === 'png' ? 'active' : ''}`}
                      onClick={() => setExportSettings({ ...exportSettings, format: 'png' })}
                    >
                      PNG
                    </button>
                    <button
                      className={`export-format-btn ${exportSettings.format === 'webp' ? 'active' : ''}`}
                      onClick={() => setExportSettings({ ...exportSettings, format: 'webp' })}
                    >
                      WebP
                    </button>
                  </div>
                </div>

                {/* Quality Slider (only for JPEG and WebP) */}
                {exportSettings.format !== 'png' && (
                  <div className="export-menu-section">
                    <label>
                      Chất lượng: {exportSettings.quality}%
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="100"
                      value={exportSettings.quality}
                      onChange={(e) => setExportSettings({ ...exportSettings, quality: parseInt(e.target.value) })}
                      className="export-quality-slider"
                    />
                    <div className="slider-labels">
                      <span>Thấp</span>
                      <span>Cao</span>
                    </div>
                  </div>
                )}

                {/* Size Presets */}
                <div className="export-menu-section">
                  <label>Kích thước</label>
                  <select
                    value={exportSettings.sizePreset}
                    onChange={(e) => setExportSettings({ ...exportSettings, sizePreset: e.target.value as typeof exportSettings.sizePreset })}
                    className="export-size-select"
                  >
                    <option value="original">Gốc</option>
                    <option value="1920x1080">1920 × 1080 (Full HD)</option>
                    <option value="1280x720">1280 × 720 (HD)</option>
                    <option value="1024x768">1024 × 768</option>
                    <option value="800x600">800 × 600</option>
                    <option value="custom">Tùy chỉnh</option>
                  </select>
                </div>

                {/* Custom Size Inputs */}
                {exportSettings.sizePreset === 'custom' && (
                  <div className="export-menu-section">
                    <div className="export-custom-size">
                      <div className="export-input-group">
                        <label>Chiều rộng (px)</label>
                        <input
                          type="number"
                          min="1"
                          value={exportSettings.customWidth || ''}
                          onChange={(e) => setExportSettings({ ...exportSettings, customWidth: parseInt(e.target.value) || 0 })}
                          placeholder="Width"
                        />
                      </div>
                      <div className="export-input-group">
                        <label>Chiều cao (px)</label>
                        <input
                          type="number"
                          min="1"
                          value={exportSettings.customHeight || ''}
                          onChange={(e) => setExportSettings({ ...exportSettings, customHeight: parseInt(e.target.value) || 0 })}
                          placeholder="Height"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="export-menu-actions">
                  <button
                    className="export-btn primary"
                    onClick={() => {
                      setShowExportOptions(false);
                      handleSave();
                    }}
                    disabled={isProcessing || (exportSettings.sizePreset === 'custom' && (!exportSettings.customWidth || !exportSettings.customHeight))}
                  >
                    {isProcessing ? (
                      <>
                        <div className="loading-spinner-small" />
                        <span>Đang xử lý...</span>
                      </>
                    ) : (
                      <>
                        <Save size={18} />
                        <span>Lưu ảnh</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="image-editor-content">
        {/* Toolbar */}
        <div className="image-editor-toolbar">
          <button
            className={`image-editor-tool-btn ${activeTool === 'filters' ? 'active' : ''}`}
            onClick={() => setActiveTool('filters')}
          >
            <Sliders size={20} />
            <span>Bộ lọc</span>
          </button>
          <button
            className={`image-editor-tool-btn ${activeTool === 'crop' ? 'active' : ''}`}
            onClick={() => setActiveTool('crop')}
          >
            <Crop size={20} />
            <span>Cắt ảnh</span>
          </button>
          <button
            className={`image-editor-tool-btn ${activeTool === 'watermark' ? 'active' : ''}`}
            onClick={() => setActiveTool('watermark')}
          >
            <Type size={20} />
            <span>Watermark</span>
          </button>
          <button
            className={`image-editor-tool-btn ${activeTool === 'transform' ? 'active' : ''}`}
            onClick={() => setActiveTool('transform')}
          >
            <Maximize2 size={20} />
            <span>Biến đổi</span>
          </button>
          <button
            className={`image-editor-tool-btn ${activeTool === 'draw' ? 'active' : ''}`}
            onClick={() => setActiveTool('draw')}
          >
            <PenTool size={20} />
            <span>Vẽ</span>
          </button>
        </div>

        {/* Editor Area */}
        <div className="image-editor-main">
          {/* Canvas Preview */}
          <div
            ref={cropContainerRef}
            className={`image-editor-canvas-container ${showBeforeAfter ? 'before-after-mode' : ''}`}
            onMouseDown={activeTool === 'crop' ? handleCropStart : activeTool === 'draw' ? handleDrawStart : undefined}
            onMouseMove={activeTool === 'crop' ? handleCropMove : activeTool === 'draw' ? handleDrawMove : undefined}
            onMouseUp={activeTool === 'crop' ? handleCropEnd : activeTool === 'draw' ? handleDrawEnd : undefined}
            onMouseLeave={activeTool === 'crop' ? handleCropEnd : activeTool === 'draw' ? handleDrawEnd : undefined}
          >
            {showBeforeAfter ? (
              <div className="before-after-comparison">
                <div className="before-after-item">
                  <div className="before-after-label">Trước</div>
                  <canvas ref={originalCanvasRef} className="image-editor-canvas" />
                </div>
                <div className="before-after-item">
                  <div className="before-after-label">Sau</div>
                  <canvas ref={canvasRef} className="image-editor-canvas" />
                </div>
              </div>
            ) : (
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <canvas ref={canvasRef} className="image-editor-canvas" />
              {activeTool === 'crop' && crop && crop.width > 0 && crop.height > 0 && cropOverlayStyle && (
                <div
                  className="image-editor-crop-overlay"
                  style={cropOverlayStyle}
                />
              )}
              </div>
            )}
          </div>

          {/* Controls Panel */}
          <div className="image-editor-controls">
            {activeTool === 'filters' && (
              <div className="image-editor-control-group">
                <h4>Bộ lọc</h4>
                
                {/* Basic Filters */}
                <div className="image-editor-filter-section">
                  <h5>Màu sắc cơ bản</h5>
                  <div className="image-editor-slider">
                    <label>
                      <span>Độ sáng</span>
                      <span className="slider-value">{filters.brightness}</span>
                    </label>
                    <input
                      type="range"
                      min="-100"
                      max="100"
                      value={filters.brightness}
                      onChange={(e) => setFilters({ ...filters, brightness: parseInt(e.target.value) })}
                    />
                  </div>
                  <div className="image-editor-slider">
                    <label>
                      <span>Độ tương phản</span>
                      <span className="slider-value">{filters.contrast}</span>
                    </label>
                    <input
                      type="range"
                      min="-100"
                      max="100"
                      value={filters.contrast}
                      onChange={(e) => setFilters({ ...filters, contrast: parseInt(e.target.value) })}
                    />
                  </div>
                  <div className="image-editor-slider">
                    <label>
                      <span>Độ bão hòa</span>
                      <span className="slider-value">{filters.saturation}</span>
                    </label>
                    <input
                      type="range"
                      min="-100"
                      max="100"
                      value={filters.saturation}
                      onChange={(e) => setFilters({ ...filters, saturation: parseInt(e.target.value) })}
                    />
                  </div>
                  <div className="image-editor-slider">
                    <label>
                      <span>Nhiệt độ màu</span>
                      <span className="slider-value">{filters.colorTemperature > 0 ? `+${filters.colorTemperature}` : filters.colorTemperature}</span>
                    </label>
                    <input
                      type="range"
                      min="-100"
                      max="100"
                      value={filters.colorTemperature}
                      onChange={(e) => setFilters({ ...filters, colorTemperature: parseInt(e.target.value) })}
                    />
                    <div className="slider-labels">
                      <span>Lạnh</span>
                      <span>Ấm</span>
                    </div>
                  </div>
                </div>

                {/* Effects */}
                <div className="image-editor-filter-section">
                  <h5>Hiệu ứng</h5>
                  <div className="image-editor-slider">
                    <label>
                      <span>Làm mờ</span>
                      <span className="slider-value">{filters.blur}</span>
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="20"
                      value={filters.blur}
                      onChange={(e) => setFilters({ ...filters, blur: parseInt(e.target.value) })}
                    />
                  </div>
                  <div className="image-editor-slider">
                    <label>
                      <span>Làm sắc nét</span>
                      <span className="slider-value">{filters.sharpen}</span>
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={filters.sharpen}
                      onChange={(e) => setFilters({ ...filters, sharpen: parseInt(e.target.value) })}
                    />
                  </div>
                  <div className="image-editor-slider">
                    <label>
                      <span>Đen trắng</span>
                      <span className="slider-value">{filters.grayscale}%</span>
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={filters.grayscale}
                      onChange={(e) => setFilters({ ...filters, grayscale: parseInt(e.target.value) })}
                    />
                  </div>
                  <div className="image-editor-slider">
                    <label>
                      <span>Sepia</span>
                      <span className="slider-value">{filters.sepia}%</span>
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={filters.sepia}
                      onChange={(e) => setFilters({ ...filters, sepia: parseInt(e.target.value) })}
                    />
                  </div>
                  <div className="image-editor-slider">
                    <label>
                      <span>Vintage</span>
                      <span className="slider-value">{filters.vintage}%</span>
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={filters.vintage}
                      onChange={(e) => setFilters({ ...filters, vintage: parseInt(e.target.value) })}
                    />
                  </div>
                  <div className="image-editor-slider">
                    <label>
                      <span>Vignette</span>
                      <span className="slider-value">{filters.vignette}%</span>
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={filters.vignette}
                      onChange={(e) => setFilters({ ...filters, vignette: parseInt(e.target.value) })}
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTool === 'crop' && (
              <div className="image-editor-control-group">
                <h4>Cắt ảnh</h4>
                <p className="image-editor-hint">
                  Kéo để chọn vùng muốn cắt. Nhấp vào "Áp dụng" để xác nhận.
                </p>
                
                {/* Aspect Ratio Presets */}
                <div className="image-editor-filter-section">
                  <h5>Tỷ lệ khung hình</h5>
                  <div className="image-editor-button-group">
                    <button
                      className={`image-editor-btn small ${cropAspectRatio === null ? 'active' : ''}`}
                      onClick={() => setCropAspectRatio(null)}
                    >
                      Tự do
                    </button>
                    <button
                      className={`image-editor-btn small ${cropAspectRatio === 1 ? 'active' : ''}`}
                      onClick={() => setCropAspectRatio(1)}
                    >
                      1:1
                    </button>
                    <button
                      className={`image-editor-btn small ${cropAspectRatio === 16/9 ? 'active' : ''}`}
                      onClick={() => setCropAspectRatio(16/9)}
                    >
                      16:9
                    </button>
                    <button
                      className={`image-editor-btn small ${cropAspectRatio === 4/3 ? 'active' : ''}`}
                      onClick={() => setCropAspectRatio(4/3)}
                    >
                      4:3
                    </button>
                    <button
                      className={`image-editor-btn small ${cropAspectRatio === 3/2 ? 'active' : ''}`}
                      onClick={() => setCropAspectRatio(3/2)}
                    >
                      3:2
                    </button>
                    <button
                      className={`image-editor-btn small ${cropAspectRatio === 9/16 ? 'active' : ''}`}
                      onClick={() => setCropAspectRatio(9/16)}
                    >
                      9:16
                    </button>
                    <button
                      className={`image-editor-btn small ${cropAspectRatio === 3/4 ? 'active' : ''}`}
                      onClick={() => setCropAspectRatio(3/4)}
                    >
                      3:4
                    </button>
                    <button
                      className={`image-editor-btn small ${cropAspectRatio === 2/3 ? 'active' : ''}`}
                      onClick={() => setCropAspectRatio(2/3)}
                    >
                      2:3
                    </button>
                  </div>
                </div>

                {/* Rotation */}
                <div className="image-editor-filter-section">
                  <h5>Xoay vùng cắt</h5>
                  <div className="image-editor-button-group">
                    <button
                      className="image-editor-btn small"
                      onClick={() => {
                        const newRotation = (cropRotation - 90 + 360) % 360;
                        setCropRotation(newRotation);
                        if (crop) {
                          setCrop({ ...crop, rotation: newRotation });
                        }
                      }}
                      title="Xoay trái 90°"
                    >
                      <RotateCcw size={18} />
                      <span>Trái 90°</span>
                    </button>
                    <button
                      className="image-editor-btn small"
                      onClick={() => {
                        const newRotation = (cropRotation + 90) % 360;
                        setCropRotation(newRotation);
                        if (crop) {
                          setCrop({ ...crop, rotation: newRotation });
                        }
                      }}
                      title="Xoay phải 90°"
                    >
                      <RotateCw size={18} />
                      <span>Phải 90°</span>
                    </button>
                    <button
                      className="image-editor-btn small secondary"
                      onClick={() => {
                        setCropRotation(0);
                        if (crop) {
                          setCrop({ ...crop, rotation: 0 });
                        }
                      }}
                    >
                      Đặt lại
                    </button>
                  </div>
                  <div className="image-editor-slider">
                    <label>
                      <span>Góc xoay</span>
                      <span className="slider-value">{cropRotation}°</span>
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="360"
                      value={cropRotation}
                      onChange={(e) => {
                        const angle = parseInt(e.target.value);
                        setCropRotation(angle);
                        if (crop) {
                          setCrop({ ...crop, rotation: angle });
                        }
                      }}
                    />
                    <div className="slider-labels">
                      <span>0°</span>
                      <span>180°</span>
                      <span>360°</span>
                    </div>
                  </div>
                </div>

                {crop && crop.width > 0 && crop.height > 0 && (
                  <div className="image-editor-crop-info">
                    <div>Kích thước: {Math.round(crop.width)} × {Math.round(crop.height)}px</div>
                    {cropAspectRatio && (
                      <div>Tỷ lệ: {cropAspectRatio === 1 ? '1:1' : cropAspectRatio === 16/9 ? '16:9' : cropAspectRatio === 4/3 ? '4:3' : cropAspectRatio === 3/2 ? '3:2' : cropAspectRatio === 9/16 ? '9:16' : cropAspectRatio === 3/4 ? '3:4' : cropAspectRatio === 2/3 ? '2:3' : cropAspectRatio.toFixed(2)}</div>
                    )}
                    {cropRotation !== 0 && (
                      <div>Góc xoay: {cropRotation}°</div>
                    )}
                    <div className="image-editor-crop-actions">
                      <button
                        className="image-editor-btn small"
                        onClick={() => {
                          // Apply crop - redraw will happen automatically
                          setIsCropping(false);
                          setActiveTool('filters');
                        }}
                      >
                        Áp dụng
                      </button>
                      <button
                        className="image-editor-btn small secondary"
                        onClick={() => {
                          setCrop(null);
                          setIsCropping(false);
                          setCropAspectRatio(null);
                          setCropRotation(0);
                        }}
                      >
                        Hủy
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTool === 'transform' && (
              <div className="image-editor-control-group">
                <h4>Biến đổi ảnh</h4>
                
                {/* Rotation */}
                <div className="image-editor-filter-section">
                  <h5>Xoay</h5>
                  <div className="image-editor-button-group">
                    <button
                      className="image-editor-btn small"
                      onClick={() => setTransform({ ...transform, rotation: (transform.rotation - 90 + 360) % 360 })}
                      title="Xoay trái 90°"
                    >
                      <RotateCcw size={18} />
                      <span>Trái 90°</span>
                    </button>
                    <button
                      className="image-editor-btn small"
                      onClick={() => setTransform({ ...transform, rotation: (transform.rotation + 90) % 360 })}
                      title="Xoay phải 90°"
                    >
                      <RotateCw size={18} />
                      <span>Phải 90°</span>
                    </button>
                    <button
                      className="image-editor-btn small"
                      onClick={() => setTransform({ ...transform, rotation: (transform.rotation + 180) % 360 })}
                      title="Xoay 180°"
                    >
                      <span>180°</span>
                    </button>
                    <button
                      className="image-editor-btn small secondary"
                      onClick={() => setTransform({ ...transform, rotation: 0, straighten: 0 })}
                    >
                      Đặt lại
                    </button>
                  </div>
                  <div className="image-editor-slider">
                    <label>
                      <span>Làm thẳng</span>
                      <span className="slider-value">{transform.straighten}°</span>
                    </label>
                    <input
                      type="range"
                      min="-45"
                      max="45"
                      value={transform.straighten}
                      onChange={(e) => setTransform({ ...transform, straighten: parseInt(e.target.value) })}
                    />
                    <div className="slider-labels">
                      <span>-45°</span>
                      <span>0°</span>
                      <span>+45°</span>
                    </div>
                  </div>
                </div>

                {/* Flip */}
                <div className="image-editor-filter-section">
                  <h5>Lật</h5>
                  <div className="image-editor-button-group">
                    <button
                      className={`image-editor-btn small ${transform.flipHorizontal ? 'active' : ''}`}
                      onClick={() => setTransform({ ...transform, flipHorizontal: !transform.flipHorizontal })}
                    >
                      <FlipHorizontal size={18} />
                      <span>Lật ngang</span>
                    </button>
                    <button
                      className={`image-editor-btn small ${transform.flipVertical ? 'active' : ''}`}
                      onClick={() => setTransform({ ...transform, flipVertical: !transform.flipVertical })}
                    >
                      <FlipVertical size={18} />
                      <span>Lật dọc</span>
                    </button>
                  </div>
                </div>

                {/* Resize */}
                <div className="image-editor-filter-section">
                  <h5>Thay đổi kích thước</h5>
                  <div className="image-editor-checkbox">
                    <label>
                      <input
                        type="checkbox"
                        checked={transform.maintainAspectRatio}
                        onChange={(e) => setTransform({ ...transform, maintainAspectRatio: e.target.checked })}
                      />
                      <span>Giữ tỷ lệ</span>
                    </label>
                  </div>
                  {imageDimensions && (
                    <>
                      <div className="image-editor-input">
                        <label>Chiều rộng (px)</label>
                        <input
                          type="number"
                          min="1"
                          value={transform.width || imageDimensions.width}
                          onChange={(e) => {
                            const value = e.target.value ? parseInt(e.target.value) : null;
                            setTransform({ ...transform, width: value });
                          }}
                          placeholder={imageDimensions.width.toString()}
                        />
                      </div>
                      <div className="image-editor-input">
                        <label>Chiều cao (px)</label>
                        <input
                          type="number"
                          min="1"
                          value={transform.height || imageDimensions.height}
                          onChange={(e) => {
                            const value = e.target.value ? parseInt(e.target.value) : null;
                            setTransform({ ...transform, height: value });
                          }}
                          placeholder={imageDimensions.height.toString()}
                        />
                      </div>
                      <div className="image-editor-button-group">
                        <button
                          className="image-editor-btn small secondary"
                          onClick={() => setTransform({ ...transform, width: null, height: null })}
                        >
                          Đặt lại kích thước
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {activeTool === 'draw' && (
              <div className="image-editor-control-group">
                <h4>Vẽ và chú thích</h4>
                
                {/* Drawing Tool Selection */}
                <div className="image-editor-filter-section">
                  <h5>Công cụ</h5>
                  <div className="image-editor-button-group">
                    <button
                      className={`image-editor-btn small ${drawingSettings.tool === 'pen' ? 'active' : ''}`}
                      onClick={() => setDrawingSettings({ ...drawingSettings, tool: 'pen' })}
                    >
                      <PenTool size={18} />
                      <span>Bút</span>
                    </button>
                    <button
                      className={`image-editor-btn small ${drawingSettings.tool === 'rectangle' ? 'active' : ''}`}
                      onClick={() => setDrawingSettings({ ...drawingSettings, tool: 'rectangle' })}
                    >
                      <Square size={18} />
                      <span>Hình chữ nhật</span>
                    </button>
                    <button
                      className={`image-editor-btn small ${drawingSettings.tool === 'circle' ? 'active' : ''}`}
                      onClick={() => setDrawingSettings({ ...drawingSettings, tool: 'circle' })}
                    >
                      <Circle size={18} />
                      <span>Hình tròn</span>
                    </button>
                    <button
                      className={`image-editor-btn small ${drawingSettings.tool === 'line' ? 'active' : ''}`}
                      onClick={() => setDrawingSettings({ ...drawingSettings, tool: 'line' })}
                    >
                      <Minus size={18} />
                      <span>Đường thẳng</span>
                    </button>
                    <button
                      className={`image-editor-btn small ${drawingSettings.tool === 'text' ? 'active' : ''}`}
                      onClick={() => setDrawingSettings({ ...drawingSettings, tool: 'text' })}
                    >
                      <Type size={18} />
                      <span>Text</span>
                    </button>
                  </div>
                </div>

                {/* Color and Stroke */}
                <div className="image-editor-filter-section">
                  <h5>Màu sắc</h5>
                  <div className="image-editor-input">
                    <label>Màu viền</label>
                    <input
                      type="color"
                      value={drawingSettings.color}
                      onChange={(e) => setDrawingSettings({ ...drawingSettings, color: e.target.value })}
                    />
                  </div>
                  <div className="image-editor-slider">
                    <label>
                      <span>Độ dày viền</span>
                      <span className="slider-value">{drawingSettings.strokeWidth}px</span>
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="20"
                      value={drawingSettings.strokeWidth}
                      onChange={(e) => setDrawingSettings({ ...drawingSettings, strokeWidth: parseInt(e.target.value) })}
                    />
                  </div>
                </div>

                {/* Fill (for shapes) */}
                {(drawingSettings.tool === 'rectangle' || drawingSettings.tool === 'circle') && (
                  <div className="image-editor-filter-section">
                    <h5>Tô màu</h5>
                    <div className="image-editor-checkbox">
                      <label>
                        <input
                          type="checkbox"
                          checked={drawingSettings.fillEnabled}
                          onChange={(e) => setDrawingSettings({ ...drawingSettings, fillEnabled: e.target.checked })}
                        />
                        <span>Bật tô màu</span>
                      </label>
                    </div>
                    {drawingSettings.fillEnabled && (
                      <div className="image-editor-input">
                        <label>Màu tô</label>
                        <input
                          type="color"
                          value={drawingSettings.fillColor}
                          onChange={(e) => setDrawingSettings({ ...drawingSettings, fillColor: e.target.value })}
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Text Settings */}
                {drawingSettings.tool === 'text' && (
                  <div className="image-editor-filter-section">
                    <h5>Cài đặt text</h5>
                    <div className="image-editor-select">
                      <label>Font</label>
                      <select
                        value={drawingSettings.fontFamily}
                        onChange={(e) => setDrawingSettings({ ...drawingSettings, fontFamily: e.target.value })}
                      >
                        <option value="Arial">Arial</option>
                        <option value="Helvetica">Helvetica</option>
                        <option value="Times New Roman">Times New Roman</option>
                        <option value="Courier New">Courier New</option>
                        <option value="Verdana">Verdana</option>
                        <option value="Georgia">Georgia</option>
                      </select>
                    </div>
                    <div className="image-editor-slider">
                      <label>
                        <span>Kích thước</span>
                        <span className="slider-value">{drawingSettings.fontSize}px</span>
                      </label>
                      <input
                        type="range"
                        min="12"
                        max="72"
                        value={drawingSettings.fontSize}
                        onChange={(e) => setDrawingSettings({ ...drawingSettings, fontSize: parseInt(e.target.value) })}
                      />
                    </div>
                  </div>
                )}

                {/* Clear Drawings */}
                {drawings.length > 0 && (
                  <div className="image-editor-filter-section">
                    <button
                      className="image-editor-btn small secondary"
                      onClick={() => setDrawings([])}
                    >
                      Xóa tất cả
                    </button>
                  </div>
                )}
              </div>
            )}

            {activeTool === 'watermark' && (
              <div className="image-editor-control-group">
                <h4>Watermark</h4>
                <div className="image-editor-checkbox">
                  <label>
                    <input
                      type="checkbox"
                      checked={watermark.enabled}
                      onChange={(e) => setWatermark({ ...watermark, enabled: e.target.checked })}
                    />
                    <span>Bật watermark</span>
                  </label>
                </div>
                {watermark.enabled && (
                  <>
                    {/* Watermark Type */}
                    <div className="image-editor-filter-section">
                      <h5>Loại watermark</h5>
                      <div className="image-editor-button-group">
                        <button
                          className={`image-editor-btn small ${watermark.type === 'text' ? 'active' : ''}`}
                          onClick={() => setWatermark({ ...watermark, type: 'text' })}
                        >
                          <Type size={18} />
                          <span>Text</span>
                        </button>
                        <button
                          className={`image-editor-btn small ${watermark.type === 'image' ? 'active' : ''}`}
                          onClick={() => setWatermark({ ...watermark, type: 'image' })}
                        >
                          <Download size={18} />
                          <span>Hình ảnh</span>
                        </button>
                      </div>
                    </div>

                    {/* Text Watermark Settings */}
                    {watermark.type === 'text' && (
                      <>
                        <div className="image-editor-filter-section">
                          <h5>Nội dung</h5>
                          <div className="image-editor-input">
                            <label>Text</label>
                            <input
                              type="text"
                              value={watermark.text}
                              onChange={(e) => setWatermark({ ...watermark, text: e.target.value })}
                              placeholder="Nhập text watermark"
                            />
                          </div>
                          <div className="image-editor-select">
                            <label>Font</label>
                            <select
                              value={watermark.fontFamily}
                              onChange={(e) => setWatermark({ ...watermark, fontFamily: e.target.value })}
                            >
                              <option value="Arial">Arial</option>
                              <option value="Helvetica">Helvetica</option>
                              <option value="Times New Roman">Times New Roman</option>
                              <option value="Courier New">Courier New</option>
                              <option value="Verdana">Verdana</option>
                              <option value="Georgia">Georgia</option>
                              <option value="Palatino">Palatino</option>
                              <option value="Garamond">Garamond</option>
                              <option value="Comic Sans MS">Comic Sans MS</option>
                              <option value="Impact">Impact</option>
                            </select>
                          </div>
                          <div className="image-editor-select">
                            <label>Kiểu chữ</label>
                            <select
                              value={watermark.fontStyle}
                              onChange={(e) => setWatermark({ ...watermark, fontStyle: e.target.value as WatermarkSettings['fontStyle'] })}
                            >
                              <option value="normal">Bình thường</option>
                              <option value="bold">Đậm</option>
                              <option value="italic">Nghiêng</option>
                              <option value="bold italic">Đậm nghiêng</option>
                            </select>
                          </div>
                          <div className="image-editor-slider">
                            <label>
                              <span>Kích thước</span>
                              <span className="slider-value">{watermark.fontSize}px</span>
                            </label>
                            <input
                              type="range"
                              min="12"
                              max="72"
                              value={watermark.fontSize}
                              onChange={(e) => setWatermark({ ...watermark, fontSize: parseInt(e.target.value) })}
                            />
                          </div>
                        </div>

                        {/* Text Styling */}
                        <div className="image-editor-filter-section">
                          <h5>Màu sắc</h5>
                          <div className="image-editor-input">
                            <label>Màu chữ</label>
                            <input
                              type="color"
                              value={watermark.textColor}
                              onChange={(e) => setWatermark({ ...watermark, textColor: e.target.value })}
                            />
                          </div>
                          <div className="image-editor-input">
                            <label>Màu viền</label>
                            <input
                              type="color"
                              value={watermark.strokeColor}
                              onChange={(e) => setWatermark({ ...watermark, strokeColor: e.target.value })}
                            />
                          </div>
                          <div className="image-editor-slider">
                            <label>
                              <span>Độ dày viền</span>
                              <span className="slider-value">{watermark.strokeWidth}px</span>
                            </label>
                            <input
                              type="range"
                              min="0"
                              max="10"
                              value={watermark.strokeWidth}
                              onChange={(e) => setWatermark({ ...watermark, strokeWidth: parseInt(e.target.value) })}
                            />
                          </div>
                        </div>

                        {/* Shadow */}
                        <div className="image-editor-filter-section">
                          <h5>Đổ bóng</h5>
                          <div className="image-editor-checkbox">
                            <label>
                              <input
                                type="checkbox"
                                checked={watermark.shadowEnabled}
                                onChange={(e) => setWatermark({ ...watermark, shadowEnabled: e.target.checked })}
                              />
                              <span>Bật đổ bóng</span>
                            </label>
                          </div>
                          {watermark.shadowEnabled && (
                            <>
                              <div className="image-editor-input">
                                <label>Màu bóng</label>
                                <input
                                  type="color"
                                  value={watermark.shadowColor}
                                  onChange={(e) => setWatermark({ ...watermark, shadowColor: e.target.value })}
                                />
                              </div>
                              <div className="image-editor-slider">
                                <label>
                                  <span>Độ mờ bóng</span>
                                  <span className="slider-value">{watermark.shadowBlur}px</span>
                                </label>
                                <input
                                  type="range"
                                  min="0"
                                  max="20"
                                  value={watermark.shadowBlur}
                                  onChange={(e) => setWatermark({ ...watermark, shadowBlur: parseInt(e.target.value) })}
                                />
                              </div>
                              <div className="image-editor-slider">
                                <label>
                                  <span>Offset X</span>
                                  <span className="slider-value">{watermark.shadowOffsetX}px</span>
                                </label>
                                <input
                                  type="range"
                                  min="-20"
                                  max="20"
                                  value={watermark.shadowOffsetX}
                                  onChange={(e) => setWatermark({ ...watermark, shadowOffsetX: parseInt(e.target.value) })}
                                />
                              </div>
                              <div className="image-editor-slider">
                                <label>
                                  <span>Offset Y</span>
                                  <span className="slider-value">{watermark.shadowOffsetY}px</span>
                                </label>
                                <input
                                  type="range"
                                  min="-20"
                                  max="20"
                                  value={watermark.shadowOffsetY}
                                  onChange={(e) => setWatermark({ ...watermark, shadowOffsetY: parseInt(e.target.value) })}
                                />
                              </div>
                            </>
                          )}
                        </div>
                      </>
                    )}

                    {/* Image Watermark Settings */}
                    {watermark.type === 'image' && (
                      <div className="image-editor-filter-section">
                        <h5>Hình ảnh</h5>
                        <div className="image-editor-input">
                          <label>URL hình ảnh</label>
                          <input
                            type="url"
                            value={watermark.imageUrl || ''}
                            onChange={(e) => setWatermark({ ...watermark, imageUrl: e.target.value || null })}
                            placeholder="https://example.com/logo.png"
                          />
                        </div>
                        <div className="image-editor-slider">
                          <label>
                            <span>Kích thước</span>
                            <span className="slider-value">{watermark.imageSize}%</span>
                          </label>
                          <input
                            type="range"
                            min="10"
                            max="100"
                            value={watermark.imageSize}
                            onChange={(e) => setWatermark({ ...watermark, imageSize: parseInt(e.target.value) })}
                          />
                        </div>
                      </div>
                    )}

                    {/* Common Settings */}
                    <div className="image-editor-filter-section">
                      <h5>Cài đặt chung</h5>
                      <div className="image-editor-select">
                        <label>Vị trí</label>
                        <select
                          value={watermark.position}
                          onChange={(e) => setWatermark({ ...watermark, position: e.target.value as WatermarkSettings['position'] })}
                        >
                          <option value="top-left">Góc trên trái</option>
                          <option value="top-right">Góc trên phải</option>
                          <option value="bottom-left">Góc dưới trái</option>
                          <option value="bottom-right">Góc dưới phải</option>
                          <option value="center">Giữa</option>
                        </select>
                      </div>
                      <div className="image-editor-slider">
                        <label>
                          <span>Độ mờ</span>
                          <span className="slider-value">{watermark.opacity}%</span>
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={watermark.opacity}
                          onChange={(e) => setWatermark({ ...watermark, opacity: parseInt(e.target.value) })}
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

