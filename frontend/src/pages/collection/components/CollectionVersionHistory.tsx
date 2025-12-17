import { useState } from 'react';
import { History, RotateCcw, Clock } from 'lucide-react';
import type { CollectionVersion } from '@/services/collectionVersionService';

interface CollectionVersionHistoryProps {
  versions: CollectionVersion[];
  loadingVersions: boolean;
  restoringVersion: number | null;
  canEdit: boolean;
  onRestoreVersion: (versionNumber: number) => void;
}

export const CollectionVersionHistory = ({
  versions,
  loadingVersions,
  restoringVersion,
  canEdit,
  onRestoreVersion,
}: CollectionVersionHistoryProps) => {
  const [showVersionHistory, setShowVersionHistory] = useState(false);

  // Format version change description
  const getVersionChangeDescription = (version: CollectionVersion): string => {
    const changeTypeMap: Record<string, string> = {
      created: 'Tạo mới',
      updated: 'Cập nhật',
      image_added: 'Thêm ảnh',
      image_removed: 'Xóa ảnh',
      reordered: 'Sắp xếp lại',
      collaborator_added: 'Thêm cộng tác viên',
      collaborator_removed: 'Xóa cộng tác viên',
      permission_changed: 'Thay đổi quyền',
    };
    return changeTypeMap[version.changes.type] || version.changes.description || 'Thay đổi';
  };

  // Format time ago
  const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Vừa xong';
    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays < 7) return `${diffDays} ngày trước`;
    return date.toLocaleDateString('vi-VN');
  };

  if (!canEdit) return null;

  return (
    <div className="collection-detail-versions-wrapper">
      <div className="collection-versions-header">
        <h2>
          <History size={20} />
          Lịch sử phiên bản
        </h2>
        <button
          className="collection-versions-toggle"
          onClick={() => setShowVersionHistory(!showVersionHistory)}
        >
          {showVersionHistory ? 'Ẩn' : 'Hiện'} ({versions.length})
        </button>
      </div>

      {showVersionHistory && (
        <div className="collection-versions-content">
          {loadingVersions ? (
            <div className="collection-versions-loading">
              <p>Đang tải...</p>
            </div>
          ) : versions.length === 0 ? (
            <div className="collection-versions-empty">
              <Clock size={48} />
              <p>Chưa có lịch sử phiên bản</p>
            </div>
          ) : (
            <div className="collection-versions-list">
              {versions.map((version) => (
                <div key={version._id} className="collection-version-item">
                  <div className="collection-version-header">
                    <div className="collection-version-info">
                      <span className="collection-version-number">
                        Phiên bản {version.versionNumber}
                      </span>
                      <span className="collection-version-type">
                        {getVersionChangeDescription(version)}
                      </span>
                    </div>
                    <div className="collection-version-meta">
                      <span className="collection-version-time">
                        {formatTimeAgo(version.createdAt)}
                      </span>
                      {typeof version.changedBy === 'object' && (
                        <span className="collection-version-author">
                          bởi {version.changedBy.displayName || version.changedBy.username}
                        </span>
                      )}
                    </div>
                  </div>
                  {version.changes.description && (
                    <div className="collection-version-description">
                      {version.changes.description}
                    </div>
                  )}
                  {version.note && (
                    <div className="collection-version-note">
                      <strong>Ghi chú:</strong> {version.note}
                    </div>
                  )}
                  {version.versionNumber > 1 && (
                    <button
                      className="collection-version-restore-btn"
                      onClick={() => onRestoreVersion(version.versionNumber)}
                      disabled={restoringVersion === version.versionNumber}
                      title="Khôi phục về phiên bản này"
                    >
                      <RotateCcw size={16} />
                      {restoringVersion === version.versionNumber ? 'Đang khôi phục...' : 'Khôi phục'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

