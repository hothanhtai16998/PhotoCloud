import { Image as ImageIcon } from 'lucide-react';

interface EditImageTabsProps {
  activeTab: 'details' | 'tags' | 'exif' | 'edit';
  onTabChange: (tab: 'details' | 'tags' | 'exif' | 'edit') => void;
  onEditClick: () => void;
}

export const EditImageTabs = ({ activeTab, onTabChange, onEditClick }: EditImageTabsProps) => {
  return (
    <div className="edit-modal-tabs">
      <button
        className={`edit-modal-tab ${activeTab === 'details' ? 'active' : ''}`}
        onClick={() => onTabChange('details')}
      >
        Chi tiết
      </button>
      <button
        className={`edit-modal-tab ${activeTab === 'tags' ? 'active' : ''}`}
        onClick={() => onTabChange('tags')}
      >
        Tags
      </button>
      <button
        className={`edit-modal-tab ${activeTab === 'exif' ? 'active' : ''}`}
        onClick={() => onTabChange('exif')}
      >
        Exif
      </button>
      <button
        className={`edit-modal-tab ${activeTab === 'edit' ? 'active' : ''}`}
        onClick={onEditClick}
      >
        <ImageIcon size={16} />
        Chỉnh sửa ảnh
      </button>
    </div>
  );
};


