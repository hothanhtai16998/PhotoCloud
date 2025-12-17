/**
 * Reverse geocoding utility to convert GPS coordinates to location names
 * Uses OpenStreetMap Nominatim API (free, no API key required)
 */

interface GeocodeResult {
	location: string | null;
	error?: string;
}

/**
 * Convert GPS coordinates to a human-readable location name
 * @param latitude - Latitude coordinate
 * @param longitude - Longitude coordinate
 * @param lang - Language code for location names (default: 'vi' for Vietnamese)
 * @returns Promise with location name or null if geocoding fails
 */
export async function reverseGeocode(
	latitude: number,
	longitude: number,
	lang: string = 'vi'
): Promise<GeocodeResult> {
	try {
		// OpenStreetMap Nominatim reverse geocoding API
		// Free service, no API key required
		// Rate limit: 1 request per second (we'll add a delay if needed)
		const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=${lang}&addressdetails=1&zoom=18`;

		const response = await fetch(url, {
			method: 'GET',
			headers: {
				'User-Agent': 'PhotoAppWeb/1.0', // Nominatim requires a valid User-Agent
			},
		});

		if (!response.ok) {
			throw new Error(`Geocoding API error: ${response.status}`);
		}

		const data = await response.json();

		if (!data?.address) {
			return { location: null, error: 'No address found' };
		}

		// Extract location name from address components
		// Format: City, Region, Country (in Vietnamese if available)
		const address = data.address;
		const locationParts: string[] = [];

		// Priority order for location components (in Vietnamese)
		if (address.city || address.town || address.village) {
			locationParts.push(address.city || address.town || address.village);
		}

		if (address.state || address.region) {
			locationParts.push(address.state || address.region);
		}

		// If no city/town found, try other options
		if (locationParts.length === 0) {
			if (address.suburb || address.neighbourhood) {
				locationParts.push(address.suburb || address.neighbourhood);
			}
			if (address.county) {
				locationParts.push(address.county);
			}
			if (address.state || address.region) {
				locationParts.push(address.state || address.region);
			}
		}

		// Add country if not already in Vietnamese format
		if (address.country && !locationParts.includes(address.country)) {
			// Map common country names to Vietnamese
			const countryMap: Record<string, string> = {
				'Vietnam': 'Việt Nam',
				'Thailand': 'Thái Lan',
				'Cambodia': 'Campuchia',
				'Laos': 'Lào',
				'China': 'Trung Quốc',
				'Japan': 'Nhật Bản',
				'Korea': 'Hàn Quốc',
				'Singapore': 'Singapore',
				'Malaysia': 'Malaysia',
				'Indonesia': 'Indonesia',
				'Philippines': 'Philippines',
			};
			const countryName = countryMap[address.country] || address.country;
			locationParts.push(countryName);
		}

		const location = locationParts.length > 0
			? locationParts.join(', ')
			: data.display_name || null;

		return { location };
	} catch (error) {
		console.warn('Reverse geocoding error:', error);
		return {
			location: null,
			error: error instanceof Error ? error.message : 'Unknown error',
		};
	}
}

/**
 * Simple delay function to respect API rate limits
 * @param ms - Milliseconds to delay
 */
export function delay(ms: number): Promise<void> {
	return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Location suggestion from geocoding API
 */
export interface LocationSuggestion {
	displayName: string;
	latitude: number;
	longitude: number;
	address?: {
		city?: string;
		state?: string;
		country?: string;
	};
}

interface NominatimItem {
	display_name?: string;
	name?: string;
	lat?: string;
	lon?: string;
	type?: string;
	address?: NominatimAddress;
}

interface NominatimAddress {
	city?: string;
	town?: string;
	village?: string;
	municipality?: string;
	state?: string;
	province?: string;
	region?: string;
	district?: string;
	ward?: string;
	suburb?: string;
	country?: string;
}

/**
 * Calculate relevance score for a location result based on query
 */
function calculateRelevanceScore(
	query: string,
	item: NominatimItem,
	address: NominatimAddress
): number {
	const queryLower = query.toLowerCase().trim();
	const queryWords = queryLower.split(/[,\s]+/).filter(w => w.length > 1);
	
	let score = 0;
	const displayName = (item.display_name || item.name || '').toLowerCase();
	const name = (item.name || '').toLowerCase();
	
	// Check if query words appear in location name (exact match gets highest score)
	queryWords.forEach(word => {
		if (name.includes(word)) {
			score += 10; // Exact name match
		} else if (displayName.includes(word)) {
			score += 5; // Display name match
		}
	});
	
	// Check address components
	const city = (address.city || address.town || address.village || address.municipality || '').toLowerCase();
	const state = (address.state || address.province || address.region || '').toLowerCase();
	const district = (address.district || '').toLowerCase();
	const ward = (address.ward || address.suburb || '').toLowerCase();
	
	queryWords.forEach(word => {
		if (city.includes(word)) score += 8;
		if (state.includes(word)) score += 6;
		if (district.includes(word)) score += 7;
		if (ward.includes(word)) score += 9;
	});
	
	// Boost score for important location types
	if (item.type === 'city' || item.type === 'town' || item.type === 'administrative') {
		score += 5;
	}
	
	// Penalize very long addresses (likely too specific)
	if (displayName.length > 80) {
		score -= 3;
	}
	
	return score;
}

/**
 * Build a clean, concise location name
 */
function buildLocationName(item: NominatimItem, address: NominatimAddress): string {
	// Prefer display_name but clean it up
	let displayName = item.display_name || '';
	
	// If display_name is too long or contains too much detail, build our own
	if (displayName.length > 80 || displayName.split(',').length > 4) {
		const locationParts: string[] = [];
		
		// Priority order: ward/district -> city/town -> province -> country
		const wardOrSuburb = address.ward || address.suburb;
		if (wardOrSuburb) {
			locationParts.push(wardOrSuburb);
		}
		
		if (address.district && !locationParts.includes(address.district)) {
			locationParts.push(address.district);
		}
		
		const cityName = address.city || address.town || address.village || address.municipality;
		if (cityName && !locationParts.includes(cityName)) {
			locationParts.push(cityName);
		}
		
		const state = address.state || address.province || address.region;
		if (state && !locationParts.includes(state)) {
			locationParts.push(state);
		}
		
		if (address.country) {
			const countryMap: Record<string, string> = {
				'Vietnam': 'Việt Nam',
				'Thailand': 'Thái Lan',
				'Cambodia': 'Campuchia',
				'Laos': 'Lào',
				'China': 'Trung Quốc',
				'Japan': 'Nhật Bản',
				'Korea': 'Hàn Quốc',
				'Singapore': 'Singapore',
				'Malaysia': 'Malaysia',
				'Indonesia': 'Indonesia',
				'Philippines': 'Philippines',
			};
			const countryName = countryMap[address.country] || address.country;
			if (!locationParts.includes(countryName)) {
				locationParts.push(countryName);
			}
		}

		displayName = locationParts.length > 0
			? locationParts.join(', ')
			: item.name || item.display_name || '';
	}

	// Clean up display name
	displayName = displayName
		.replace(/, Việt Nam, Việt Nam/g, ', Việt Nam')
		.replace(/, ,/g, ',')
		.replace(/\s+/g, ' ')
		.trim();

	return displayName;
}

/**
 * Search for location suggestions (forward geocoding)
 * Uses OpenStreetMap Nominatim API (free, no API key required)
 * Similar to Google Maps search autocomplete
 * @param query - Search query (location name)
 * @param lang - Language code for location names (default: 'vi' for Vietnamese)
 * @param limit - Maximum number of results (default: 8)
 * @returns Promise with array of location suggestions
 */
import { apiConfig } from '@/config/apiConfig';
import { timingConfig } from '@/config/timingConfig';

export async function searchLocations(
	query: string,
	lang: string = apiConfig.geocoding.defaultLanguage,
	limit: number = apiConfig.geocoding.defaultLimit
): Promise<LocationSuggestion[]> {
	if (!query || query.trim().length < 2) {
		return [];
	}

	try {
		// Clean and normalize query
		const cleanQuery = query.trim();
		const queryWords = cleanQuery.toLowerCase().split(/[,\s]+/).filter(w => w.length > 1);
		
		// Try multiple search strategies for better results
		const searchQueries: string[] = [];
		
		// Strategy 1: Full query
		searchQueries.push(cleanQuery);
		
		// Strategy 2: If query contains comma, try the main part (usually the city/town)
		if (cleanQuery.includes(',')) {
			const parts = cleanQuery.split(',').map(p => p.trim());
			// Use the last part (usually province/city) and first part (ward/district)
			if (parts.length >= 2) {
				const lastPart = parts[parts.length - 1];
				const firstPart = parts[0];
				if (lastPart && firstPart) {
					searchQueries.push(lastPart); // City/Province
					searchQueries.push(`${firstPart} ${lastPart}`); // Ward + City
				}
			}
		}
		
		// Strategy 3: If multiple words, try the most important ones
		if (queryWords.length > 2) {
			// Take last 2 words (usually city + province)
			searchQueries.push(queryWords.slice(-2).join(' '));
		}

		const seen = new Set<string>();
		const allResults: Array<{ item: NominatimItem; score: number }> = [];

		// Search with each query strategy
		for (const searchQuery of searchQueries) {
			if (searchQuery.length < 2) continue;

			const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&accept-language=${lang}&addressdetails=1&limit=10&dedupe=1&countrycodes=vn`;

			const response = await fetch(url, {
				method: 'GET',
				headers: {
					'User-Agent': 'PhotoAppWeb/1.0',
				},
			});

			if (!response.ok) continue;

			const data = await response.json();
			if (!Array.isArray(data) || data.length === 0) continue;

			// Score and collect results
			for (const item of data) {
				const address = item.address || {};
				if (!item.lat || !item.lon) continue;
				const lat = parseFloat(item.lat);
				const lon = parseFloat(item.lon);
				const locationKey = `${lat.toFixed(4)},${lon.toFixed(4)}`;
				
				if (seen.has(locationKey)) continue;
				seen.add(locationKey);

				const score = calculateRelevanceScore(cleanQuery, item, address);
				allResults.push({ item, score });
			}

			// Small delay to respect rate limits
			await new Promise(resolve => setTimeout(resolve, timingConfig.geocoding.batchDelayMs));
		}

		// If no results with Vietnam filter, try without country restriction
		if (allResults.length === 0) {
			const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cleanQuery)}&accept-language=${lang}&addressdetails=1&limit=10&dedupe=1`;
			
			const response = await fetch(url, {
				method: 'GET',
				headers: {
					'User-Agent': 'PhotoAppWeb/1.0',
				},
			});

			if (response.ok) {
				const data = await response.json();
				if (Array.isArray(data) && data.length > 0) {
					for (const item of data) {
						const address = item.address || {};
						if (!item.lat || !item.lon) continue;
						const lat = parseFloat(item.lat);
						const lon = parseFloat(item.lon);
						const locationKey = `${lat.toFixed(4)},${lon.toFixed(4)}`;
						
						if (seen.has(locationKey)) continue;
						seen.add(locationKey);

						const score = calculateRelevanceScore(cleanQuery, item, address);
						allResults.push({ item, score });
					}
				}
			}
		}

		// Sort by relevance score (highest first)
		allResults.sort((a, b) => b.score - a.score);

		// Transform to LocationSuggestion format
		const suggestions: LocationSuggestion[] = allResults
			.slice(0, limit)
			.filter(({ item }) => item.lat && item.lon)
			.map(({ item }) => {
				const address = item.address || {};
				const displayName = buildLocationName(item, address);

				return {
					displayName,
					latitude: parseFloat(item.lat!),
					longitude: parseFloat(item.lon!),
					address: {
						city: address.city || address.town || address.village || address.municipality,
						state: address.state || address.province || address.region,
						country: address.country,
					},
				};
			});

		return suggestions;
	} catch (error) {
		console.warn('Location search error:', error);
		return [];
	}
}

