import { useState, useEffect } from 'react';
import { adminService } from '@/services/adminService';
import api from '@/lib/axios';
import { applyAppearanceSettings } from '@/utils/applyAppearanceSettings';

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
export function useSiteSettings() {
    const [settings, setSettings] = useState<SiteSettings>(defaultSettings);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            // Try public endpoint first (no auth required)
            let data;
            try {
                const res = await api.get('/settings');
                data = res.data;
            } catch {
                // Fallback to admin endpoint if public fails
                data = await adminService.getSettings();
            }
            if (data.settings) {
                const settingsData = data.settings as {
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
                
                // Apply appearance settings if they exist
                const appearanceData = settingsData as any;
                if (appearanceData.themePrimaryColor || appearanceData.borderRadius || appearanceData.customCSS) {
                    applyAppearanceSettings({
                        themePrimaryColor: appearanceData.themePrimaryColor as string | undefined,
                        themeSecondaryColor: appearanceData.themeSecondaryColor as string | undefined,
                        themeAccentColor: appearanceData.themeAccentColor as string | undefined,
                        themeSuccessColor: appearanceData.themeSuccessColor as string | undefined,
                        themeWarningColor: appearanceData.themeWarningColor as string | undefined,
                        themeErrorColor: appearanceData.themeErrorColor as string | undefined,
                        themeInfoColor: appearanceData.themeInfoColor as string | undefined,
                        borderRadius: appearanceData.borderRadius as string | undefined,
                        animationsEnabled: appearanceData.animationsEnabled as boolean | undefined,
                        animationSpeed: appearanceData.animationSpeed as string | undefined,
                        buttonStyle: appearanceData.buttonStyle as string | undefined,
                        cardStyle: appearanceData.cardStyle as string | undefined,
                        darkModeEnabled: appearanceData.darkModeEnabled as boolean | undefined,
                        darkModeDefault: appearanceData.darkModeDefault as string | undefined,
                        customCSS: appearanceData.customCSS as string | undefined,
                        fontFamily: appearanceData.fontFamily as string | undefined,
                        fontSize: appearanceData.fontSize as string | undefined,
                        defaultViewMode: appearanceData.defaultViewMode as string | undefined,
                        homepageLayout: appearanceData.homepageLayout as string | undefined,
                    });
                }
            }
        } catch (error) {
            // If settings can't be loaded (e.g., user not admin), use defaults
            console.warn('Could not load site settings, using defaults:', error);
            setSettings(defaultSettings);
        } finally {
            setLoading(false);
        }
    };

    // Update document title when site name changes
    useEffect(() => {
        if (settings.siteName && !loading) {
            document.title = settings.siteName;
        }
    }, [settings.siteName, loading]);

    return {
        settings,
        loading,
        refreshSettings: loadSettings,
    };
}

