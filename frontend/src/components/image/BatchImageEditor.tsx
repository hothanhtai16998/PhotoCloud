import { useState, useCallback } from 'react';
import { Save, CheckCircle2 } from 'lucide-react';
import type { Image } from '@/types/image';
import { ImageEditor } from './ImageEditor';
import './BatchImageEditor.css';

interface BatchImageEditorProps {
  images: Image[];
  onSave: (editedImages: Array<{ imageId: string; file: File }>) => Promise<void>;
  onCancel: () => void;
}

interface BatchEditSettings {
  filters: {
    brightness: number;
    contrast: number;
    saturation: number;
  };
  watermark: {
    enabled: boolean;
    text: string;
    position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' | 'center';
    opacity: number;
    fontSize: number;
  };
}

export const BatchImageEditor = ({ images, onSave, onCancel }: BatchImageEditorProps) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [processedImages, setProcessedImages] = useState<Map<string, Blob>>(new Map());
  const [isProcessing, setIsProcessing] = useState(false);
  const [editSettings, setEditSettings] = useState<BatchEditSettings>({
    filters: {
      brightness: 0,
      contrast: 0,
      saturation: 0,
    },
    watermark: {
      enabled: false,
      text: '',
      position: 'bottom-right',
      opacity: 50,
      fontSize: 24,
    },
  });

  const currentImage = images[currentImageIndex];
  const processedCount = processedImages.size;

  // Handle saving edited image from ImageEditor
  const handleSaveSingleImage = useCallback(async (editedImageBlob: Blob) => {
    if (!currentImage) return;

    // Store processed image
    setProcessedImages(prev => {
      const next = new Map(prev);
      next.set(currentImage._id, editedImageBlob);
      return next;
    });

    // Move to next image if available
    if (currentImageIndex < images.length - 1) {
      setCurrentImageIndex(prev => prev + 1);
    }
  }, [currentImage, currentImageIndex, images.length]);

  // Apply batch settings to all images
  const handleApplyToAll = useCallback(async () => {
    setIsProcessing(true);
    try {
      const processed = new Map<string, Blob>();

      for (const image of images) {
        const img = new Image();
        // Removed crossOrigin to avoid CORS issues
        // img.crossOrigin = 'anonymous';
        
        await new Promise<void>((resolve, reject) => {
          img.onload = () => {
            try {
              const canvas = document.createElement('canvas');
              canvas.width = img.width;
              canvas.height = img.height;
              const ctx = canvas.getContext('2d');
              if (!ctx) {
                reject(new Error('Failed to get canvas context'));
                return;
              }

              // Apply filters
              ctx.filter = `brightness(${100 + editSettings.filters.brightness}%) contrast(${100 + editSettings.filters.contrast}%) saturate(${100 + editSettings.filters.saturation}%)`;
              ctx.drawImage(img, 0, 0);

              // Apply watermark
              if (editSettings.watermark.enabled && editSettings.watermark.text) {
                ctx.save();
                ctx.filter = 'none';
                ctx.globalAlpha = editSettings.watermark.opacity / 100;
                ctx.font = `bold ${editSettings.watermark.fontSize}px Arial`;
                ctx.fillStyle = '#ffffff';
                ctx.strokeStyle = '#000000';
                ctx.lineWidth = 2;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';

                const textMetrics = ctx.measureText(editSettings.watermark.text);
                const textWidth = textMetrics.width;
                const textHeight = editSettings.watermark.fontSize;

                let x = 0;
                let y = 0;
                const padding = 20;

                switch (editSettings.watermark.position) {
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

                ctx.strokeText(editSettings.watermark.text, x, y);
                ctx.fillText(editSettings.watermark.text, x, y);
                ctx.restore();
              }

              canvas.toBlob((blob) => {
                if (blob) {
                  processed.set(image._id, blob);
                }
                resolve();
              }, 'image/jpeg', 0.92);
            } catch (error) {
              reject(error);
            }
          };
          img.onerror = reject;
          img.src = image.imageUrl || image.regularUrl || image.smallUrl || '';
        });
      }

      setProcessedImages(processed);
    } catch (error) {
      console.error('Failed to process images:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [images, editSettings]);

  // Save all processed images
  const handleSaveAll = useCallback(async () => {
    if (processedImages.size === 0) {
      return;
    }

    setIsProcessing(true);
    try {
      const editedImages = Array.from(processedImages.entries()).map(([imageId, blob]) => {
        const file = new File([blob], `image-${imageId}.jpg`, { type: 'image/jpeg' });
        return {
          imageId,
          file,
        };
      });
      await onSave(editedImages);
    } catch (error) {
      console.error('Failed to save images:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [processedImages, onSave]);

  if (images.length === 0) {
    return (
      <div className="batch-image-editor">
        <div className="batch-editor-empty">
          <p>Không có ảnh nào để chỉnh sửa</p>
        </div>
      </div>
    );
  }

  return (
    <div className="batch-image-editor">
      <div className="batch-editor-header">
        <div className="batch-editor-title">
          <h3>Chỉnh sửa hàng loạt</h3>
          <span className="batch-editor-count">
            {processedCount}/{images.length} ảnh đã xử lý
          </span>
        </div>
        <div className="batch-editor-actions">
          <button
            className="batch-editor-btn secondary"
            onClick={handleApplyToAll}
            disabled={isProcessing}
          >
            Áp dụng cho tất cả
          </button>
          <button
            className="batch-editor-btn secondary"
            onClick={onCancel}
            disabled={isProcessing}
          >
            Hủy
          </button>
          <button
            className="batch-editor-btn primary"
            onClick={handleSaveAll}
            disabled={isProcessing || processedImages.size === 0}
          >
            {isProcessing ? (
              <>
                <div className="loading-spinner-small" />
                <span>Đang xử lý...</span>
              </>
            ) : (
              <>
                <Save size={18} />
                <span>Lưu tất cả ({processedImages.size})</span>
              </>
            )}
          </button>
        </div>
      </div>

      <div className="batch-editor-content">
        {/* Settings Panel */}
        <div className="batch-editor-settings">
          <h4>Cài đặt chung</h4>
          
          <div className="batch-editor-setting-group">
            <label>Độ sáng</label>
            <input
              type="range"
              min="-100"
              max="100"
              value={editSettings.filters.brightness}
              onChange={(e) => setEditSettings({
                ...editSettings,
                filters: { ...editSettings.filters, brightness: parseInt(e.target.value) },
              })}
            />
            <span className="setting-value">{editSettings.filters.brightness}</span>
          </div>

          <div className="batch-editor-setting-group">
            <label>Độ tương phản</label>
            <input
              type="range"
              min="-100"
              max="100"
              value={editSettings.filters.contrast}
              onChange={(e) => setEditSettings({
                ...editSettings,
                filters: { ...editSettings.filters, contrast: parseInt(e.target.value) },
              })}
            />
            <span className="setting-value">{editSettings.filters.contrast}</span>
          </div>

          <div className="batch-editor-setting-group">
            <label>Độ bão hòa</label>
            <input
              type="range"
              min="-100"
              max="100"
              value={editSettings.filters.saturation}
              onChange={(e) => setEditSettings({
                ...editSettings,
                filters: { ...editSettings.filters, saturation: parseInt(e.target.value) },
              })}
            />
            <span className="setting-value">{editSettings.filters.saturation}</span>
          </div>

          <div className="batch-editor-setting-group">
            <label>
              <input
                type="checkbox"
                checked={editSettings.watermark.enabled}
                onChange={(e) => setEditSettings({
                  ...editSettings,
                  watermark: { ...editSettings.watermark, enabled: e.target.checked },
                })}
              />
              <span>Bật watermark</span>
            </label>
          </div>

          {editSettings.watermark.enabled && (
            <>
              <div className="batch-editor-setting-group">
                <label>Nội dung watermark</label>
                <input
                  type="text"
                  value={editSettings.watermark.text}
                  onChange={(e) => setEditSettings({
                    ...editSettings,
                    watermark: { ...editSettings.watermark, text: e.target.value },
                  })}
                  placeholder="Nhập text watermark"
                />
              </div>

              <div className="batch-editor-setting-group">
                <label>Vị trí</label>
                <select
                  value={editSettings.watermark.position}
                  onChange={(e) => setEditSettings({
                    ...editSettings,
                    watermark: { ...editSettings.watermark, position: e.target.value as BatchEditSettings['watermark']['position'] },
                  })}
                >
                  <option value="top-left">Góc trên trái</option>
                  <option value="top-right">Góc trên phải</option>
                  <option value="bottom-left">Góc dưới trái</option>
                  <option value="bottom-right">Góc dưới phải</option>
                  <option value="center">Giữa</option>
                </select>
              </div>
            </>
          )}
        </div>

        {/* Image Editor for Current Image */}
        <div className="batch-editor-main">
          <div className="batch-editor-nav">
            <button
              className="batch-editor-nav-btn"
              onClick={() => setCurrentImageIndex(prev => Math.max(0, prev - 1))}
              disabled={currentImageIndex === 0}
            >
              ← Trước
            </button>
            <span className="batch-editor-nav-info">
              Ảnh {currentImageIndex + 1} / {images.length}
            </span>
            <button
              className="batch-editor-nav-btn"
              onClick={() => setCurrentImageIndex(prev => Math.min(images.length - 1, prev + 1))}
              disabled={currentImageIndex === images.length - 1}
            >
              Sau →
            </button>
          </div>

          {currentImage && (
            <div className="batch-editor-image-wrapper">
              <ImageEditor
                key={currentImage._id}
                imageUrl={currentImage.imageUrl || currentImage.regularUrl || currentImage.smallUrl || ''}
                imageTitle={currentImage.imageTitle || ''}
                onSave={handleSaveSingleImage}
                onCancel={() => {}}
              />
              {processedImages.has(currentImage._id) && (
                <div className="batch-editor-processed-badge">
                  <CheckCircle2 size={20} />
                  <span>Đã xử lý</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

