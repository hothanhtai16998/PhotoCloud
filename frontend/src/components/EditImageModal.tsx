import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, MapPin, Camera, HelpCircle } from 'lucide-react';
import type { Image } from '@/types/image';
import { TagInput } from './ui/TagInput';
import { EditImageTabs } from './EditImage/EditImageTabs';
import { useEditImageForm } from './EditImage/hooks/useEditImageForm';
import { Button } from '@/components/ui/button';
import { t } from '@/i18n';
import { useScrollLock } from '@/hooks/useScrollLock';
import './EditImageModal.css';

interface EditImageModalProps {
  image: Image;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (updatedImage: Image) => void;
}

function EditImageModal({ image, isOpen, onClose, onUpdate }: EditImageModalProps) {
  useScrollLock(isOpen, '.edit-image-modal');
  const [activeTab, setActiveTab] = useState<'details' | 'tags' | 'exif'>('details');

  const {
    isSubmitting,
    imageTitle,
    setImageTitle,
    location,
    setLocation,
    cameraModel,
    setCameraModel,
    cameraMake,
    setCameraMake,
    focalLength,
    setFocalLength,
    aperture,
    setAperture,
    shutterSpeed,
    setShutterSpeed,
    iso,
    setIso,
    tags,
    setTags,
    description,
    setDescription,
    canEdit,
    handleSubmit,
  } = useEditImageForm({ image, isOpen, onUpdate, onClose });

  if (!isOpen) return null;

  return createPortal(
    <div className="edit-image-modal-overlay" onClick={onClose}>
      <div className="edit-image-modal" role="dialog" aria-modal="true" aria-label={t('imagePage.editImage')} onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="edit-modal-header">
          <h2>{t('imagePage.editImage')}</h2>
          <Button 
            variant="ghost" 
            size="icon" 
            className="edit-modal-close" 
            onClick={onClose} 
            aria-label={t('common.close')}
          >
            <X size={20} />
          </Button>
        </div>

        {/* Tabs */}
        <EditImageTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />

        {/* Tab Content */}
        <form className="edit-modal-content" onSubmit={handleSubmit}>
          {activeTab === 'details' && (
            <div className="edit-modal-tab-panel">
              <div className="edit-form-group">
                <label htmlFor="title">{t('imagePage.title')}</label>
                <input
                  id="title"
                  type="text"
                  className="edit-form-input"
                  value={imageTitle}
                  onChange={(e) => setImageTitle(e.target.value)}
                  placeholder={t('imagePage.titlePlaceholder')}
                  required
                  maxLength={200}
                />
              </div>

              <div className="edit-form-group">
                <label htmlFor="location">
                  <MapPin size={16} />
                  {t('imagePage.location')}
                </label>
                <input
                  id="location"
                  type="text"
                  className="edit-form-input"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder={t('imagePage.locationPlaceholder')}
                  maxLength={200}
                />
                {location && (
                  <button
                    type="button"
                    className="edit-form-clear"
                    onClick={() => setLocation('')}
                    aria-label={t('imagePage.clearLocation')}
                  >
                    <X size={16} />
                  </button>
                )}
              </div>

              <div className="edit-form-group">
                <label htmlFor="description">{t('imagePage.description')}</label>
                <textarea
                  id="description"
                  className="edit-form-textarea"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t('imagePage.descriptionPlaceholder')}
                  maxLength={600}
                  rows={4}
                />
                <div className="edit-form-char-count">{description.length}/600</div>
              </div>
            </div>
          )}

          {activeTab === 'exif' && (
            <div className="edit-modal-tab-panel">
              <div className="edit-exif-grid">
                {/* Camera Make */}
                <div className="edit-form-group">
                  <label htmlFor="cameraMake" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Camera size={16} />
                    {t('imagePage.cameraMake')}
                    <div className="tooltip-wrapper">
                      <HelpCircle size={14} className="tooltip-icon" />
                      <span className="tooltip-text">
                        {t('imagePage.cameraMakeTooltip')}
                      </span>
                    </div>
                  </label>
                  <input
                    id="cameraMake"
                    type="text"
                    className="edit-form-input"
                    value={cameraMake}
                    onChange={(e) => setCameraMake(e.target.value)}
                    placeholder={t('imagePage.cameraMakePlaceholder')}
                    maxLength={50}
                  />
                </div>

                {/* Camera Model */}
                <div className="edit-form-group">
                  <label htmlFor="cameraModel" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Camera size={16} />
                    {t('imagePage.cameraModel')}
                    <div className="tooltip-wrapper">
                      <HelpCircle size={14} className="tooltip-icon" />
                      <span className="tooltip-text">
                        {t('imagePage.cameraModelTooltip')}
                      </span>
                    </div>
                  </label>
                  <input
                    id="cameraModel"
                    type="text"
                    className="edit-form-input"
                    value={cameraModel}
                    onChange={(e) => setCameraModel(e.target.value)}
                    placeholder={t('imagePage.cameraModelPlaceholder')}
                    maxLength={100}
                  />
                </div>

                {/* Focal Length */}
                <div className="edit-form-group">
                  <label htmlFor="focalLength" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {t('imagePage.focalLength')}
                    <div className="tooltip-wrapper">
                      <HelpCircle size={14} className="tooltip-icon" />
                      <span className="tooltip-text">
                        {t('imagePage.focalLengthTooltip')}
                      </span>
                    </div>
                  </label>
                  <input
                    id="focalLength"
                    type="number"
                    step="0.1"
                    min="0"
                    className="edit-form-input"
                    value={focalLength}
                    onChange={(e) => setFocalLength(e.target.value)}
                    placeholder="e.g., 60.0"
                  />
                </div>

                {/* Aperture */}
                <div className="edit-form-group">
                  <label htmlFor="aperture" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {t('imagePage.aperture')}
                    <div className="tooltip-wrapper">
                      <HelpCircle size={14} className="tooltip-icon" />
                      <span className="tooltip-text">
                        {t('imagePage.apertureTooltip')}
                      </span>
                    </div>
                  </label>
                  <input
                    id="aperture"
                    type="number"
                    step="0.1"
                    min="0"
                    className="edit-form-input"
                    value={aperture}
                    onChange={(e) => setAperture(e.target.value)}
                    placeholder="e.g., 9.0"
                  />
                </div>

                {/* Shutter Speed */}
                <div className="edit-form-group">
                  <label htmlFor="shutterSpeed" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {t('imagePage.shutterSpeed')}
                    <div className="tooltip-wrapper">
                      <HelpCircle size={14} className="tooltip-icon" />
                      <span className="tooltip-text">
                        {t('imagePage.shutterSpeedTooltip')}
                      </span>
                    </div>
                  </label>
                  <input
                    id="shutterSpeed"
                    type="text"
                    className="edit-form-input"
                    value={shutterSpeed}
                    onChange={(e) => setShutterSpeed(e.target.value)}
                    placeholder="e.g., 1/80 or 2s"
                    maxLength={20}
                  />
                </div>

                {/* ISO */}
                <div className="edit-form-group">
                  <label htmlFor="iso" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {t('imagePage.iso')}
                    <div className="tooltip-wrapper">
                      <HelpCircle size={14} className="tooltip-icon" />
                      <span className="tooltip-text">
                        {t('imagePage.isoTooltip')}
                      </span>
                    </div>
                  </label>
                  <input
                    id="iso"
                    type="number"
                    min="0"
                    className="edit-form-input"
                    value={iso}
                    onChange={(e) => setIso(e.target.value)}
                    placeholder="e.g., 100"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'tags' && (
            <div className="edit-modal-tab-panel">
              <TagInput
                tags={tags}
                onChange={setTags}
                placeholder="Enter tags and press Enter (e.g., nature, landscape, sunset)..."
                maxTags={20}
                maxTagLength={50}
              />
            </div>
          )}

          {/* Form Actions */}
          <div className="edit-modal-actions">
            <Button
              type="button"
              variant="outline"
              className="edit-modal-btn edit-modal-btn-cancel"
              onClick={onClose}
              disabled={isSubmitting}
            >
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              className="edit-modal-btn edit-modal-btn-submit"
              loading={isSubmitting}
              disabled={!canEdit}
            >
              {t('common.save')}
            </Button>
          </div>
        </form>
      </div>
    </div>, document.body
  );
}

export default EditImageModal;
