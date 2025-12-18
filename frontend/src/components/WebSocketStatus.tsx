import { useMemo } from 'react';
import { Wifi, WifiOff, AlertCircle } from 'lucide-react';
import { useWebSocket } from '@/hooks/useWebSocket';
import './WebSocketStatus.css';

export function WebSocketStatus() {
	// Only show in development mode
	const isDev = import.meta.env.MODE === 'development' || import.meta.env.DEV;
	
	const { isConnected, reconnectAttempts } = useWebSocket();
	
	// Don't render in production
	if (!isDev) {
		return null;
	}
	
	const status = useMemo(() => {
		if (isConnected) {
			// Don't show anything when connected (everything is working fine)
			return null;
		} else if (reconnectAttempts > 0) {
			return {
				icon: AlertCircle,
				color: '#f59e0b', // amber
				text: 'Reconnecting...',
				tooltip: `Reconnecting (attempt ${reconnectAttempts})`,
				className: 'reconnecting'
			};
		} else {
			return {
				icon: WifiOff,
				color: '#ef4444', // red
				text: 'Disconnected',
				tooltip: 'Real-time updates unavailable',
				className: 'disconnected'
			};
		}
	}, [isConnected, reconnectAttempts]);
	
	// Only show when there's an issue (not connected)
	if (!status) {
		return null;
	}
	
	const Icon = status.icon;
	
	return (
		<div 
			className={`websocket-status websocket-status-${status.className}`}
			title={status.tooltip}
			aria-label={status.tooltip}
		>
			<Icon size={16} color={status.color} />
			<span className="websocket-status-text">{status.text}</span>
			{reconnectAttempts > 0 && (
				<span className="websocket-status-attempts">({reconnectAttempts})</span>
			)}
		</div>
	);
}

