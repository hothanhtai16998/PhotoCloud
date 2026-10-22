import './SessionRecoveryPanel.css';

export function SessionRecoveryPanel({ message, busy = false, onRetry }: {
  message: string;
  busy?: boolean;
  onRetry: () => void;
}) {
  return <div className="session-recovery-panel" role="status">
    <p>{message}</p>
    <button type="button" disabled={busy} onClick={onRetry}>{busy ? 'Đang thử lại…' : 'Thử lại'}</button>
  </div>;
}
