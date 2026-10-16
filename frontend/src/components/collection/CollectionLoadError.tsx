import { Link } from 'react-router-dom';
import './CollectionLoadError.css';
export function CollectionLoadError({ message, onRetry, busy = false, backTo }: { message: string; onRetry: () => void; busy?: boolean; backTo?: string }) {
 return <div className="collection-load-error" role="alert"><p>{message}</p><div className="collection-load-error-actions"><button type="button" disabled={busy} onClick={onRetry}>{busy ? 'Đang tải…' : 'Thử lại'}</button>{backTo && <Link to={backTo}>Quay lại danh sách</Link>}</div></div>;
}
