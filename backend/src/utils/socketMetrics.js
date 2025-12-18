import { logger } from './logger.js';

/**
 * WebSocket Metrics Tracker
 * Tracks connections, events, latency, and room statistics
 */
class SocketMetrics {
	constructor() {
		this.startTime = Date.now();
		
		// Connection metrics
		this.connections = {
			total: 0,
			active: 0,
			failed: 0,
			reconnected: 0,
			disconnected: 0,
		};

		// Event metrics
		this.events = {
			total: 0,
			byType: new Map(), // eventType -> count
			latency: [], // Array of latencies (keep last 1000)
			maxLatencyHistory: 1000,
		};

		// Room metrics
		this.rooms = new Map(); // roomId -> userCount
		
		// Error tracking
		this.errors = {
			auth: 0,
			join: 0,
			emit: 0,
			other: 0,
		};

		// Track connection timestamps for calculating average session duration
		this.connectionTimestamps = new Map(); // socketId -> timestamp
		this.userConnections = new Map(); // socketId -> userId (for unique user tracking)
		
		// Track session durations
		this.sessionDurations = []; // Array of session durations in ms (keep last 100)
		this.maxSessionHistory = 100;
		
		// Track unique users (for active user count)
		this.activeUserIds = new Set(); // userIds currently connected
		this.uniqueUsersLastHour = new Set(); // userIds connected in last hour
		this.uniqueUsersLastHourTimestamps = new Map(); // userId -> last connection time
		
		// Track peak connections
		this.peakConnections = 0;
		
		// Track room joins/leaves
		this.roomJoins = 0;
		this.roomLeaves = 0;
		
		// Track event delivery (successful emits)
		this.eventsDelivered = 0;
		this.eventsFailed = 0;
		
		// Track connection rate (connections per minute)
		this.connectionTimes = []; // Array of connection timestamps (keep last 1000)
		this.maxConnectionHistory = 1000;
		
		// Track metrics over time (for trends)
		this.metricsHistory = []; // Array of snapshots (keep last 60 = 5 minutes at 5s intervals)
		this.maxHistorySize = 60;
		
		// Track room size distribution
		this.roomSizeDistribution = new Map(); // size -> count
	}

	/**
	 * Record a new connection
	 * @param {string} socketId - Socket ID
	 * @param {string} userId - User ID (optional, for unique user tracking)
	 */
	recordConnection(socketId, userId = null) {
		this.connections.total++;
		this.connections.active++;
		this.connectionTimestamps.set(socketId, Date.now());
		
		// Track user for unique user count
		if (userId) {
			this.userConnections.set(socketId, userId);
			this.activeUserIds.add(userId);
			
			// Track unique users in last hour
			const now = Date.now();
			this.uniqueUsersLastHour.add(userId);
			this.uniqueUsersLastHourTimestamps.set(userId, now);
			
			// Clean up old entries (older than 1 hour)
			for (const [uid, timestamp] of this.uniqueUsersLastHourTimestamps.entries()) {
				if (now - timestamp > 3600000) { // 1 hour
					this.uniqueUsersLastHour.delete(uid);
					this.uniqueUsersLastHourTimestamps.delete(uid);
				}
			}
		}
		
		// Track peak connections
		if (this.connections.active > this.peakConnections) {
			this.peakConnections = this.connections.active;
		}
		
		// Track connection time for rate calculation
		this.connectionTimes.push(Date.now());
		if (this.connectionTimes.length > this.maxConnectionHistory) {
			this.connectionTimes.shift();
		}
		
		logger.debug(`Socket metrics: Connection recorded. Active: ${this.connections.active}`);
	}

	/**
	 * Record a disconnection
	 * @param {string} socketId - Socket ID
	 */
	recordDisconnection(socketId) {
		this.connections.active = Math.max(0, this.connections.active - 1);
		this.connections.disconnected++;
		
		// Remove user from active users if this was their last connection
		const userId = this.userConnections.get(socketId);
		if (userId) {
			// Check if user has other active connections
			let hasOtherConnections = false;
			for (const [sid, uid] of this.userConnections.entries()) {
				if (uid === userId && sid !== socketId) {
					hasOtherConnections = true;
					break;
				}
			}
			if (!hasOtherConnections) {
				this.activeUserIds.delete(userId);
			}
			this.userConnections.delete(socketId);
		}
		
		// Calculate session duration if we have a timestamp
		const timestamp = this.connectionTimestamps.get(socketId);
		if (timestamp) {
			const duration = Date.now() - timestamp;
			this.sessionDurations.push(duration);
			if (this.sessionDurations.length > this.maxSessionHistory) {
				this.sessionDurations.shift();
			}
			this.connectionTimestamps.delete(socketId);
		}
		
		logger.debug(`Socket metrics: Disconnection recorded. Active: ${this.connections.active}`);
	}

	/**
	 * Record a failed connection attempt
	 */
	recordFailedConnection() {
		this.connections.failed++;
		logger.debug(`Socket metrics: Failed connection recorded. Total failed: ${this.connections.failed}`);
	}

	/**
	 * Record a reconnection
	 */
	recordReconnection() {
		this.connections.reconnected++;
		logger.debug(`Socket metrics: Reconnection recorded. Total reconnected: ${this.connections.reconnected}`);
	}

	/**
	 * Record an event emission
	 * @param {string} eventType - Type of event (e.g., 'notification', 'collection:updated')
	 * @param {number} latency - Event latency in milliseconds
	 */
	recordEvent(eventType, latency = 0) {
		this.events.total++;
		this.eventsDelivered++;
		
		// Track by type
		const count = this.events.byType.get(eventType) || 0;
		this.events.byType.set(eventType, count + 1);
		
		// Track latency
		if (latency > 0) {
			this.events.latency.push(latency);
			
			// Keep only last N latencies
			if (this.events.latency.length > this.events.maxLatencyHistory) {
				this.events.latency.shift();
			}
		}
	}

	/**
	 * Record a room join
	 * @param {string} roomId - Room ID
	 */
	recordRoomJoin(roomId) {
		const count = this.rooms.get(roomId) || 0;
		const newCount = count + 1;
		this.rooms.set(roomId, newCount);
		this.roomJoins++;
		
		// Update room size distribution
		if (count > 0) {
			const oldDist = this.roomSizeDistribution.get(count) || 0;
			this.roomSizeDistribution.set(count, Math.max(0, oldDist - 1));
		}
		const newDist = this.roomSizeDistribution.get(newCount) || 0;
		this.roomSizeDistribution.set(newCount, newDist + 1);
		
		logger.debug(`Socket metrics: Room join recorded. Room: ${roomId}, Users: ${newCount}`);
	}

	/**
	 * Record a room leave
	 * @param {string} roomId - Room ID
	 */
	recordRoomLeave(roomId) {
		const count = this.rooms.get(roomId) || 0;
		const newCount = Math.max(0, count - 1);
		
		// Update room size distribution
		if (count > 0) {
			const oldDist = this.roomSizeDistribution.get(count) || 0;
			this.roomSizeDistribution.set(count, Math.max(0, oldDist - 1));
		}
		if (newCount > 0) {
			const newDist = this.roomSizeDistribution.get(newCount) || 0;
			this.roomSizeDistribution.set(newCount, newDist + 1);
		}
		
		if (newCount === 0) {
			this.rooms.delete(roomId);
		} else {
			this.rooms.set(roomId, newCount);
		}
		
		this.roomLeaves++;
		logger.debug(`Socket metrics: Room leave recorded. Room: ${roomId}, Users: ${newCount}`);
	}

	/**
	 * Record an error
	 * @param {string} errorType - Type of error ('auth', 'join', 'emit', 'other')
	 */
	recordError(errorType = 'other') {
		if (this.errors.hasOwnProperty(errorType)) {
			this.errors[errorType]++;
		} else {
			this.errors.other++;
		}
		
		// Track failed event delivery
		if (errorType === 'emit') {
			this.eventsFailed++;
		}
		
		logger.debug(`Socket metrics: Error recorded. Type: ${errorType}`);
	}

	/**
	 * Get comprehensive statistics
	 * @returns {object} Statistics object
	 */
	getStats() {
		const uptime = Date.now() - this.startTime;
		const uptimeSeconds = Math.floor(uptime / 1000);
		const uptimeMinutes = Math.floor(uptimeSeconds / 60);
		const uptimeHours = Math.floor(uptimeMinutes / 60);

		// Calculate average latency
		let avgLatency = 0;
		let minLatency = 0;
		let maxLatency = 0;
		
		if (this.events.latency.length > 0) {
			const sorted = [...this.events.latency].sort((a, b) => a - b);
			avgLatency = sorted.reduce((a, b) => a + b, 0) / sorted.length;
			minLatency = sorted[0];
			maxLatency = sorted[sorted.length - 1];
		}

		// Calculate events per second
		const eventsPerSecond = uptimeSeconds > 0 
			? (this.events.total / uptimeSeconds).toFixed(2)
			: '0.00';

		// Calculate success rate
		const successRate = this.connections.total > 0
			? ((this.connections.total - this.connections.failed) / this.connections.total * 100).toFixed(2)
			: '100.00';

		// Calculate average session duration
		let avgSessionDuration = 0;
		if (this.sessionDurations.length > 0) {
			avgSessionDuration = this.sessionDurations.reduce((a, b) => a + b, 0) / this.sessionDurations.length;
		}

		// Calculate connection rate (connections per minute)
		const oneMinuteAgo = Date.now() - 60000;
		const recentConnections = this.connectionTimes.filter(time => time > oneMinuteAgo).length;
		const connectionRate = recentConnections; // connections in last minute

		// Calculate event delivery success rate
		const totalEventAttempts = this.eventsDelivered + this.eventsFailed;
		const eventDeliveryRate = totalEventAttempts > 0
			? ((this.eventsDelivered / totalEventAttempts) * 100).toFixed(2)
			: '100.00';

		// Calculate room activity rate (joins per minute)
		const roomActivityRate = this.roomJoins + this.roomLeaves;

		// Estimate bandwidth (rough estimate: ~200 bytes per event)
		const estimatedBandwidth = this.events.total * 200; // bytes
		const estimatedBandwidthKB = (estimatedBandwidth / 1024).toFixed(2);
		const estimatedBandwidthMB = (estimatedBandwidth / (1024 * 1024)).toFixed(2);

		// Get top rooms by user count
		const topRooms = Array.from(this.rooms.entries())
			.sort((a, b) => b[1] - a[1])
			.slice(0, 10)
			.map(([roomId, userCount]) => ({ roomId, userCount }));

		// Get top event types
		const topEventTypes = Array.from(this.events.byType.entries())
			.sort((a, b) => b[1] - a[1])
			.slice(0, 10)
			.map(([eventType, count]) => ({ eventType, count }));

		// Calculate room size distribution
		const roomSizeDist = Array.from(this.roomSizeDistribution.entries())
			.sort((a, b) => a[0] - b[0])
			.map(([size, count]) => ({ size, count }));

		// Calculate health score (0-100)
		// Factors: success rate, error rate, latency, event delivery
		const successRateNum = parseFloat(successRate);
		const eventDeliveryNum = parseFloat(eventDeliveryRate);
		const errorRate = this.errors.total / Math.max(this.connections.total, 1) * 100;
		const latencyScore = avgLatency > 0 ? Math.max(0, 100 - (avgLatency / 10)) : 100; // Lower latency = higher score
		
		const healthScore = Math.round(
			(successRateNum * 0.3) + // 30% weight on connection success
			(eventDeliveryNum * 0.3) + // 30% weight on event delivery
			(Math.max(0, 100 - errorRate) * 0.2) + // 20% weight on low error rate
			(latencyScore * 0.2) // 20% weight on low latency
		);

		// Determine health status
		let healthStatus = 'healthy';
		if (healthScore < 50) {
			healthStatus = 'critical';
		} else if (healthScore < 75) {
			healthStatus = 'warning';
		}

		// Calculate average room size
		const totalRoomUsers = Array.from(this.rooms.values()).reduce((a, b) => a + b, 0);
		const avgRoomSize = this.rooms.size > 0 ? (totalRoomUsers / this.rooms.size).toFixed(2) : '0.00';

		// Calculate active user count (unique users currently connected)
		const activeUserCount = this.activeUserIds.size;
		const uniqueUsersLastHourCount = this.uniqueUsersLastHour.size;

		// Calculate reconnection rate
		const reconnectionRate = this.connections.total > 0
			? ((this.connections.reconnected / this.connections.total) * 100).toFixed(2)
			: '0.00';

		// Calculate connection duration histogram
		const durationHistogram = {
			'0-1min': 0,
			'1-5min': 0,
			'5-15min': 0,
			'15-60min': 0,
			'60min+': 0,
		};

		this.sessionDurations.forEach(duration => {
			const minutes = duration / 60000; // Convert ms to minutes
			if (minutes < 1) {
				durationHistogram['0-1min']++;
			} else if (minutes < 5) {
				durationHistogram['1-5min']++;
			} else if (minutes < 15) {
				durationHistogram['5-15min']++;
			} else if (minutes < 60) {
				durationHistogram['15-60min']++;
			} else {
				durationHistogram['60min+']++;
			}
		});

		// Convert histogram to array format for frontend
		const durationHistogramArray = Object.entries(durationHistogram).map(([range, count]) => ({
			range,
			count,
		}));

		return {
			uptime: {
				ms: uptime,
				seconds: uptimeSeconds,
				minutes: uptimeMinutes,
				hours: uptimeHours,
				formatted: `${uptimeHours}h ${uptimeMinutes % 60}m ${uptimeSeconds % 60}s`,
			},
			connections: {
				total: this.connections.total,
				active: this.connections.active,
				failed: this.connections.failed,
				reconnected: this.connections.reconnected,
				disconnected: this.connections.disconnected,
				successRate: `${successRate}%`,
				peak: this.peakConnections,
				avgSessionDuration: avgSessionDuration > 0 
					? `${Math.floor(avgSessionDuration / 1000)}s`
					: '0s',
				connectionRate: connectionRate, // connections per minute
				reconnectionRate: `${reconnectionRate}%`,
				activeUserCount: activeUserCount,
				uniqueUsersLastHour: uniqueUsersLastHourCount,
				durationHistogram: durationHistogramArray,
			},
			events: {
				total: this.events.total,
				eventsPerSecond: parseFloat(eventsPerSecond),
				byType: Object.fromEntries(this.events.byType),
				topEventTypes,
				latency: {
					average: avgLatency.toFixed(2) + 'ms',
					min: minLatency.toFixed(2) + 'ms',
					max: maxLatency.toFixed(2) + 'ms',
					samples: this.events.latency.length,
				},
				deliveryRate: `${eventDeliveryRate}%`,
				delivered: this.eventsDelivered,
				failed: this.eventsFailed,
			},
			rooms: {
				total: this.rooms.size,
				totalUsers: Array.from(this.rooms.values()).reduce((a, b) => a + b, 0),
				topRooms,
				joins: this.roomJoins,
				leaves: this.roomLeaves,
				activityRate: roomActivityRate,
				avgSize: avgRoomSize,
				sizeDistribution: roomSizeDist,
			},
			errors: {
				...this.errors,
				total: Object.values(this.errors).reduce((a, b) => a + b, 0),
			},
			bandwidth: {
				bytes: estimatedBandwidth,
				kb: estimatedBandwidthKB,
				mb: estimatedBandwidthMB,
			},
			health: {
				score: healthScore,
				status: healthStatus,
				factors: {
					connectionSuccess: successRateNum,
					eventDelivery: eventDeliveryNum,
					errorRate: errorRate.toFixed(2),
					latency: avgLatency.toFixed(2),
				},
			},
			timestamp: new Date().toISOString(),
		};
	}

	/**
	 * Reset all metrics (useful for testing or periodic resets)
	 */
	reset() {
		this.startTime = Date.now();
		this.connections = {
			total: 0,
			active: 0,
			failed: 0,
			reconnected: 0,
			disconnected: 0,
		};
		this.events = {
			total: 0,
			byType: new Map(),
			latency: [],
			maxLatencyHistory: 1000,
		};
		this.rooms.clear();
		this.errors = {
			auth: 0,
			join: 0,
			emit: 0,
			other: 0,
		};
		this.connectionTimestamps.clear();
		this.sessionDurations = [];
		this.peakConnections = 0;
		this.roomJoins = 0;
		this.roomLeaves = 0;
		this.eventsDelivered = 0;
		this.eventsFailed = 0;
		this.connectionTimes = [];
		this.metricsHistory = [];
		this.roomSizeDistribution.clear();
		this.userConnections.clear();
		this.activeUserIds.clear();
		this.uniqueUsersLastHour.clear();
		this.uniqueUsersLastHourTimestamps.clear();
		logger.info('Socket metrics reset');
	}
}

// Export singleton instance
export const socketMetrics = new SocketMetrics();

