interface EditImageTabsProps {
  activeTab: 'details' | 'tags' | 'exif';
  onTabChange: (tab: 'details' | 'tags' | 'exif') => void;
}

export const EditImageTabs = ({ activeTab, onTabChange }: EditImageTabsProps) => {
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
    </div>
  );
};


