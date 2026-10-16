import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/axios';
import { applySitePalette, getPaletteRevision } from '@/theme/paletteRuntime';

interface SiteSettings {
    siteName: string;
    siteDescription: string;
    maxUploadSize: number;
    allowedFileTypes: string[];
    maintenanceMode: boolean;
    passwordMinLength?: number;
    passwordRequireUppercase?: boolean;
    passwordRequireLowercase?: boolean;
    passwordRequireNumber?: boolean;
    passwordRequireSpecialChar?: boolean;
}

const defaultSettings: SiteSettings = {
    siteName: 'PhotoApp',
    siteDescription: 'Discover beautiful photos',
    maxUploadSize: 10,
    allowedFileTypes: ['jpg', 'jpeg', 'png', 'webp'],
    maintenanceMode: false,
};

/**
 * Hook to fetch and use site settings
 * Updates document title when site name changes
 */
let pendingSettings: Promise<{data:{settings?:Record<string,unknown>}}> | null = null;
function fetchPublicSettings(): Promise<{data:{settings?:Record<string,unknown>}}> {
 return pendingSettings ??= api.get<{settings?:Record<string,unknown>}>('/settings').finally(() => { pendingSettings=null; });
}
export function useSiteSettings() {
    const [settings, setSettings] = useState<SiteSettings>(defaultSettings);
    const [loading, setLoading] = useState(true);

const loadSettings = useCallback(async () => {
        const paletteRevision = getPaletteRevision();
        try {
            // Public pages must never fall back to privileged admin settings.
            const { data } = await fetchPublicSettings();
            if (data.settings) {
                const settingsData = data.settings as {
                    sitePalette?: unknown;
                    siteName?: string;
                    siteDescription?: string;
                    maxUploadSize?: number;
                    allowedFileTypes?: string[] | string;
                    maintenanceMode?: boolean;
                    passwordMinLength?: number;
                    passwordRequireUppercase?: boolean;
                    passwordRequireLowercase?: boolean;
                    passwordRequireNumber?: boolean;
                    passwordRequireSpecialChar?: boolean;
                };
                
                const loadedSettings: SiteSettings = {
                    siteName: (settingsData.siteName as string) || defaultSettings.siteName,
                    siteDescription: (settingsData.siteDescription as string) || defaultSettings.siteDescription,
                    maxUploadSize: (settingsData.maxUploadSize as number) || defaultSettings.maxUploadSize,
                    allowedFileTypes: Array.isArray(settingsData.allowedFileTypes)
                        ? settingsData.allowedFileTypes
                        : typeof settingsData.allowedFileTypes === 'string'
                        ? settingsData.allowedFileTypes.split(',').map(t => t.trim())
                        : defaultSettings.allowedFileTypes,
                    maintenanceMode: (settingsData.maintenanceMode as boolean) || false,
                    passwordMinLength: settingsData.passwordMinLength ?? 8,
                    passwordRequireUppercase: settingsData.passwordRequireUppercase ?? true,
                    passwordRequireLowercase: settingsData.passwordRequireLowercase ?? true,
                    passwordRequireNumber: settingsData.passwordRequireNumber ?? true,
                    passwordRequireSpecialChar: settingsData.passwordRequireSpecialChar ?? false,
                };
                
                setSettings(loadedSettings);
                
                if (paletteRevision === getPaletteRevision()) applySitePalette(settingsData.sitePalette);
            }
        } catch (error) {
            // If settings can't be loaded (e.g., user not admin), use defaults
            console.warn('Could not load site settings, using defaults:', error);
            setSettings(defaultSettings);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { void loadSettings(); }, [loadSettings]);

    // The site name drives brand chrome (header, footer) and palette.
    // Document title is owned by per-page `useDocumentMeta`; do not overwrite
    // it here, otherwise any user-set title gets clobbered once settings load.
    return {
        settings,
        loading,
        refreshSettings: loadSettings,
    };
}

