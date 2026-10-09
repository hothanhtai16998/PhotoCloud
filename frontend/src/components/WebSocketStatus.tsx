import { memo } from 'react';
import { Wifi, WifiOff, AlertCircle } from 'lucide-react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useAuthStore } from '@/stores/useAuthStore';
import './WebSocketStatus.css';

const SOCKET_OPTIONS = {};
const CONNECTED = { icon: Wifi, tooltip: 'Real-time updates connected', className: 'connected' };
const DISCONNECTED = { icon: WifiOff, tooltip: 'Real-time updates unavailable', className: 'disconnected' };
const CONNECTING = { icon: Wifi, tooltip: 'Checking real-time connection', className: 'connecting' };

export const WebSocketStatus = memo(function WebSocketStatus() {
  const { isConnected, reconnectAttempts } = useWebSocket(SOCKET_OPTIONS);
  const isInitializing = useAuthStore(state => state.isInitializing);
  const status = isConnected ? CONNECTED : reconnectAttempts > 0
    ? { icon: AlertCircle, tooltip: `Reconnecting (attempt ${reconnectAttempts})`, className: 'reconnecting' }
    : isInitializing ? CONNECTING : DISCONNECTED;
  const Icon = status.icon;

  return (
    <div
      className={`websocket-status websocket-status-${status.className}`}
      title={status.tooltip}
      role="status"
      aria-live="polite"
      aria-label={status.tooltip}
    >
      <Icon size={20} aria-hidden="true" />
    </div>
  );
});
