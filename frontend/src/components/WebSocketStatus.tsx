import { useMemo, useRef, useEffect, useState } from 'react';
import { Wifi, WifiOff, AlertCircle } from 'lucide-react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useAuthStore } from '@/stores/useAuthStore';
import './WebSocketStatus.css';

export function WebSocketStatus() {
	const { isConnected, reconnectAttempts } = useWebSocket();
	const { accessToken, isInitializing } = useAuthStore();
	
	// Track if we've ever had an accessToken to prevent icon from flashing
	const hasAuthRef = useRef(Boolean(accessToken));
	if (accessToken) {
		hasAuthRef.current = true;
	}
	const stableHasAuth = hasAuthRef.current;
	
	// Track if we've ever received a connection state update
	const [hasReceivedActualState, setHasReceivedActualState] = useState(false);
	
	// Once we get the actual connection state, use that instead of optimistic
	useEffect(() => {
		if (isConnected || reconnectAttempts > 0) {
			setHasReceivedActualState(true);
		}
	}, [isConnected, reconnectAttempts]);
	
	// Optimistic: If we have auth and are initializing, assume connected
	// Otherwise, use actual state once we've received it
	const effectiveConnected = useMemo(() => {
		if (!hasReceivedActualState && (stableHasAuth || (isInitializing && accessToken))) {
			return true; // Optimistic: assume connected if authenticated
		}
		return isConnected;
	}, [isConnected, hasReceivedActualState, stableHasAuth, isInitializing, accessToken]);
	
	const status = useMemo(() => {
		if (effectiveConnected) {
			return {
				icon: Wifi,
				color: '#10b981', // green
				tooltip: 'Real-time updates connected',
				className: 'connected'
			};
		} else if (reconnectAttempts > 0) {
			return {
				icon: AlertCircle,
				color: '#f59e0b', // amber
				tooltip: `Reconnecting (attempt ${reconnectAttempts})`,
				className: 'reconnecting'
			};
		} else {
			return {
				icon: WifiOff,
				color: '#ef4444', // red
				tooltip: 'Real-time updates unavailable',
				className: 'disconnected'
			};
		}
	}, [effectiveConnected, reconnectAttempts]);
	
	const Icon = status.icon;
	
	return (
		<div 
			className={`websocket-status websocket-status-${status.className}`}
			title={status.tooltip}
			aria-label={status.tooltip}
		>
			<Icon size={20} color={status.color} />
		</div>
	);
}

