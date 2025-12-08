import { memo, useCallback, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import type { ImageData } from './hooks/useImageUpload';
import type { Category } from '@/services/categoryService';
import type { Coordinates } from '@/types/common';
import { useUserStore } from '@/stores/useUserStore';
import { t } from '@/i18n';
import './UploadForm.css';

interface UploadFormProps {
  imageData: ImageData;
  index: number;
  categories: Category[];
  loadingCategories: boolean;
  onUpdate: (index: number, field: 'title' | 'category' | 'location' | 'cameraModel' | 'tags', value: string | string[]) => void;
  onUpdateCoordinates: (index: number, coordinates: Coordinates | undefined) => void;
}

export const UploadForm = memo(({
  imageData,
  index,
  categories,
  loadingCategories,
  onUpdate,
  onUpdateCoordinates: _onUpdateCoordinates,
}: UploadFormProps) => {
  const { user } = useUserStore();
  const isAdmin = useMemo(() => user?.isAdmin === true || user?.isSuperAdmin === true, [user]);

  // Memoize handlers to prevent re-renders
  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdate(index, 'title', e.target.value);
  }, [index, onUpdate]);

  const handleCategoryChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    onUpdate(index, 'category', e.target.value);
  }, [index, onUpdate]);

  const handleTagsChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const tagString = e.target.value;
    const tagsArray = tagString.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
    onUpdate(index, 'tags', tagsArray);
  }, [index, onUpdate]);

  const tagsValue = useMemo(() => {
    return Array.isArray(imageData.tags) ? imageData.tags.join(', ') : imageData.tags || '';
  }, [imageData.tags]);

  return (
    <div className="upload-form-container">
      {/* Title - sticks to image, same width, no padding, no border radius */}
      <Input
        type="text"
        value={imageData.title}
        onChange={handleTitleChange}
        placeholder={t('image.titlePlaceholder')}
        className="upload-form-input"
      />

      {/* Category - only shown for admin users, sticks to title, same width, no padding, no border radius */}
      {isAdmin && (
        <div>
          {loadingCategories ? (
            <div className="upload-form-category-loading">
              {t('common.loading')}
            </div>
          ) : categories.length === 0 ? (
            <div className="upload-form-category-empty">
              {t('admin.noCategories')}
            </div>
          ) : (
            <select
              value={imageData.category}
              onChange={handleCategoryChange}
              className="upload-form-select"
            >
              <option value="">{t('admin.selectCategory')}</option>
              {categories.map((cat) => (
                <option key={cat._id} value={cat._id}>
                  {cat.name}
                </option>
              ))}
            </select>
          )}
          {imageData.errors.category && (
            <p className="upload-form-error">
              {imageData.errors.category}
            </p>
          )}
        </div>
      )}

      {/* Tags - shown for all users, below category/title, same style as title */}
      <Input
        type="text"
        value={tagsValue}
        onChange={handleTagsChange}
        placeholder={t('collections.tagsPlaceholder')}
        className="upload-form-input"
      />
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison to prevent unnecessary re-renders
  return (
    prevProps.imageData.title === nextProps.imageData.title &&
    prevProps.imageData.category === nextProps.imageData.category &&
    prevProps.imageData.tags === nextProps.imageData.tags &&
    prevProps.imageData.errors === nextProps.imageData.errors &&
    prevProps.index === nextProps.index &&
    prevProps.loadingCategories === nextProps.loadingCategories &&
    prevProps.categories.length === nextProps.categories.length
  );
});

