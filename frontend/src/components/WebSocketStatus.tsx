import { memo } from 'react';
import { Radio, RefreshCw, CirclePause } from 'lucide-react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useAuthStore } from '@/stores/useAuthStore';
import './WebSocketStatus.css';

const SOCKET_OPTIONS = {};
const CONNECTED = { icon: Radio, tooltip: 'Cập nhật trực tiếp đang hoạt động', className: 'connected' };
const DISCONNECTED = { icon: CirclePause, tooltip: 'Cập nhật trực tiếp đang tạm ngưng', className: 'disconnected' };
const CONNECTING = { icon: RefreshCw, tooltip: 'Đang kết nối cập nhật trực tiếp', className: 'connecting' };

export const WebSocketStatus = memo(function WebSocketStatus() {
  const { isConnected, reconnectAttempts } = useWebSocket(SOCKET_OPTIONS);
  const isInitializing = useAuthStore(state => state.isInitializing);
  const status = isConnected ? CONNECTED : reconnectAttempts > 0
    ? { icon: RefreshCw, tooltip: 'Đang kết nối lại cập nhật trực tiếp', className: 'reconnecting' }
    : isInitializing ? CONNECTING : DISCONNECTED;
  const Icon = status.icon;

  return (
    <div
      className={`websocket-status websocket-status-${status.className}`}
      data-tooltip={status.tooltip}
      tabIndex={0}
      role="status"
      aria-live="polite"
      aria-label={status.tooltip}
    >
      <Icon size={20} aria-hidden="true" />
    </div>
  );
});
