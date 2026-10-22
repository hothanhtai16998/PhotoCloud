import React from 'react';
import { ArrowLeft } from 'lucide-react';

export function CollectionDetailFrame({ backLink, title = 'Bộ sưu tập', stats, metadata, actions, busy = false }: {
  backLink?: React.ReactNode;
  title?: React.ReactNode;
  stats?: React.ReactNode;
  metadata?: React.ReactNode;
  actions?: React.ReactNode;
  busy?: boolean;
}): React.ReactElement {
  return <div className="collection-detail-header" data-collection-detail-frame aria-busy={busy}>
    {backLink ?? <a className="collection-detail-back" href="/collections"><ArrowLeft size={16} aria-hidden="true" /><span>Quay lại bộ sưu tập</span></a>}
    <div className="collection-detail-content">
      <div className="collection-detail-main">
        <div className="collection-detail-title-row"><h1 aria-label={busy ? 'Đang tải tên bộ sưu tập' : undefined}>{busy ? <span className="collection-detail-title-placeholder" aria-hidden="true" /> : title}</h1>{stats}</div>
        {metadata ?? (busy && <div className="collection-detail-meta-placeholder" aria-hidden="true"><span /><span /></div>)}
      </div>
      <div className="collection-detail-actions">{actions ?? (busy && <div className="collection-detail-action-placeholders" aria-hidden="true"><span /><span /><span /></div>)}</div>
    </div>
  </div>;
}

export function CollectionDetailSkeleton(): React.ReactElement {
  return <div className="collection-detail-page" data-loading-scope="local">
    <CollectionDetailFrame busy />
    <div className="collection-detail-grid-placeholder" role="status" aria-label="Đang tải bộ sưu tập">
      {Array.from({ length: 8 }, (_, i) => <span key={i} aria-hidden="true" />)}
    </div>
  </div>;
}
