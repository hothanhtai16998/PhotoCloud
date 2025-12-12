import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { adminService } from '@/services/adminService';
import { toast } from 'sonner';
import { usePermissions } from '@/hooks/usePermissions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Save, Megaphone, X, Settings, Upload, Shield, Bell, Globe, ChevronDown, ChevronUp, HelpCircle, CheckCircle2, AlertCircle, ChevronRight, Home, Info, AlertTriangle, CheckCircle, XCircle, Eye, FileText, Image as ImageIcon, Server, Database, Lock, Unlock, Mail, Languages, Clock, Link2, Facebook, Twitter, Instagram, Linkedin, Youtube, Image, Video, Maximize2, Plus, Palette, Type, Layout, Monitor, AtSign, Send, FileEdit, Users, UserPlus, UserCheck, Trash2, Calendar, Target, Star, History, BookOpen, Save as SaveIcon, FolderOpen, Activity, AlertCircle as AlertCircleIcon, Zap } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { useSiteSettings } from '@/hooks/useSiteSettings';
import { t } from '@/i18n';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useIsMobile } from '@/hooks/useIsMobile';
import { applyAppearanceSettings } from '@/utils/applyAppearanceSettings';

export function AdminSettings() {
    const { hasPermission, isSuperAdmin } = usePermissions();
    const { refreshSettings } = useSiteSettings();
    const isMobile = useIsMobile();
    const [activeTab, setActiveTab] = useState('general');
    const tabsContainerRef = useRef<HTMLDivElement>(null);
    const swipeStartX = useRef<number>(0);
    const swipeStartY = useRef<number>(0);
    const swipeStartTime = useRef<number>(0);

    const [settings, setSettings] = useState({
        siteName: 'PhotoApp',
        siteDescription: '',
        maxUploadSize: 10,
        allowedFileTypes: 'jpg,jpeg,png,webp',
        maintenanceMode: false,
        siteLogo: '',
        favicon: '',
        defaultLanguage: 'en',
        timezone: 'UTC',
        contactEmail: '',
        socialMediaLinks: {
            facebook: '',
            twitter: '',
            instagram: '',
            linkedin: '',
            youtube: '',
        },
        // Upload & Media Settings
        imageQuality: 85,
        watermarkEnabled: false,
        watermarkImage: '',
        autoResizeEnabled: true,
        autoResizeMaxWidth: 1920,
        autoResizeMaxHeight: 1080,
        maxVideoDuration: 300,
        videoQuality: 'high',
        batchUploadLimit: 10,
        // Security Settings
        passwordMinLength: 8,
        passwordRequireUppercase: true,
        passwordRequireLowercase: true,
        passwordRequireNumber: true,
        passwordRequireSpecialChar: false,
        passwordExpirationDays: 0,
        accessTokenExpiry: '30m',
        refreshTokenExpiry: 14,
        maxConcurrentSessions: 0,
        forceLogoutOnPasswordChange: true,
        // Appearance & Branding Settings
        themePrimaryColor: '#7c3aed',
        themeSecondaryColor: '#a78bfa',
        themeAccentColor: '#67e8f9',
        themeSuccessColor: '#10b981',
        themeWarningColor: '#f59e0b',
        themeErrorColor: '#ef4444',
        themeInfoColor: '#3b82f6',
        borderRadius: '1rem',
        animationsEnabled: true,
        animationSpeed: 'normal',
        buttonStyle: 'rounded',
        cardStyle: 'elevated',
        darkModeEnabled: false,
        darkModeDefault: 'auto',
        customCSS: '',
        fontFamily: 'Roboto',
        fontSize: '16px',
        defaultViewMode: 'grid',
        homepageLayout: 'default',
        // Email & Notifications Settings
        // SMTP Settings
        smtpEnabled: false,
        smtpHost: '',
        smtpPort: 587,
        smtpSecure: false,
        smtpUser: '',
        smtpPassword: '',
        smtpFromName: '',
        smtpFromEmail: '',
        // Email Verification
        emailVerificationRequired: false,
        // Welcome Email
        welcomeEmailEnabled: true,
        welcomeEmailSubject: 'Welcome to {siteName}!',
        welcomeEmailContent: '',
        // Notification Preferences
        notifyOnSignup: true,
        notifyOnPasswordChange: true,
        notifyOnProfileUpdate: false,
        notifyOnImageUpload: false,
        notifyOnComment: true,
        notifyOnFavorite: false,
        // User Management Settings
        registrationEnabled: true,
        registrationType: 'open', // 'open' | 'closed' | 'invite-only'
        defaultUserRole: 'user', // 'user' | 'moderator' | 'admin'
        requireEmailVerification: false,
        requirePhoneVerification: false,
        allowAccountSelfDeletion: true,
        requiredProfileFields: {
            displayName: true,
            bio: false,
            location: false,
            website: false,
            phone: false,
        },
        // Monitoring & Alerts Settings
        healthCheckEnabled: true,
        healthCheckInterval: 60, // seconds
        alertThresholds: {
            cpuUsage: 80, // percentage
            memoryUsage: 85, // percentage
            diskUsage: 90, // percentage
            responseTime: 1000, // milliseconds
            errorRate: 5, // percentage
        },
        emailAlertsEnabled: true,
        emailAlertRecipients: [] as string[], // array of email addresses
        alertEvents: {
            systemDown: true,
            highCpuUsage: true,
            highMemoryUsage: true,
            highDiskUsage: true,
            slowResponseTime: true,
            highErrorRate: true,
            databaseConnectionFailure: true,
            storageConnectionFailure: true,
        },
    });

    // Available file types for selection
    const availableFileTypes = [
        { value: 'jpg', label: 'JPG' },
        { value: 'jpeg', label: 'JPEG' },
        { value: 'png', label: 'PNG' },
        { value: 'webp', label: 'WebP' },
        { value: 'gif', label: 'GIF' },
        { value: 'svg', label: 'SVG' },
        { value: 'bmp', label: 'BMP' },
        { value: 'ico', label: 'ICO' },
        { value: 'mp4', label: 'MP4' },
        { value: 'webm', label: 'WebM' },
    ];

    // Convert comma-separated string to array for checkbox handling (memoized)
    const selectedFileTypes = useMemo(() => {
        return settings.allowedFileTypes.split(',').map(t => t.trim()).filter(t => t);
    }, [settings.allowedFileTypes]);

    const handleFileTypeToggle = useCallback((fileType: string) => {
        const currentTypes = selectedFileTypes;
        const newTypes = currentTypes.includes(fileType)
            ? currentTypes.filter(t => t !== fileType)
            : [...currentTypes, fileType];
        setSettings(prev => ({ ...prev, allowedFileTypes: newTypes.join(',') }));
    }, [selectedFileTypes]);
    const [_loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    // System Announcement state
    const [showAnnouncementForm, setShowAnnouncementForm] = useState(false);
    const [announcementData, setAnnouncementData] = useState({
        type: 'system_announcement' as 'system_announcement' | 'feature_update' | 'maintenance_scheduled' | 'terms_updated',
        title: '',
        message: '',
        scheduledDate: '', // ISO string for scheduled date/time
        priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
        expirationDate: '', // ISO string for expiration
        targetRoles: [] as string[], // ['user', 'moderator', 'admin']
        targetUserIds: [] as string[], // Specific user IDs
        sendToAll: true, // Send to all users
    });
    const [sendingAnnouncement, setSendingAnnouncement] = useState(false);
    const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
    const [announcementTemplates, setAnnouncementTemplates] = useState<Array<{ id: string; name: string; data: typeof announcementData }>>([]);
    const [announcementHistory, setAnnouncementHistory] = useState<Array<{ id: string; title: string; sentAt: string; recipientCount: number; readCount: number }>>([]);
    const [showHistory, setShowHistory] = useState(false);
    const [showTemplates, setShowTemplates] = useState(false);
    // const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
    const [originalSettings, setOriginalSettings] = useState(settings);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [isFadingOut, setIsFadingOut] = useState(false);
    const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
    const [showMaintenanceConfirm, setShowMaintenanceConfirm] = useState(false);
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const [uploadingFavicon, setUploadingFavicon] = useState(false);

    // Available languages
    const availableLanguages = [
        { value: 'vi', label: 'Tiếng Việt (Vietnamese)' },
        { value: 'en', label: 'English' },
    ];

    // Common timezones
    const timezones = [
        { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
        { value: 'America/New_York', label: 'America/New_York (Eastern Time)' },
        { value: 'America/Chicago', label: 'America/Chicago (Central Time)' },
        { value: 'America/Denver', label: 'America/Denver (Mountain Time)' },
        { value: 'America/Los_Angeles', label: 'America/Los_Angeles (Pacific Time)' },
        { value: 'Europe/London', label: 'Europe/London (GMT)' },
        { value: 'Europe/Paris', label: 'Europe/Paris (CET)' },
        { value: 'Asia/Tokyo', label: 'Asia/Tokyo (JST)' },
        { value: 'Asia/Shanghai', label: 'Asia/Shanghai (CST)' },
        { value: 'Asia/Ho_Chi_Minh', label: 'Asia/Ho_Chi_Minh (ICT)' },
        { value: 'Asia/Dubai', label: 'Asia/Dubai (GST)' },
        { value: 'Australia/Sydney', label: 'Australia/Sydney (AEDT)' },
    ];

    const loadSettings = useCallback(async () => {
        try {
            // Don't block UI - load in background
            // setLoading(true);

            // Use admin endpoint to get full settings (requires auth)
            // Add timeout to prevent hanging
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Request timeout')), 10000); // 10 second timeout
            });

            // Performance tracking removed - not needed
            const data = await Promise.race([
                adminService.getSettings(),
                timeoutPromise
            ]) as { settings: Record<string, unknown> };
            if (data.settings) {
                const settingsData = data.settings as {
                    siteName?: string;
                    siteDescription?: string;
                    maxUploadSize?: number;
                    allowedFileTypes?: string[] | string;
                    maintenanceMode?: boolean;
                    siteLogo?: string;
                    favicon?: string;
                    defaultLanguage?: string;
                    timezone?: string;
                    contactEmail?: string;
                    socialMediaLinks?: {
                        facebook?: string;
                        twitter?: string;
                        instagram?: string;
                        linkedin?: string;
                        youtube?: string;
                    };
                    // Upload & Media Settings
                    imageQuality?: number;
                    watermarkEnabled?: boolean;
                    watermarkImage?: string;
                    autoResizeEnabled?: boolean;
                    autoResizeMaxWidth?: number;
                    autoResizeMaxHeight?: number;
                    maxVideoDuration?: number;
                    videoQuality?: string;
                    batchUploadLimit?: number;
                    // Security Settings
                    passwordMinLength?: number;
                    passwordRequireUppercase?: boolean;
                    passwordRequireLowercase?: boolean;
                    passwordRequireNumber?: boolean;
                    passwordRequireSpecialChar?: boolean;
                    passwordExpirationDays?: number;
                    accessTokenExpiry?: string;
                    refreshTokenExpiry?: number;
                    maxConcurrentSessions?: number;
                    forceLogoutOnPasswordChange?: boolean;
                };
                const loadedSettings = {
                    siteName: (settingsData.siteName as string) || 'PhotoApp',
                    siteDescription: (settingsData.siteDescription as string) || '',
                    maxUploadSize: (settingsData.maxUploadSize as number) || 10,
                    allowedFileTypes: Array.isArray(settingsData.allowedFileTypes)
                        ? settingsData.allowedFileTypes.join(',')
                        : (settingsData.allowedFileTypes as string) || 'jpg,jpeg,png,webp',
                    maintenanceMode: (settingsData.maintenanceMode as boolean) || false,
                    siteLogo: (settingsData.siteLogo as string) || '',
                    favicon: (settingsData.favicon as string) || '',
                    defaultLanguage: (settingsData.defaultLanguage as string) || 'vi',
                    timezone: (settingsData.timezone as string) || 'UTC',
                    contactEmail: (settingsData.contactEmail as string) || '',
                    socialMediaLinks: {
                        facebook: (settingsData.socialMediaLinks?.facebook as string) || '',
                        twitter: (settingsData.socialMediaLinks?.twitter as string) || '',
                        instagram: (settingsData.socialMediaLinks?.instagram as string) || '',
                        linkedin: (settingsData.socialMediaLinks?.linkedin as string) || '',
                        youtube: (settingsData.socialMediaLinks?.youtube as string) || '',
                    },
                    // Upload & Media Settings
                    imageQuality: (settingsData.imageQuality as number) || 85,
                    watermarkEnabled: (settingsData.watermarkEnabled as boolean) || false,
                    watermarkImage: (settingsData.watermarkImage as string) || '',
                    autoResizeEnabled: (settingsData.autoResizeEnabled as boolean) ?? true,
                    autoResizeMaxWidth: (settingsData.autoResizeMaxWidth as number) || 1920,
                    autoResizeMaxHeight: (settingsData.autoResizeMaxHeight as number) || 1080,
                    maxVideoDuration: (settingsData.maxVideoDuration as number) || 300,
                    videoQuality: (settingsData.videoQuality as string) || 'high',
                    batchUploadLimit: (settingsData.batchUploadLimit as number) || 10,
                    // Security Settings
                    passwordMinLength: (settingsData.passwordMinLength as number) || 8,
                    passwordRequireUppercase: (settingsData.passwordRequireUppercase as boolean) ?? true,
                    passwordRequireLowercase: (settingsData.passwordRequireLowercase as boolean) ?? true,
                    passwordRequireNumber: (settingsData.passwordRequireNumber as boolean) ?? true,
                    passwordRequireSpecialChar: (settingsData.passwordRequireSpecialChar as boolean) ?? false,
                    passwordExpirationDays: (settingsData.passwordExpirationDays as number) || 0,
                    accessTokenExpiry: (settingsData.accessTokenExpiry as string) || '30m',
                    refreshTokenExpiry: (settingsData.refreshTokenExpiry as number) || 14,
                    maxConcurrentSessions: (settingsData.maxConcurrentSessions as number) || 0,
                    forceLogoutOnPasswordChange: (settingsData.forceLogoutOnPasswordChange as boolean) ?? true,
                    // Appearance & Branding Settings
                    themePrimaryColor: ((settingsData as any).themePrimaryColor as string) || '#7c3aed',
                    themeSecondaryColor: ((settingsData as any).themeSecondaryColor as string) || '#a78bfa',
                    themeAccentColor: ((settingsData as any).themeAccentColor as string) || '#67e8f9',
                    themeSuccessColor: ((settingsData as any).themeSuccessColor as string) || '#10b981',
                    themeWarningColor: ((settingsData as any).themeWarningColor as string) || '#f59e0b',
                    themeErrorColor: ((settingsData as any).themeErrorColor as string) || '#ef4444',
                    themeInfoColor: ((settingsData as any).themeInfoColor as string) || '#3b82f6',
                    borderRadius: ((settingsData as any).borderRadius as string) || '1rem',
                    animationsEnabled: ((settingsData as any).animationsEnabled as boolean) ?? true,
                    animationSpeed: ((settingsData as any).animationSpeed as string) || 'normal',
                    buttonStyle: ((settingsData as any).buttonStyle as string) || 'default',
                    cardStyle: ((settingsData as any).cardStyle as string) || 'default',
                    darkModeEnabled: ((settingsData as any).darkModeEnabled as boolean) ?? false,
                    darkModeDefault: ((settingsData as any).darkModeDefault as string) || 'auto',
                    customCSS: ((settingsData as any).customCSS as string) || '',
                    fontFamily: ((settingsData as any).fontFamily as string) || 'Roboto',
                    fontSize: ((settingsData as any).fontSize as string) || '16px',
                    defaultViewMode: ((settingsData as any).defaultViewMode as string) || 'grid',
                    homepageLayout: ((settingsData as any).homepageLayout as string) || 'default',
                    // Email & Notifications Settings
                    smtpEnabled: ((settingsData as any).smtpEnabled as boolean) ?? false,
                    smtpHost: ((settingsData as any).smtpHost as string) || '',
                    smtpPort: ((settingsData as any).smtpPort as number) || 587,
                    smtpSecure: ((settingsData as any).smtpSecure as boolean) ?? false,
                    smtpUser: ((settingsData as any).smtpUser as string) || '',
                    smtpPassword: ((settingsData as any).smtpPassword as string) || '',
                    smtpFromName: ((settingsData as any).smtpFromName as string) || '',
                    smtpFromEmail: ((settingsData as any).smtpFromEmail as string) || '',
                    emailVerificationRequired: ((settingsData as any).emailVerificationRequired as boolean) ?? false,
                    welcomeEmailEnabled: ((settingsData as any).welcomeEmailEnabled as boolean) ?? true,
                    welcomeEmailSubject: ((settingsData as any).welcomeEmailSubject as string) || 'Welcome to {siteName}!',
                    welcomeEmailContent: ((settingsData as any).welcomeEmailContent as string) || '',
                    notifyOnSignup: ((settingsData as any).notifyOnSignup as boolean) ?? true,
                    notifyOnPasswordChange: ((settingsData as any).notifyOnPasswordChange as boolean) ?? true,
                    notifyOnProfileUpdate: ((settingsData as any).notifyOnProfileUpdate as boolean) ?? false,
                    notifyOnImageUpload: ((settingsData as any).notifyOnImageUpload as boolean) ?? false,
                    notifyOnComment: ((settingsData as any).notifyOnComment as boolean) ?? true,
                    notifyOnFavorite: ((settingsData as any).notifyOnFavorite as boolean) ?? false,
                    // User Management Settings
                    registrationEnabled: ((settingsData as any).registrationEnabled as boolean) ?? true,
                    registrationType: ((settingsData as any).registrationType as string) || 'open',
                    defaultUserRole: ((settingsData as any).defaultUserRole as string) || 'user',
                    requireEmailVerification: ((settingsData as any).requireEmailVerification as boolean) ?? false,
                    requirePhoneVerification: ((settingsData as any).requirePhoneVerification as boolean) ?? false,
                    allowAccountSelfDeletion: ((settingsData as any).allowAccountSelfDeletion as boolean) ?? true,
                    requiredProfileFields: ((settingsData as any).requiredProfileFields || {
                        displayName: true,
                        bio: false,
                        location: false,
                        website: false,
                        phone: false,
                    }) as { displayName: boolean; bio: boolean; location: boolean; website: boolean; phone: boolean },
                    // Monitoring & Alerts Settings
                    healthCheckEnabled: ((settingsData as any).healthCheckEnabled as boolean) ?? true,
                    healthCheckInterval: ((settingsData as any).healthCheckInterval as number) || 60,
                    alertThresholds: ((settingsData as any).alertThresholds || {
                        cpuUsage: 80,
                        memoryUsage: 85,
                        diskUsage: 90,
                        responseTime: 1000,
                        errorRate: 5,
                    }) as { cpuUsage: number; memoryUsage: number; diskUsage: number; responseTime: number; errorRate: number },
                    emailAlertsEnabled: ((settingsData as any).emailAlertsEnabled as boolean) ?? true,
                    emailAlertRecipients: ((settingsData as any).emailAlertRecipients as string[]) || [],
                    alertEvents: ((settingsData as any).alertEvents || {
                        systemDown: true,
                        highCpuUsage: true,
                        highMemoryUsage: true,
                        highDiskUsage: true,
                        slowResponseTime: true,
                        highErrorRate: true,
                        databaseConnectionFailure: true,
                        storageConnectionFailure: true,
                    }) as { systemDown: boolean; highCpuUsage: boolean; highMemoryUsage: boolean; highDiskUsage: boolean; slowResponseTime: boolean; highErrorRate: boolean; databaseConnectionFailure: boolean; storageConnectionFailure: boolean },
                };
                setSettings(loadedSettings);
                setOriginalSettings(loadedSettings);

                // Apply appearance settings when loaded
                applyAppearanceSettings({
                    themePrimaryColor: loadedSettings.themePrimaryColor,
                    themeSecondaryColor: loadedSettings.themeSecondaryColor,
                    themeAccentColor: loadedSettings.themeAccentColor,
                    themeSuccessColor: loadedSettings.themeSuccessColor,
                    themeWarningColor: loadedSettings.themeWarningColor,
                    themeErrorColor: loadedSettings.themeErrorColor,
                    themeInfoColor: loadedSettings.themeInfoColor,
                    borderRadius: loadedSettings.borderRadius,
                    animationsEnabled: loadedSettings.animationsEnabled,
                    animationSpeed: loadedSettings.animationSpeed,
                    buttonStyle: loadedSettings.buttonStyle,
                    cardStyle: loadedSettings.cardStyle,
                    darkModeEnabled: loadedSettings.darkModeEnabled,
                    darkModeDefault: loadedSettings.darkModeDefault,
                    customCSS: loadedSettings.customCSS,
                    fontFamily: loadedSettings.fontFamily,
                    fontSize: loadedSettings.fontSize,
                    defaultViewMode: loadedSettings.defaultViewMode,
                    homepageLayout: loadedSettings.homepageLayout,
                });
            } else {
                // If no settings returned, use defaults (already set in initial state)
                console.warn('No settings data returned from API');
            }
        } catch (error: unknown) {
            const axiosError = error as { response?: { data?: { message?: string } } | undefined; message?: string };
            console.error('Failed to load settings:', error);

            // Check if it's a timeout error
            if (axiosError.message === 'Request timeout' || error instanceof Error && error.message === 'Request timeout') {
                toast.error('Yêu cầu hết thời gian. Đang sử dụng cài đặt mặc định.');
            } else {
                toast.error(axiosError.response?.data?.message || axiosError.message || 'Lỗi khi tải cài đặt. Đang sử dụng cài đặt mặc định.');
            }

            // Use default settings if API fails - don't block the UI
            // Settings are already initialized with defaults, so we can proceed
        } finally {
            // UI is already shown, no need to set loading
            // setLoading(false);
        }
    }, []);

    // Load settings on mount
    useEffect(() => {
        let mounted = true;
        let timeoutId: NodeJS.Timeout | undefined;

        const initializeSettings = async () => {
            // Check permissions first
            if (!isSuperAdmin() && !hasPermission('manageSettings')) {
                if (mounted) {
                    toast.error('Bạn không có quyền quản lý cài đặt');
                    setLoading(false);
                }
                return;
            }

            // No timeout needed - UI is already shown

            try {
                await loadSettings();
                if (mounted && timeoutId) {
                    clearTimeout(timeoutId);
                }
            } catch (error) {
                if (mounted) {
                    console.error('Failed to load settings:', error);
                    // Don't set loading - UI is already shown with defaults
                }
            }
        };

        initializeSettings();

        return () => {
            mounted = false;
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Only run once on mount

    // Real-time validation (memoized to avoid recreating on every render)
    const validateSettings = useCallback(() => {
        const errors: Record<string, string> = {};

        if (!settings.siteName.trim()) {
            errors.siteName = 'Site name is required';
        } else if (settings.siteName.length > 100) {
            errors.siteName = 'Site name must be less than 100 characters';
        }

        if (settings.siteDescription.length > 500) {
            errors.siteDescription = 'Description must be less than 500 characters';
        }

        if (settings.maxUploadSize < 1 || settings.maxUploadSize > 1000) {
            errors.maxUploadSize = 'Upload size must be between 1 and 1000 MB';
        }

        if (selectedFileTypes.length === 0) {
            errors.allowedFileTypes = 'At least one file format must be selected';
        }

        // Validate contact email if provided
        if (settings.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(settings.contactEmail)) {
            errors.contactEmail = 'Please enter a valid email address';
        }

        // Validate social media URLs if provided
        const urlPattern = /^https?:\/\/.+/;
        if (settings.socialMediaLinks.facebook && !urlPattern.test(settings.socialMediaLinks.facebook)) {
            errors.socialFacebook = 'Please enter a valid URL (must start with http:// or https://)';
        }

        // Validate SMTP settings if enabled
        if (settings.smtpEnabled) {
            if (!settings.smtpHost.trim()) {
                errors.smtpHost = 'SMTP host is required when SMTP is enabled';
            }

            if (!settings.smtpPort || settings.smtpPort < 1 || settings.smtpPort > 65535) {
                errors.smtpPort = 'SMTP port must be between 1 and 65535';
            }

            if (!settings.smtpUser.trim()) {
                errors.smtpUser = 'SMTP username is required when SMTP is enabled';
            }

            if (!settings.smtpPassword.trim()) {
                errors.smtpPassword = 'SMTP password is required when SMTP is enabled';
            }

            if (!settings.smtpFromEmail.trim()) {
                errors.smtpFromEmail = 'From email is required when SMTP is enabled';
            } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(settings.smtpFromEmail)) {
                errors.smtpFromEmail = 'Please enter a valid email address';
            }
        }
        if (settings.socialMediaLinks.twitter && !urlPattern.test(settings.socialMediaLinks.twitter)) {
            errors.socialTwitter = 'Please enter a valid URL (must start with http:// or https://)';
        }
        if (settings.socialMediaLinks.instagram && !urlPattern.test(settings.socialMediaLinks.instagram)) {
            errors.socialInstagram = 'Please enter a valid URL (must start with http:// or https://)';
        }
        if (settings.socialMediaLinks.linkedin && !urlPattern.test(settings.socialMediaLinks.linkedin)) {
            errors.socialLinkedin = 'Please enter a valid URL (must start with http:// or https://)';
        }
        if (settings.socialMediaLinks.youtube && !urlPattern.test(settings.socialMediaLinks.youtube)) {
            errors.socialYoutube = 'Please enter a valid URL (must start with http:// or https://)';
        }

        // Validate security settings
        if (settings.passwordMinLength < 6 || settings.passwordMinLength > 20) {
            errors.passwordMinLength = 'Password minimum length must be between 6 and 20 characters';
        }

        if (settings.passwordExpirationDays < 0 || settings.passwordExpirationDays > 365) {
            errors.passwordExpirationDays = 'Password expiration must be between 0 and 365 days';
        }

        if (settings.refreshTokenExpiry < 1 || settings.refreshTokenExpiry > 365) {
            errors.refreshTokenExpiry = 'Refresh token expiry must be between 1 and 365 days';
        }

        if (settings.maxConcurrentSessions < 0 || settings.maxConcurrentSessions > 100) {
            errors.maxConcurrentSessions = 'Max concurrent sessions must be between 0 and 100';
        }

        // Allow all complexity requirements to be disabled (admin choice)
        // Removed validation - admin can choose to have no complexity requirements

        setValidationErrors(errors);
        return Object.keys(errors).length === 0;
    }, [settings, selectedFileTypes]);

    // Memoize social media links comparison (shallow comparison for performance)
    const socialLinksChanged = useMemo(() => {
        const current = settings.socialMediaLinks;
        const original = originalSettings.socialMediaLinks;
        return current.facebook !== original.facebook ||
            current.twitter !== original.twitter ||
            current.instagram !== original.instagram ||
            current.linkedin !== original.linkedin ||
            current.youtube !== original.youtube;
    }, [
        settings.socialMediaLinks.facebook,
        settings.socialMediaLinks.twitter,
        settings.socialMediaLinks.instagram,
        settings.socialMediaLinks.linkedin,
        settings.socialMediaLinks.youtube,
        originalSettings.socialMediaLinks.facebook,
        originalSettings.socialMediaLinks.twitter,
        originalSettings.socialMediaLinks.instagram,
        originalSettings.socialMediaLinks.linkedin,
        originalSettings.socialMediaLinks.youtube,
    ]);

    // Memoize password complexity comparison (shallow comparison for performance)
    const passwordComplexityChanged = useMemo(() => {
        return settings.passwordRequireUppercase !== originalSettings.passwordRequireUppercase ||
            settings.passwordRequireLowercase !== originalSettings.passwordRequireLowercase ||
            settings.passwordRequireNumber !== originalSettings.passwordRequireNumber ||
            settings.passwordRequireSpecialChar !== originalSettings.passwordRequireSpecialChar;
    }, [
        settings.passwordRequireUppercase,
        settings.passwordRequireLowercase,
        settings.passwordRequireNumber,
        settings.passwordRequireSpecialChar,
        originalSettings.passwordRequireUppercase,
        originalSettings.passwordRequireLowercase,
        originalSettings.passwordRequireNumber,
        originalSettings.passwordRequireSpecialChar,
    ]);

    // Debounced hasChanges calculation to avoid expensive checks on every keystroke
    const [hasChanges, setHasChanges] = useState(false);
    const hasChangesTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Calculate hasChanges with debounce (only after user stops typing for 300ms)
    useEffect(() => {
        if (hasChangesTimeoutRef.current) {
            clearTimeout(hasChangesTimeoutRef.current);
        }

        hasChangesTimeoutRef.current = setTimeout(() => {
            // Quick shallow comparison for common changes
            const changed = settings.siteName !== originalSettings.siteName ||
                settings.siteDescription !== originalSettings.siteDescription ||
                settings.maxUploadSize !== originalSettings.maxUploadSize ||
                settings.allowedFileTypes !== originalSettings.allowedFileTypes ||
                settings.maintenanceMode !== originalSettings.maintenanceMode ||
                settings.siteLogo !== originalSettings.siteLogo ||
                settings.favicon !== originalSettings.favicon ||
                settings.defaultLanguage !== originalSettings.defaultLanguage ||
                settings.timezone !== originalSettings.timezone ||
                settings.contactEmail !== originalSettings.contactEmail ||
                settings.imageQuality !== originalSettings.imageQuality ||
                settings.watermarkEnabled !== originalSettings.watermarkEnabled ||
                settings.watermarkImage !== originalSettings.watermarkImage ||
                settings.autoResizeEnabled !== originalSettings.autoResizeEnabled ||
                settings.autoResizeMaxWidth !== originalSettings.autoResizeMaxWidth ||
                settings.autoResizeMaxHeight !== originalSettings.autoResizeMaxHeight ||
                settings.maxVideoDuration !== originalSettings.maxVideoDuration ||
                settings.videoQuality !== originalSettings.videoQuality ||
                settings.batchUploadLimit !== originalSettings.batchUploadLimit ||
                settings.passwordMinLength !== originalSettings.passwordMinLength ||
                settings.passwordExpirationDays !== originalSettings.passwordExpirationDays ||
                settings.accessTokenExpiry !== originalSettings.accessTokenExpiry ||
                settings.refreshTokenExpiry !== originalSettings.refreshTokenExpiry ||
                settings.maxConcurrentSessions !== originalSettings.maxConcurrentSessions ||
                settings.forceLogoutOnPasswordChange !== originalSettings.forceLogoutOnPasswordChange ||
                socialLinksChanged ||
                passwordComplexityChanged ||
                // Appearance & Branding Settings
                settings.themePrimaryColor !== originalSettings.themePrimaryColor ||
                settings.themeSecondaryColor !== originalSettings.themeSecondaryColor ||
                settings.themeAccentColor !== originalSettings.themeAccentColor ||
                settings.themeSuccessColor !== originalSettings.themeSuccessColor ||
                settings.themeWarningColor !== originalSettings.themeWarningColor ||
                settings.themeErrorColor !== originalSettings.themeErrorColor ||
                settings.themeInfoColor !== originalSettings.themeInfoColor ||
                settings.borderRadius !== originalSettings.borderRadius ||
                settings.animationsEnabled !== originalSettings.animationsEnabled ||
                settings.animationSpeed !== originalSettings.animationSpeed ||
                settings.buttonStyle !== originalSettings.buttonStyle ||
                settings.cardStyle !== originalSettings.cardStyle ||
                settings.darkModeEnabled !== originalSettings.darkModeEnabled ||
                settings.darkModeDefault !== originalSettings.darkModeDefault ||
                settings.customCSS !== originalSettings.customCSS ||
                settings.fontFamily !== originalSettings.fontFamily ||
                settings.fontSize !== originalSettings.fontSize ||
                settings.defaultViewMode !== originalSettings.defaultViewMode ||
                settings.homepageLayout !== originalSettings.homepageLayout ||
                // Email & Notifications Settings
                settings.smtpEnabled !== originalSettings.smtpEnabled ||
                settings.smtpHost !== originalSettings.smtpHost ||
                settings.smtpPort !== originalSettings.smtpPort ||
                settings.smtpSecure !== originalSettings.smtpSecure ||
                settings.smtpUser !== originalSettings.smtpUser ||
                settings.smtpPassword !== originalSettings.smtpPassword ||
                settings.smtpFromName !== originalSettings.smtpFromName ||
                settings.smtpFromEmail !== originalSettings.smtpFromEmail ||
                settings.emailVerificationRequired !== originalSettings.emailVerificationRequired ||
                settings.welcomeEmailEnabled !== originalSettings.welcomeEmailEnabled ||
                settings.welcomeEmailSubject !== originalSettings.welcomeEmailSubject ||
                settings.welcomeEmailContent !== originalSettings.welcomeEmailContent ||
                settings.notifyOnSignup !== originalSettings.notifyOnSignup ||
                settings.notifyOnPasswordChange !== originalSettings.notifyOnPasswordChange ||
                settings.notifyOnProfileUpdate !== originalSettings.notifyOnProfileUpdate ||
                settings.notifyOnImageUpload !== originalSettings.notifyOnImageUpload ||
                settings.notifyOnComment !== originalSettings.notifyOnComment ||
                settings.notifyOnFavorite !== originalSettings.notifyOnFavorite ||
                // User Management Settings
                settings.registrationEnabled !== originalSettings.registrationEnabled ||
                settings.registrationType !== originalSettings.registrationType ||
                settings.defaultUserRole !== originalSettings.defaultUserRole ||
                settings.requireEmailVerification !== originalSettings.requireEmailVerification ||
                settings.requirePhoneVerification !== originalSettings.requirePhoneVerification ||
                settings.allowAccountSelfDeletion !== originalSettings.allowAccountSelfDeletion ||
                // Required Profile Fields (object comparison)
                (settings.requiredProfileFields?.displayName !== originalSettings.requiredProfileFields?.displayName ||
                    settings.requiredProfileFields?.bio !== originalSettings.requiredProfileFields?.bio ||
                    settings.requiredProfileFields?.location !== originalSettings.requiredProfileFields?.location ||
                    settings.requiredProfileFields?.website !== originalSettings.requiredProfileFields?.website ||
                    settings.requiredProfileFields?.phone !== originalSettings.requiredProfileFields?.phone) ||
                // Monitoring & Alerts Settings
                settings.healthCheckEnabled !== originalSettings.healthCheckEnabled ||
                settings.healthCheckInterval !== originalSettings.healthCheckInterval ||
                // Alert Thresholds (shallow object comparison)
                (settings.alertThresholds?.cpuUsage !== originalSettings.alertThresholds?.cpuUsage ||
                    settings.alertThresholds?.memoryUsage !== originalSettings.alertThresholds?.memoryUsage ||
                    settings.alertThresholds?.diskUsage !== originalSettings.alertThresholds?.diskUsage ||
                    settings.alertThresholds?.responseTime !== originalSettings.alertThresholds?.responseTime ||
                    settings.alertThresholds?.errorRate !== originalSettings.alertThresholds?.errorRate) ||
                settings.emailAlertsEnabled !== originalSettings.emailAlertsEnabled ||
                // Email Alert Recipients (shallow array comparison)
                (settings.emailAlertRecipients?.length !== originalSettings.emailAlertRecipients?.length ||
                    settings.emailAlertRecipients?.some((email, i) => email !== originalSettings.emailAlertRecipients?.[i])) ||
                // Alert Events (shallow object comparison)
                (settings.alertEvents?.systemDown !== originalSettings.alertEvents?.systemDown ||
                    settings.alertEvents?.highCpuUsage !== originalSettings.alertEvents?.highCpuUsage ||
                    settings.alertEvents?.highMemoryUsage !== originalSettings.alertEvents?.highMemoryUsage ||
                    settings.alertEvents?.highDiskUsage !== originalSettings.alertEvents?.highDiskUsage ||
                    settings.alertEvents?.slowResponseTime !== originalSettings.alertEvents?.slowResponseTime ||
                    settings.alertEvents?.highErrorRate !== originalSettings.alertEvents?.highErrorRate ||
                    settings.alertEvents?.databaseConnectionFailure !== originalSettings.alertEvents?.databaseConnectionFailure ||
                    settings.alertEvents?.storageConnectionFailure !== originalSettings.alertEvents?.storageConnectionFailure);

            setHasChanges(changed);
        }, 300); // Debounce by 300ms - only check after user stops typing

        return () => {
            if (hasChangesTimeoutRef.current) {
                clearTimeout(hasChangesTimeoutRef.current);
            }
        };
    }, [settings, originalSettings, socialLinksChanged, passwordComplexityChanged]);

    const handleSave = async () => {
        if (!isSuperAdmin() && !hasPermission('manageSettings')) {
            toast.error('Bạn không có quyền quản lý cài đặt');
            return;
        }

        // Validate before saving
        if (!validateSettings()) {
            toast.error('Please fix validation errors before saving');
            return;
        }

        try {
            setSaving(true);
            setSaveSuccess(false);
            const updateData = {
                ...settings,
                allowedFileTypes: settings.allowedFileTypes.split(',').map(t => t.trim()),
            };
            await adminService.updateSettings(updateData);

            // Apply appearance settings immediately after save
            applyAppearanceSettings({
                themePrimaryColor: settings.themePrimaryColor,
                themeSecondaryColor: settings.themeSecondaryColor,
                themeAccentColor: settings.themeAccentColor,
                themeSuccessColor: settings.themeSuccessColor,
                themeWarningColor: settings.themeWarningColor,
                themeErrorColor: settings.themeErrorColor,
                themeInfoColor: settings.themeInfoColor,
                borderRadius: settings.borderRadius,
                animationsEnabled: settings.animationsEnabled,
                animationSpeed: settings.animationSpeed,
                buttonStyle: settings.buttonStyle,
                cardStyle: settings.cardStyle,
                darkModeEnabled: settings.darkModeEnabled,
                darkModeDefault: settings.darkModeDefault,
                customCSS: settings.customCSS,
                fontFamily: settings.fontFamily,
                fontSize: settings.fontSize,
                defaultViewMode: settings.defaultViewMode,
                homepageLayout: settings.homepageLayout,
            });

            // Update original settings to reflect saved state (prevent flash)
            setOriginalSettings(settings);

            // Show success indicator
            setSaveSuccess(true);
            setIsFadingOut(false);
            toast.success('Đã lưu cài đặt thành công');

            // Refresh site settings globally (updates document title) without full reload
            await refreshSettings();

            // Clear success indicator after 3 seconds with fade out
            setTimeout(() => {
                setIsFadingOut(true);
                setTimeout(() => {
                    setSaveSuccess(false);
                    setIsFadingOut(false);
                }, 300);
            }, 2700);
        } catch (error: unknown) {
            const axiosError = error as { response?: { data?: { message?: string } } };
            toast.error(axiosError.response?.data?.message || 'Lỗi khi lưu cài đặt');
            setSaveSuccess(false);
        } finally {
            setSaving(false);
        }
    };

    const handleMaintenanceModeChange = (checked: boolean) => {
        if (checked) {
            setShowMaintenanceConfirm(true);
        } else {
            setSettings({ ...settings, maintenanceMode: false });
        }
    };

    const confirmMaintenanceMode = () => {
        setSettings({ ...settings, maintenanceMode: true });
        setShowMaintenanceConfirm(false);
    };

    // Validate on settings change (debounced to avoid excessive validation)
    useEffect(() => {
        // Don't block validation - UI is already shown
        // if (loading) return;

        const timeoutId = setTimeout(() => {
            validateSettings();
        }, 500); // Debounce validation by 500ms to reduce lag

        return () => clearTimeout(timeoutId);
    }, [settings, selectedFileTypes, validateSettings]);

    const handleSendAnnouncement = async () => {
        if (!isSuperAdmin() && !hasPermission('manageSettings')) {
            toast.error('Bạn không có quyền gửi thông báo hệ thống');
            return;
        }

        if (!announcementData.title.trim() || !announcementData.message.trim()) {
            toast.error('Please fill in both title and content');
            return;
        }

        // Validate scheduled date is in the future
        if (announcementData.scheduledDate && new Date(announcementData.scheduledDate) <= new Date()) {
            toast.error('Scheduled date must be in the future');
            return;
        }

        // Validate expiration date is after scheduled date
        if (announcementData.expirationDate && announcementData.scheduledDate) {
            if (new Date(announcementData.expirationDate) <= new Date(announcementData.scheduledDate)) {
                toast.error('Expiration date must be after scheduled date');
                return;
            }
        }

        try {
            setSendingAnnouncement(true);

            // Prepare announcement data for API
            const announcementPayload: any = {
                type: announcementData.type,
                title: announcementData.title,
                message: announcementData.message,
                priority: announcementData.priority,
            };

            if (announcementData.scheduledDate) {
                announcementPayload.scheduledDate = announcementData.scheduledDate;
            }

            if (announcementData.expirationDate) {
                announcementPayload.expirationDate = announcementData.expirationDate;
            }

            if (!announcementData.sendToAll && announcementData.targetRoles.length > 0) {
                announcementPayload.targetRoles = announcementData.targetRoles;
            }

            if (announcementData.targetUserIds.length > 0) {
                announcementPayload.recipientIds = announcementData.targetUserIds;
            }

            const result = await adminService.createSystemAnnouncement(announcementPayload);

            // Add to history
            const newHistoryItem = {
                id: Date.now().toString(),
                title: announcementData.title,
                sentAt: announcementData.scheduledDate || new Date().toISOString(),
                recipientCount: result.recipientCount || 0,
                readCount: 0,
            };
            setAnnouncementHistory(prev => [newHistoryItem, ...prev]);

            toast.success(
                announcementData.scheduledDate
                    ? `Announcement scheduled for ${new Date(announcementData.scheduledDate).toLocaleString()}`
                    : (result.message || `Announcement sent to ${result.recipientCount} users`)
            );

            setShowAnnouncementForm(false);
            setAnnouncementData({
                type: 'system_announcement',
                title: '',
                message: '',
                scheduledDate: '',
                priority: 'medium',
                expirationDate: '',
                targetRoles: [],
                targetUserIds: [],
                sendToAll: true,
            });
        } catch (error: unknown) {
            const axiosError = error as { response?: { data?: { message?: string } } };
            toast.error(axiosError.response?.data?.message || 'Error sending announcement');
        } finally {
            setSendingAnnouncement(false);
        }
    };

    // Swipe gesture handlers for mobile tab navigation
    const tabs = ['general', 'upload', 'system', 'security', 'appearance', 'email', 'users', 'notifications', 'monitoring'];

    const handleTouchStart = (e: React.TouchEvent) => {
        if (!isMobile) return;
        if (!e.touches[0]) return;
        swipeStartX.current = e.touches[0].clientX;
        swipeStartY.current = e.touches[0].clientY;
        swipeStartTime.current = Date.now();
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!isMobile) return;
        if (!e.touches[0]) return;
        // Prevent default scrolling if horizontal swipe
        const deltaX = Math.abs(e.touches[0].clientX - swipeStartX.current);
        const deltaY = Math.abs(e.touches[0].clientY - swipeStartY.current);
        if (deltaX > deltaY && tabsContainerRef.current) {
            e.preventDefault();
        }
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        if (!isMobile) return;
        if (!e.changedTouches[0]) return;
        const deltaX = e.changedTouches[0].clientX - swipeStartX.current;
        const deltaY = Math.abs(e.changedTouches[0].clientY - swipeStartY.current);
        const deltaTime = Date.now() - swipeStartTime.current;
        const minSwipeDistance = 50;
        const maxSwipeTime = 300;
        const maxVerticalDistance = 30; // Prevent vertical scrolls from triggering swipe

        // Only trigger swipe if:
        // 1. Horizontal movement is greater than vertical (horizontal swipe)
        // 2. Swipe distance is sufficient
        // 3. Swipe time is quick enough
        // 4. Vertical movement is minimal
        if (Math.abs(deltaX) > minSwipeDistance &&
            deltaTime < maxSwipeTime &&
            Math.abs(deltaX) > deltaY &&
            deltaY < maxVerticalDistance) {
            const currentIndex = tabs.indexOf(activeTab);
            if (deltaX < 0 && currentIndex < tabs.length - 1) {
                // Swipe left - next tab
                const nextTab = tabs[currentIndex + 1];
                if (nextTab) setActiveTab(nextTab);
            } else if (deltaX > 0 && currentIndex > 0) {
                // Swipe right - previous tab
                const prevTab = tabs[currentIndex - 1];
                if (prevTab) setActiveTab(prevTab);
            }
        }
    };

    // Swipe gesture handlers for tab content area
    const tabContentRef = useRef<HTMLDivElement>(null);
    const contentSwipeStartX = useRef<number>(0);
    const contentSwipeStartY = useRef<number>(0);
    const contentSwipeStartTime = useRef<number>(0);

    const handleContentTouchStart = (e: React.TouchEvent) => {
        if (!isMobile) return;
        if (!e.touches[0]) return;
        contentSwipeStartX.current = e.touches[0].clientX;
        contentSwipeStartY.current = e.touches[0].clientY;
        contentSwipeStartTime.current = Date.now();
    };

    const handleContentTouchMove = (e: React.TouchEvent) => {
        if (!isMobile) return;
        if (!e.touches[0]) return;
        const deltaX = Math.abs(e.touches[0].clientX - contentSwipeStartX.current);
        const deltaY = Math.abs(e.touches[0].clientY - contentSwipeStartY.current);
        // Only prevent default if it's clearly a horizontal swipe
        if (deltaX > 30 && deltaX > deltaY * 1.5) {
            e.preventDefault();
        }
    };

    const handleContentTouchEnd = (e: React.TouchEvent) => {
        if (!isMobile) return;
        if (!e.changedTouches[0]) return;
        const deltaX = e.changedTouches[0].clientX - contentSwipeStartX.current;
        const deltaY = Math.abs(e.changedTouches[0].clientY - contentSwipeStartY.current);
        const deltaTime = Date.now() - contentSwipeStartTime.current;
        const minSwipeDistance = 80; // Slightly higher for content area
        const maxSwipeTime = 400;
        const maxVerticalDistance = 50;

        if (Math.abs(deltaX) > minSwipeDistance &&
            deltaTime < maxSwipeTime &&
            Math.abs(deltaX) > deltaY * 1.5 &&
            deltaY < maxVerticalDistance) {
            const currentIndex = tabs.indexOf(activeTab);
            if (deltaX < 0 && currentIndex < tabs.length - 1) {
                const nextTab = tabs[currentIndex + 1];
                if (nextTab) setActiveTab(nextTab);
            } else if (deltaX > 0 && currentIndex > 0) {
                const prevTab = tabs[currentIndex - 1];
                if (prevTab) setActiveTab(prevTab);
            }
        }
    };

    // Don't block UI - show immediately with defaults, load in background
    // if (loading) {
    //     return <div className="admin-loading">Đang tải...</div>;
    // }

    return (
        <div className="admin-settings">
            {/* Skip to Content Link */}
            <a href="#admin-settings-main-content" className="admin-skip-link">
                Skip to main content
            </a>

            {/* Breadcrumb Navigation */}
            <nav className="admin-breadcrumb" aria-label="Breadcrumb">
                <ol className="admin-breadcrumb-list">
                    <li className="admin-breadcrumb-item">
                        <a href="/" className="admin-breadcrumb-link" aria-label="Home">
                            <Home size={16} />
                            <span>Home</span>
                        </a>
                    </li>
                    <li className="admin-breadcrumb-separator" aria-hidden="true">
                        <ChevronRight size={16} />
                    </li>
                    <li className="admin-breadcrumb-item">
                        <a href="/admin" className="admin-breadcrumb-link">Admin</a>
                    </li>
                    <li className="admin-breadcrumb-separator" aria-hidden="true">
                        <ChevronRight size={16} />
                    </li>
                    <li className="admin-breadcrumb-item" aria-current="page">
                        <span>Settings</span>
                    </li>
                </ol>
            </nav>

            <div className="admin-header">
                <h1 className="admin-title" id="admin-settings-main-content" tabIndex={-1}>{t('admin.systemSettings')}</h1>
            </div>

            <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className="admin-settings-tabs"
                aria-label="Settings sections"
            >
                <TabsList
                    className="admin-settings-tabs-list"
                    ref={tabsContainerRef}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                >
                    <TabsTrigger value="general">
                        <Globe size={16} style={{ marginRight: '0.5rem' }} aria-hidden="true" />
                        <span>General</span>
                    </TabsTrigger>
                    <TabsTrigger value="upload">
                        <Upload size={16} style={{ marginRight: '0.5rem' }} aria-hidden="true" />
                        <span>Upload</span>
                    </TabsTrigger>
                    <TabsTrigger value="system">
                        <Shield size={16} style={{ marginRight: '0.5rem' }} aria-hidden="true" />
                        <span>System</span>
                    </TabsTrigger>
                    <TabsTrigger value="security">
                        <Lock size={16} style={{ marginRight: '0.5rem' }} aria-hidden="true" />
                        <span>Security</span>
                    </TabsTrigger>
                    <TabsTrigger value="appearance">
                        <Palette size={16} style={{ marginRight: '0.5rem' }} aria-hidden="true" />
                        <span>Appearance</span>
                    </TabsTrigger>
                    <TabsTrigger value="email">
                        <Mail size={16} style={{ marginRight: '0.5rem' }} aria-hidden="true" />
                        <span>Email</span>
                    </TabsTrigger>
                    <TabsTrigger value="users">
                        <Users size={16} style={{ marginRight: '0.5rem' }} aria-hidden="true" />
                        <span>Users</span>
                    </TabsTrigger>
                    <TabsTrigger value="notifications">
                        <Bell size={16} style={{ marginRight: '0.5rem' }} aria-hidden="true" />
                        <span>Notifications</span>
                    </TabsTrigger>
                    <TabsTrigger value="monitoring">
                        <Activity size={16} style={{ marginRight: '0.5rem' }} aria-hidden="true" />
                        <span>Monitoring</span>
                    </TabsTrigger>
                </TabsList>

                {/* General Settings Tab */}
                <TabsContent
                    value="general"
                    className="admin-settings-tab-content"
                    ref={tabContentRef}
                    onTouchStart={handleContentTouchStart}
                    onTouchMove={handleContentTouchMove}
                    onTouchEnd={handleContentTouchEnd}
                >
                    <div className="admin-settings-two-column">
                        <Card className="admin-settings-card">
                            <CardHeader>
                                <CardTitle className="admin-settings-card-title">
                                    <Globe size={20} style={{ marginRight: '0.5rem' }} aria-hidden="true" />
                                    General Settings
                                </CardTitle>
                                <CardDescription>
                                    Configure basic site information and branding
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="admin-form">
                                    <div className={`admin-form-group admin-form-group-critical ${validationErrors.siteName ? 'has-error' : ''} ${settings.siteName !== originalSettings.siteName ? 'has-changes' : ''}`}>
                                        <Label htmlFor="site-name-input" className="admin-form-label-with-icon">
                                            <FileText size={16} className="admin-form-label-icon" aria-hidden="true" />
                                            {t('admin.siteName')}
                                            <span className="admin-required-indicator" aria-label="required">*</span>
                                            <span className="admin-setting-importance-badge admin-setting-importance-critical">Critical</span>
                                            <div className="admin-tooltip-wrapper">
                                                <HelpCircle size={14} className="admin-tooltip-icon" aria-hidden="true" />
                                                <span className="admin-tooltip-text" role="tooltip">
                                                    The name displayed in the browser tab and site header
                                                </span>
                                            </div>
                                        </Label>
                                        {/* Live Preview */}
                                        <div className="admin-setting-preview">
                                            <span className="admin-setting-preview-label">Preview:</span>
                                            <span className="admin-setting-preview-value">{settings.siteName || 'Your Site Name'}</span>
                                        </div>
                                        <Input
                                            id="site-name-input"
                                            value={settings.siteName}
                                            onChange={(e) => setSettings(prev => ({ ...prev, siteName: e.target.value }))}
                                            placeholder="Enter site name"
                                            className={validationErrors.siteName ? 'input-error' : ''}
                                            aria-describedby={validationErrors.siteName ? 'site-name-error' : 'site-name-help'}
                                            aria-invalid={validationErrors.siteName ? 'true' : 'false'}
                                            aria-required="true"
                                        />
                                        {validationErrors.siteName && (
                                            <p className="admin-validation-error" id="site-name-error" role="alert" aria-live="polite">
                                                <AlertCircle size={14} aria-hidden="true" />
                                                {validationErrors.siteName}
                                            </p>
                                        )}
                                        <span id="site-name-help" className="sr-only">
                                            Enter the name that will be displayed in the browser tab and site header
                                        </span>
                                        {settings.siteName !== originalSettings.siteName && !validationErrors.siteName && (
                                            <p className="admin-change-indicator">
                                                <span className="admin-change-dot"></span>
                                                Modified
                                            </p>
                                        )}
                                    </div>

                                    <div className={`admin-form-group admin-form-group-important ${validationErrors.siteDescription ? 'has-error' : ''} ${settings.siteDescription !== originalSettings.siteDescription ? 'has-changes' : ''}`}>
                                        <Label htmlFor="site-description-input" className="admin-form-label-with-icon">
                                            <Info size={16} className="admin-form-label-icon" aria-hidden="true" />
                                            {t('admin.siteDescription')}
                                            <span className="admin-setting-importance-badge admin-setting-importance-important">Important</span>
                                            <div className="admin-tooltip-wrapper">
                                                <HelpCircle size={14} className="admin-tooltip-icon" aria-hidden="true" />
                                                <span className="admin-tooltip-text" role="tooltip">
                                                    A brief description of your site (used for SEO and social sharing)
                                                </span>
                                            </div>
                                        </Label>
                                        <Input
                                            id="site-description-input"
                                            value={settings.siteDescription}
                                            onChange={(e) => setSettings(prev => ({ ...prev, siteDescription: e.target.value }))}
                                            placeholder="Enter site description"
                                            className={validationErrors.siteDescription ? 'input-error' : ''}
                                            aria-describedby={validationErrors.siteDescription ? 'site-description-error' : 'site-description-help'}
                                            aria-invalid={validationErrors.siteDescription ? 'true' : 'false'}
                                            maxLength={500}
                                        />
                                        {validationErrors.siteDescription && (
                                            <p className="admin-validation-error" id="site-description-error" role="alert" aria-live="polite">
                                                <AlertCircle size={14} aria-hidden="true" />
                                                {validationErrors.siteDescription}
                                            </p>
                                        )}
                                        {settings.siteDescription !== originalSettings.siteDescription && !validationErrors.siteDescription && (
                                            <p className="admin-change-indicator" aria-live="polite">
                                                <span className="admin-change-dot" aria-hidden="true"></span>
                                                Modified
                                            </p>
                                        )}
                                        <p className="admin-form-help-text" id="site-description-help">
                                            {settings.siteDescription.length}/500 characters
                                        </p>
                                    </div>

                                    {/* Site Logo Upload */}
                                    <div className={`admin-form-group admin-form-group-important ${settings.siteLogo !== originalSettings.siteLogo ? 'has-changes' : ''}`}>
                                        <Label htmlFor="site-logo-upload" className="admin-form-label-with-icon">
                                            <ImageIcon size={16} className="admin-form-label-icon" aria-hidden="true" />
                                            Site Logo
                                            <span className="admin-setting-importance-badge admin-setting-importance-important">Important</span>
                                            <div className="admin-tooltip-wrapper">
                                                <HelpCircle size={14} className="admin-tooltip-icon" aria-hidden="true" />
                                                <span className="admin-tooltip-text" role="tooltip">
                                                    Upload a custom logo for your site. Recommended size: 200x50px. Supported formats: PNG, JPG, SVG
                                                </span>
                                            </div>
                                        </Label>
                                        <div className="admin-file-upload-wrapper">
                                            <input
                                                type="file"
                                                id="site-logo-upload"
                                                accept="image/png,image/jpeg,image/jpg,image/svg+xml"
                                                onChange={async (e) => {
                                                    const file = e.target.files?.[0];
                                                    if (!file) return;

                                                    if (file.size > 5 * 1024 * 1024) {
                                                        toast.error('Logo file size must be less than 5MB');
                                                        return;
                                                    }

                                                    try {
                                                        setUploadingLogo(true);
                                                        // TODO: Implement actual upload to server
                                                        // For now, create a preview URL
                                                        const reader = new FileReader();
                                                        reader.onload = (event) => {
                                                            const result = event.target?.result as string;
                                                            setSettings({ ...settings, siteLogo: result });
                                                        };
                                                        reader.readAsDataURL(file);
                                                        toast.success('Logo uploaded successfully');
                                                    } catch (_error) {
                                                        toast.error('Failed to upload logo');
                                                    } finally {
                                                        setUploadingLogo(false);
                                                    }
                                                }}
                                                className="admin-file-input"
                                                disabled={uploadingLogo}
                                            />
                                            <label htmlFor="site-logo-upload" className="admin-file-upload-label">
                                                <Upload size={16} aria-hidden="true" />
                                                {uploadingLogo ? 'Uploading...' : settings.siteLogo ? 'Change Logo' : 'Upload Logo'}
                                            </label>
                                            {settings.siteLogo && (
                                                <div className="admin-image-preview">
                                                    <img src={settings.siteLogo} alt="Site logo preview" className="admin-image-preview-img" />
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => setSettings(prev => ({ ...prev, siteLogo: '' }))}
                                                        className="admin-image-preview-remove"
                                                        aria-label="Remove logo"
                                                    >
                                                        <X size={16} />
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Favicon Upload */}
                                    <div className={`admin-form-group admin-form-group-important ${settings.favicon !== originalSettings.favicon ? 'has-changes' : ''}`}>
                                        <Label htmlFor="favicon-upload" className="admin-form-label-with-icon">
                                            <ImageIcon size={16} className="admin-form-label-icon" aria-hidden="true" />
                                            Favicon
                                            <span className="admin-setting-importance-badge admin-setting-importance-important">Important</span>
                                            <div className="admin-tooltip-wrapper">
                                                <HelpCircle size={14} className="admin-tooltip-icon" aria-hidden="true" />
                                                <span className="admin-tooltip-text" role="tooltip">
                                                    Upload a custom favicon. Recommended size: 32x32px or 16x16px. Supported formats: ICO, PNG
                                                </span>
                                            </div>
                                        </Label>
                                        <div className="admin-file-upload-wrapper">
                                            <input
                                                type="file"
                                                id="favicon-upload"
                                                accept="image/x-icon,image/png,image/ico"
                                                onChange={async (e) => {
                                                    const file = e.target.files?.[0];
                                                    if (!file) return;

                                                    if (file.size > 1 * 1024 * 1024) {
                                                        toast.error('Favicon file size must be less than 1MB');
                                                        return;
                                                    }

                                                    try {
                                                        setUploadingFavicon(true);
                                                        // TODO: Implement actual upload to server
                                                        const reader = new FileReader();
                                                        reader.onload = (event) => {
                                                            const result = event.target?.result as string;
                                                            setSettings({ ...settings, favicon: result });
                                                        };
                                                        reader.readAsDataURL(file);
                                                        toast.success('Favicon uploaded successfully');
                                                    } catch (_error) {
                                                        toast.error('Failed to upload favicon');
                                                    } finally {
                                                        setUploadingFavicon(false);
                                                    }
                                                }}
                                                className="admin-file-input"
                                                disabled={uploadingFavicon}
                                            />
                                            <label htmlFor="favicon-upload" className="admin-file-upload-label">
                                                <Upload size={16} aria-hidden="true" />
                                                {uploadingFavicon ? 'Uploading...' : settings.favicon ? 'Change Favicon' : 'Upload Favicon'}
                                            </label>
                                            {settings.favicon && (
                                                <div className="admin-image-preview admin-image-preview-small">
                                                    <img src={settings.favicon} alt="Favicon preview" className="admin-image-preview-img" />
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => setSettings(prev => ({ ...prev, favicon: '' }))}
                                                        className="admin-image-preview-remove"
                                                        aria-label="Remove favicon"
                                                    >
                                                        <X size={16} />
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Default Language */}
                                    <div className={`admin-form-group admin-form-group-important ${settings.defaultLanguage !== originalSettings.defaultLanguage ? 'has-changes' : ''}`}>
                                        <Label htmlFor="default-language-select" className="admin-form-label-with-icon">
                                            <Languages size={16} className="admin-form-label-icon" aria-hidden="true" />
                                            Default Language
                                            <span className="admin-setting-importance-badge admin-setting-importance-important">Important</span>
                                            <div className="admin-tooltip-wrapper">
                                                <HelpCircle size={14} className="admin-tooltip-icon" aria-hidden="true" />
                                                <span className="admin-tooltip-text" role="tooltip">
                                                    Set the default language for new users and the site interface
                                                </span>
                                            </div>
                                        </Label>
                                        <select
                                            id="default-language-select"
                                            value={settings.defaultLanguage}
                                            onChange={(e) => setSettings(prev => ({ ...prev, defaultLanguage: e.target.value }))}
                                            className="admin-select"
                                            aria-describedby="default-language-help"
                                        >
                                            {availableLanguages.map((lang) => (
                                                <option key={lang.value} value={lang.value}>
                                                    {lang.label}
                                                </option>
                                            ))}
                                        </select>
                                        <span id="default-language-help" className="sr-only">
                                            Select the default language for the site
                                        </span>
                                        {settings.defaultLanguage !== originalSettings.defaultLanguage && (
                                            <p className="admin-change-indicator" aria-live="polite">
                                                <span className="admin-change-dot" aria-hidden="true"></span>
                                                Modified
                                            </p>
                                        )}
                                    </div>

                                    {/* Timezone */}
                                    <div className={`admin-form-group admin-form-group-important ${settings.timezone !== originalSettings.timezone ? 'has-changes' : ''}`}>
                                        <Label htmlFor="timezone-select" className="admin-form-label-with-icon">
                                            <Clock size={16} className="admin-form-label-icon" aria-hidden="true" />
                                            Timezone
                                            <span className="admin-setting-importance-badge admin-setting-importance-important">Important</span>
                                            <div className="admin-tooltip-wrapper">
                                                <HelpCircle size={14} className="admin-tooltip-icon" aria-hidden="true" />
                                                <span className="admin-tooltip-text" role="tooltip">
                                                    Set the default timezone for the application
                                                </span>
                                            </div>
                                        </Label>
                                        <select
                                            id="timezone-select"
                                            value={settings.timezone}
                                            onChange={(e) => setSettings(prev => ({ ...prev, timezone: e.target.value }))}
                                            className="admin-select"
                                            aria-describedby="timezone-help"
                                        >
                                            {timezones.map((tz) => (
                                                <option key={tz.value} value={tz.value}>
                                                    {tz.label}
                                                </option>
                                            ))}
                                        </select>
                                        <span id="timezone-help" className="sr-only">
                                            Select the default timezone for the site
                                        </span>
                                        {settings.timezone !== originalSettings.timezone && (
                                            <p className="admin-change-indicator" aria-live="polite">
                                                <span className="admin-change-dot" aria-hidden="true"></span>
                                                Modified
                                            </p>
                                        )}
                                    </div>

                                    {/* Contact Email */}
                                    <div className={`admin-form-group admin-form-group-important ${settings.contactEmail !== originalSettings.contactEmail ? 'has-changes' : ''}`}>
                                        <Label htmlFor="contact-email-input" className="admin-form-label-with-icon">
                                            <Mail size={16} className="admin-form-label-icon" aria-hidden="true" />
                                            Contact Email
                                            <span className="admin-setting-importance-badge admin-setting-importance-important">Important</span>
                                            <div className="admin-tooltip-wrapper">
                                                <HelpCircle size={14} className="admin-tooltip-icon" aria-hidden="true" />
                                                <span className="admin-tooltip-text" role="tooltip">
                                                    Set the contact email address for support inquiries
                                                </span>
                                            </div>
                                        </Label>
                                        <Input
                                            id="contact-email-input"
                                            type="email"
                                            value={settings.contactEmail}
                                            onChange={(e) => setSettings(prev => ({ ...prev, contactEmail: e.target.value }))}
                                            placeholder="support@example.com"
                                            className={validationErrors.contactEmail ? 'input-error' : ''}
                                            aria-describedby={validationErrors.contactEmail ? 'contact-email-error' : 'contact-email-help'}
                                            aria-invalid={validationErrors.contactEmail ? 'true' : 'false'}
                                        />
                                        {validationErrors.contactEmail && (
                                            <p className="admin-validation-error" id="contact-email-error" role="alert" aria-live="polite">
                                                <AlertCircle size={14} aria-hidden="true" />
                                                {validationErrors.contactEmail}
                                            </p>
                                        )}
                                        <span id="contact-email-help" className="sr-only">
                                            Enter a valid email address for support inquiries
                                        </span>
                                        {settings.contactEmail !== originalSettings.contactEmail && !validationErrors.contactEmail && (
                                            <p className="admin-change-indicator" aria-live="polite">
                                                <span className="admin-change-dot" aria-hidden="true"></span>
                                                Modified
                                            </p>
                                        )}
                                    </div>

                                    {/* Social Media Links */}
                                    <div className={`admin-form-group ${socialLinksChanged ? 'has-changes' : ''}`}>
                                        <Label className="admin-form-label-with-icon">
                                            <Link2 size={16} className="admin-form-label-icon" aria-hidden="true" />
                                            Social Media Links
                                            <div className="admin-tooltip-wrapper">
                                                <HelpCircle size={14} className="admin-tooltip-icon" aria-hidden="true" />
                                                <span className="admin-tooltip-text" role="tooltip">
                                                    Add links to your social media profiles
                                                </span>
                                            </div>
                                        </Label>
                                        <div className="admin-social-links-grid">
                                            <div className="admin-form-group">
                                                <Label htmlFor="social-facebook" className="admin-social-label">
                                                    <Facebook size={16} className="admin-social-icon" aria-hidden="true" />
                                                    Facebook
                                                </Label>
                                                <Input
                                                    id="social-facebook"
                                                    type="url"
                                                    value={settings.socialMediaLinks.facebook}
                                                    onChange={(e) => setSettings({
                                                        ...settings,
                                                        socialMediaLinks: { ...settings.socialMediaLinks, facebook: e.target.value }
                                                    })}
                                                    placeholder="https://facebook.com/yourpage"
                                                />
                                            </div>
                                            <div className="admin-form-group">
                                                <Label htmlFor="social-twitter" className="admin-social-label">
                                                    <Twitter size={16} className="admin-social-icon" aria-hidden="true" />
                                                    Twitter
                                                </Label>
                                                <Input
                                                    id="social-twitter"
                                                    type="url"
                                                    value={settings.socialMediaLinks.twitter}
                                                    onChange={(e) => setSettings({
                                                        ...settings,
                                                        socialMediaLinks: { ...settings.socialMediaLinks, twitter: e.target.value }
                                                    })}
                                                    placeholder="https://twitter.com/yourhandle"
                                                />
                                            </div>
                                            <div className="admin-form-group">
                                                <Label htmlFor="social-instagram" className="admin-social-label">
                                                    <Instagram size={16} className="admin-social-icon" aria-hidden="true" />
                                                    Instagram
                                                </Label>
                                                <Input
                                                    id="social-instagram"
                                                    type="url"
                                                    value={settings.socialMediaLinks.instagram}
                                                    onChange={(e) => setSettings({
                                                        ...settings,
                                                        socialMediaLinks: { ...settings.socialMediaLinks, instagram: e.target.value }
                                                    })}
                                                    placeholder="https://instagram.com/yourhandle"
                                                />
                                            </div>
                                            <div className="admin-form-group">
                                                <Label htmlFor="social-linkedin" className="admin-social-label">
                                                    <Linkedin size={16} className="admin-social-icon" aria-hidden="true" />
                                                    LinkedIn
                                                </Label>
                                                <Input
                                                    id="social-linkedin"
                                                    type="url"
                                                    value={settings.socialMediaLinks.linkedin}
                                                    onChange={(e) => setSettings({
                                                        ...settings,
                                                        socialMediaLinks: { ...settings.socialMediaLinks, linkedin: e.target.value }
                                                    })}
                                                    placeholder="https://linkedin.com/company/yourcompany"
                                                />
                                            </div>
                                            <div className="admin-form-group">
                                                <Label htmlFor="social-youtube" className="admin-social-label">
                                                    <Youtube size={16} className="admin-social-icon" aria-hidden="true" />
                                                    YouTube
                                                </Label>
                                                <Input
                                                    id="social-youtube"
                                                    type="url"
                                                    value={settings.socialMediaLinks.youtube}
                                                    onChange={(e) => setSettings({
                                                        ...settings,
                                                        socialMediaLinks: { ...settings.socialMediaLinks, youtube: e.target.value }
                                                    })}
                                                    placeholder="https://youtube.com/@yourchannel"
                                                />
                                            </div>
                                        </div>
                                        {socialLinksChanged && (
                                            <p className="admin-change-indicator" aria-live="polite">
                                                <span className="admin-change-dot" aria-hidden="true"></span>
                                                Modified
                                            </p>
                                        )}
                                    </div>

                                    {/* Progressive Disclosure - Advanced Settings */}
                                    <div className="admin-advanced-settings-section">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            className="admin-advanced-settings-toggle"
                                            onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                                        >
                                            <span>Advanced Settings</span>
                                            {showAdvancedSettings ? (
                                                <ChevronUp size={18} />
                                            ) : (
                                                <ChevronDown size={18} />
                                            )}
                                        </Button>
                                        {showAdvancedSettings && (
                                            <div className="admin-advanced-settings-content">
                                                {/* Additional advanced settings can be added here */}
                                                <p className="admin-form-help-text">
                                                    Advanced configuration options will be available here.
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    <div className="admin-modal-actions">
                                        <div className="admin-actions-status">
                                            {hasChanges && (
                                                <div className="admin-unsaved-changes-indicator">
                                                    <AlertCircle size={16} />
                                                    <span>You have unsaved changes</span>
                                                </div>
                                            )}
                                            {saveSuccess && (
                                                <div className={`admin-save-success-indicator ${isFadingOut ? 'fade-out' : ''}`}>
                                                    <CheckCircle2 size={16} />
                                                    <span>Settings saved successfully!</span>
                                                </div>
                                            )}
                                        </div>
                                        <Button
                                            onClick={handleSave}
                                            loading={saving}
                                            disabled={!hasChanges || Object.keys(validationErrors).length > 0}
                                            className="admin-add-category-btn"
                                            aria-label={saving ? 'Saving settings' : 'Save all settings'}
                                            aria-describedby="save-button-help"
                                        >
                                            {!saving && <Save size={16} aria-hidden="true" />}
                                            {saving ? t('admin.saving') : t('admin.saveSettings')}
                                        </Button>
                                        <span id="save-button-help" className="sr-only">
                                            {!hasChanges ? 'No changes to save' : Object.keys(validationErrors).length > 0 ? 'Please fix errors before saving' : 'Save all settings changes'}
                                        </span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* Upload Settings Tab */}
                <TabsContent
                    value="upload"
                    className="admin-settings-tab-content"
                    ref={tabContentRef}
                    onTouchStart={handleContentTouchStart}
                    onTouchMove={handleContentTouchMove}
                    onTouchEnd={handleContentTouchEnd}
                >
                    <Card className="admin-settings-card">
                        <CardHeader>
                            <CardTitle className="admin-settings-card-title">
                                <Upload size={20} style={{ marginRight: '0.5rem' }} aria-hidden="true" />
                                Upload Settings
                            </CardTitle>
                            <CardDescription>
                                Configure file upload limits and allowed formats
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="admin-form">
                                <div className={`admin-form-group admin-form-group-important ${validationErrors.maxUploadSize ? 'has-error' : ''} ${settings.maxUploadSize !== originalSettings.maxUploadSize ? 'has-changes' : ''}`}>
                                    <Label htmlFor="max-upload-size-input" className="admin-form-label-with-icon">
                                        <Server size={16} className="admin-form-label-icon" aria-hidden="true" />
                                        {t('admin.maxUploadSize')} (MB)
                                        <span className="admin-setting-importance-badge admin-setting-importance-important">Important</span>
                                        <div className="admin-tooltip-wrapper">
                                            <HelpCircle size={14} className="admin-tooltip-icon" aria-hidden="true" />
                                            <span className="admin-tooltip-text" role="tooltip">
                                                Maximum file size allowed for uploads. Higher values may require server configuration changes.
                                            </span>
                                        </div>
                                    </Label>
                                    {/* Status Badge for Upload Size */}
                                    <div className="admin-setting-status-info">
                                        <span className={`admin-status-badge admin-status-badge-info ${settings.maxUploadSize > 50 ? 'admin-status-badge-warning' : ''}`}>
                                            {settings.maxUploadSize > 50 ? (
                                                <>
                                                    <AlertTriangle size={14} aria-hidden="true" />
                                                    Large size may impact performance
                                                </>
                                            ) : (
                                                <>
                                                    <CheckCircle size={14} aria-hidden="true" />
                                                    Optimal size
                                                </>
                                            )}
                                        </span>
                                    </div>
                                    <Input
                                        id="max-upload-size-input"
                                        type="number"
                                        value={settings.maxUploadSize}
                                        onChange={(e) => setSettings(prev => ({ ...prev, maxUploadSize: parseInt(e.target.value) || 10 }))}
                                        min="1"
                                        max="1000"
                                        className={validationErrors.maxUploadSize ? 'input-error' : ''}
                                        aria-describedby={validationErrors.maxUploadSize ? 'max-upload-size-error' : 'max-upload-size-help'}
                                        aria-invalid={validationErrors.maxUploadSize ? 'true' : 'false'}
                                        aria-required="true"
                                    />
                                    {validationErrors.maxUploadSize && (
                                        <p className="admin-validation-error" id="max-upload-size-error" role="alert" aria-live="polite">
                                            <AlertCircle size={14} aria-hidden="true" />
                                            {validationErrors.maxUploadSize}
                                        </p>
                                    )}
                                    {settings.maxUploadSize !== originalSettings.maxUploadSize && !validationErrors.maxUploadSize && (
                                        <p className="admin-change-indicator" aria-live="polite">
                                            <span className="admin-change-dot" aria-hidden="true"></span>
                                            Modified
                                        </p>
                                    )}
                                    <p className="admin-form-help-text" id="max-upload-size-help">
                                        Maximum file size users can upload (1-1000 MB)
                                    </p>
                                </div>

                                <div className={`admin-form-group admin-form-group-critical ${validationErrors.allowedFileTypes ? 'has-error' : ''} ${settings.allowedFileTypes !== originalSettings.allowedFileTypes ? 'has-changes' : ''}`}>
                                    <Label id="file-formats-label" className="admin-form-label-with-icon">
                                        <ImageIcon size={16} className="admin-form-label-icon" aria-hidden="true" />
                                        {t('admin.allowedFileFormats')}
                                        <span className="admin-setting-importance-badge admin-setting-importance-critical">Critical</span>
                                        <div className="admin-tooltip-wrapper">
                                            <HelpCircle size={14} className="admin-tooltip-icon" aria-hidden="true" />
                                            <span className="admin-tooltip-text" role="tooltip">
                                                Select which file formats users can upload. At least one format must be selected.
                                            </span>
                                        </div>
                                    </Label>
                                    {/* Status Badge for File Types */}
                                    <div className="admin-setting-status-info">
                                        <span className={`admin-status-badge admin-status-badge-info ${selectedFileTypes.length === 0 ? 'admin-status-badge-error' : selectedFileTypes.length < 3 ? 'admin-status-badge-warning' : ''}`}>
                                            {selectedFileTypes.length === 0 ? (
                                                <>
                                                    <XCircle size={14} aria-hidden="true" />
                                                    No formats selected
                                                </>
                                            ) : selectedFileTypes.length < 3 ? (
                                                <>
                                                    <AlertTriangle size={14} aria-hidden="true" />
                                                    Limited formats ({selectedFileTypes.length})
                                                </>
                                            ) : (
                                                <>
                                                    <CheckCircle size={14} aria-hidden="true" />
                                                    {selectedFileTypes.length} formats enabled
                                                </>
                                            )}
                                        </span>
                                    </div>
                                    <div
                                        className="admin-file-types-selector"
                                        role="group"
                                        aria-labelledby="file-formats-label"
                                        aria-describedby="file-formats-help"
                                    >
                                        {availableFileTypes.map((fileType) => {
                                            const isSelected = selectedFileTypes.includes(fileType.value);
                                            return (
                                                <label
                                                    key={fileType.value}
                                                    className={`admin-file-type-checkbox ${isSelected ? 'selected' : ''}`}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={() => handleFileTypeToggle(fileType.value)}
                                                        aria-label={`${fileType.label} file format`}
                                                        aria-describedby={`file-format-${fileType.value}-desc`}
                                                    />
                                                    <span id={`file-format-${fileType.value}-desc`}>{fileType.label}</span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                    {validationErrors.allowedFileTypes && (
                                        <p className="admin-validation-error" id="file-formats-error" role="alert" aria-live="polite">
                                            <AlertCircle size={14} aria-hidden="true" />
                                            {validationErrors.allowedFileTypes}
                                        </p>
                                    )}
                                    <span id="file-formats-help" className="sr-only">
                                        Select which file formats users can upload. At least one format must be selected. Use spacebar or enter to toggle.
                                    </span>
                                    {settings.allowedFileTypes !== originalSettings.allowedFileTypes && !validationErrors.allowedFileTypes && (
                                        <p className="admin-change-indicator">
                                            <span className="admin-change-dot"></span>
                                            Modified
                                        </p>
                                    )}
                                </div>

                                {/* Image Quality */}
                                <div className={`admin-form-group admin-form-group-important ${settings.imageQuality !== originalSettings.imageQuality ? 'has-changes' : ''}`}>
                                    <Label htmlFor="image-quality-input" className="admin-form-label-with-icon">
                                        <Image size={16} className="admin-form-label-icon" aria-hidden="true" />
                                        Image Quality
                                        <span className="admin-setting-importance-badge admin-setting-importance-important">Important</span>
                                        <div className="admin-tooltip-wrapper">
                                            <HelpCircle size={14} className="admin-tooltip-icon" aria-hidden="true" />
                                            <span className="admin-tooltip-text" role="tooltip">
                                                Set default image compression quality (1-100). Higher values mean better quality but larger file sizes.
                                            </span>
                                        </div>
                                    </Label>
                                    <div className="admin-range-input-wrapper">
                                        <Input
                                            id="image-quality-input"
                                            type="range"
                                            min="1"
                                            max="100"
                                            value={settings.imageQuality}
                                            onChange={(e) => setSettings(prev => ({ ...prev, imageQuality: parseInt(e.target.value) }))}
                                            className="admin-range-input"
                                        />
                                        <span className="admin-range-value">{settings.imageQuality}%</span>
                                    </div>
                                    <p className="admin-form-help-text">
                                        Current quality: {settings.imageQuality}% {settings.imageQuality >= 80 ? '(High)' : settings.imageQuality >= 50 ? '(Medium)' : '(Low)'}
                                    </p>
                                    {settings.imageQuality !== originalSettings.imageQuality && (
                                        <p className="admin-change-indicator" aria-live="polite">
                                            <span className="admin-change-dot" aria-hidden="true"></span>
                                            Modified
                                        </p>
                                    )}
                                </div>

                                {/* Watermark Settings */}
                                <div className={`admin-form-group ${settings.watermarkEnabled !== originalSettings.watermarkEnabled || settings.watermarkImage !== originalSettings.watermarkImage ? 'has-changes' : ''}`}>
                                    <Label className="admin-form-label-with-icon">
                                        <Image size={16} className="admin-form-label-icon" aria-hidden="true" />
                                        Watermark Settings
                                        <div className="admin-tooltip-wrapper">
                                            <HelpCircle size={14} className="admin-tooltip-icon" aria-hidden="true" />
                                            <span className="admin-tooltip-text" role="tooltip">
                                                Enable watermarking and upload a watermark image to be applied to all uploaded images
                                            </span>
                                        </div>
                                    </Label>
                                    <div className="admin-form-group">
                                        <Label className="admin-maintenance-toggle-label" htmlFor="watermark-enabled-toggle">
                                            <input
                                                id="watermark-enabled-toggle"
                                                type="checkbox"
                                                checked={settings.watermarkEnabled}
                                                onChange={(e) => setSettings(prev => ({ ...prev, watermarkEnabled: e.target.checked }))}
                                                className="admin-maintenance-checkbox"
                                            />
                                            <span>Enable Watermark</span>
                                        </Label>
                                    </div>
                                    {settings.watermarkEnabled && (
                                        <div className="admin-file-upload-wrapper">
                                            <input
                                                type="file"
                                                id="watermark-upload"
                                                accept="image/png,image/jpeg,image/jpg,image/svg+xml"
                                                onChange={async (e) => {
                                                    const file = e.target.files?.[0];
                                                    if (!file) return;
                                                    if (file.size > 2 * 1024 * 1024) {
                                                        toast.error('Watermark file size must be less than 2MB');
                                                        return;
                                                    }
                                                    const reader = new FileReader();
                                                    reader.onload = (event) => {
                                                        const result = event.target?.result as string;
                                                        setSettings({ ...settings, watermarkImage: result });
                                                    };
                                                    reader.readAsDataURL(file);
                                                }}
                                                className="admin-file-input"
                                            />
                                            <label htmlFor="watermark-upload" className="admin-file-upload-label">
                                                <Upload size={16} aria-hidden="true" />
                                                {settings.watermarkImage ? 'Change Watermark' : 'Upload Watermark Image'}
                                            </label>
                                            {settings.watermarkImage && (
                                                <div className="admin-image-preview">
                                                    <img src={settings.watermarkImage} alt="Watermark preview" className="admin-image-preview-img" />
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => setSettings(prev => ({ ...prev, watermarkImage: '' }))}
                                                        className="admin-image-preview-remove"
                                                        aria-label="Remove watermark"
                                                    >
                                                        <X size={16} />
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Auto-resize Settings */}
                                <div className={`admin-form-group admin-form-group-important ${settings.autoResizeEnabled !== originalSettings.autoResizeEnabled || settings.autoResizeMaxWidth !== originalSettings.autoResizeMaxWidth || settings.autoResizeMaxHeight !== originalSettings.autoResizeMaxHeight ? 'has-changes' : ''}`}>
                                    <Label className="admin-form-label-with-icon">
                                        <Maximize2 size={16} className="admin-form-label-icon" aria-hidden="true" />
                                        Auto-resize Settings
                                        <span className="admin-setting-importance-badge admin-setting-importance-important">Important</span>
                                        <div className="admin-tooltip-wrapper">
                                            <HelpCircle size={14} className="admin-tooltip-icon" aria-hidden="true" />
                                            <span className="admin-tooltip-text" role="tooltip">
                                                Automatically resize images that exceed the maximum dimensions
                                            </span>
                                        </div>
                                    </Label>
                                    <div className="admin-form-group">
                                        <Label className="admin-maintenance-toggle-label" htmlFor="auto-resize-enabled-toggle">
                                            <input
                                                id="auto-resize-enabled-toggle"
                                                type="checkbox"
                                                checked={settings.autoResizeEnabled}
                                                onChange={(e) => setSettings(prev => ({ ...prev, autoResizeEnabled: e.target.checked }))}
                                                className="admin-maintenance-checkbox"
                                            />
                                            <span>Enable Auto-resize</span>
                                        </Label>
                                    </div>
                                    {settings.autoResizeEnabled && (
                                        <div className="admin-resize-dimensions">
                                            <div className="admin-form-group">
                                                <Label htmlFor="auto-resize-max-width">Max Width (px)</Label>
                                                <Input
                                                    id="auto-resize-max-width"
                                                    type="number"
                                                    value={settings.autoResizeMaxWidth}
                                                    onChange={(e) => setSettings(prev => ({ ...prev, autoResizeMaxWidth: parseInt(e.target.value) || 1920 }))}
                                                    min="100"
                                                    max="10000"
                                                />
                                            </div>
                                            <div className="admin-form-group">
                                                <Label htmlFor="auto-resize-max-height">Max Height (px)</Label>
                                                <Input
                                                    id="auto-resize-max-height"
                                                    type="number"
                                                    value={settings.autoResizeMaxHeight}
                                                    onChange={(e) => setSettings(prev => ({ ...prev, autoResizeMaxHeight: parseInt(e.target.value) || 1080 }))}
                                                    min="100"
                                                    max="10000"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Video Settings */}
                                <div className={`admin-form-group admin-form-group-important ${settings.maxVideoDuration !== originalSettings.maxVideoDuration || settings.videoQuality !== originalSettings.videoQuality ? 'has-changes' : ''}`}>
                                    <Label className="admin-form-label-with-icon">
                                        <Video size={16} className="admin-form-label-icon" aria-hidden="true" />
                                        Video Settings
                                        <span className="admin-setting-importance-badge admin-setting-importance-important">Important</span>
                                        <div className="admin-tooltip-wrapper">
                                            <HelpCircle size={14} className="admin-tooltip-icon" aria-hidden="true" />
                                            <span className="admin-tooltip-text" role="tooltip">
                                                Configure maximum video duration and quality settings
                                            </span>
                                        </div>
                                    </Label>
                                    <div className="admin-form-group">
                                        <Label htmlFor="max-video-duration-input">Max Video Duration (seconds)</Label>
                                        <Input
                                            id="max-video-duration-input"
                                            type="number"
                                            value={settings.maxVideoDuration}
                                            onChange={(e) => setSettings(prev => ({ ...prev, maxVideoDuration: parseInt(e.target.value) || 300 }))}
                                            min="1"
                                            max="3600"
                                        />
                                        <p className="admin-form-help-text">
                                            Maximum allowed video duration: {Math.floor(settings.maxVideoDuration / 60)} minutes {settings.maxVideoDuration % 60} seconds
                                        </p>
                                    </div>
                                    <div className="admin-form-group">
                                        <Label htmlFor="video-quality-select">Video Quality</Label>
                                        <select
                                            id="video-quality-select"
                                            value={settings.videoQuality}
                                            onChange={(e) => setSettings(prev => ({ ...prev, videoQuality: e.target.value }))}
                                            className="admin-select"
                                        >
                                            <option value="low">Low (Smaller file size)</option>
                                            <option value="medium">Medium (Balanced)</option>
                                            <option value="high">High (Better quality)</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Batch Upload Limit */}
                                <div className={`admin-form-group admin-form-group-important ${settings.batchUploadLimit !== originalSettings.batchUploadLimit ? 'has-changes' : ''}`}>
                                    <Label htmlFor="batch-upload-limit-input" className="admin-form-label-with-icon">
                                        <Upload size={16} className="admin-form-label-icon" aria-hidden="true" />
                                        Batch Upload Limit
                                        <span className="admin-setting-importance-badge admin-setting-importance-important">Important</span>
                                        <div className="admin-tooltip-wrapper">
                                            <HelpCircle size={14} className="admin-tooltip-icon" aria-hidden="true" />
                                            <span className="admin-tooltip-text" role="tooltip">
                                                Maximum number of files that can be uploaded in a single batch
                                            </span>
                                        </div>
                                    </Label>
                                    <Input
                                        id="batch-upload-limit-input"
                                        type="number"
                                        value={settings.batchUploadLimit}
                                        onChange={(e) => setSettings(prev => ({ ...prev, batchUploadLimit: parseInt(e.target.value) || 10 }))}
                                        min="1"
                                        max="100"
                                    />
                                    <p className="admin-form-help-text">
                                        Users can upload up to {settings.batchUploadLimit} files at once
                                    </p>
                                    {settings.batchUploadLimit !== originalSettings.batchUploadLimit && (
                                        <p className="admin-change-indicator" aria-live="polite">
                                            <span className="admin-change-dot" aria-hidden="true"></span>
                                            Modified
                                        </p>
                                    )}
                                </div>

                                <div className="admin-modal-actions">
                                    <div className="admin-actions-status">
                                        {hasChanges && (
                                            <div className="admin-unsaved-changes-indicator">
                                                <AlertCircle size={16} />
                                                <span>You have unsaved changes</span>
                                            </div>
                                        )}
                                        {saveSuccess && (
                                            <div className={`admin-save-success-indicator ${isFadingOut ? 'fade-out' : ''}`}>
                                                <CheckCircle2 size={16} />
                                                <span>Settings saved successfully!</span>
                                            </div>
                                        )}
                                    </div>
                                    <Button
                                        onClick={handleSave}
                                        loading={saving}
                                        disabled={!hasChanges || Object.keys(validationErrors).length > 0}
                                        className="admin-add-category-btn"
                                        aria-label={saving ? 'Saving settings' : 'Save all settings'}
                                        aria-describedby="save-button-help"
                                    >
                                        {!saving && <Save size={16} aria-hidden="true" />}
                                        {saving ? t('admin.saving') : t('admin.saveSettings')}
                                    </Button>
                                    <span id="save-button-help" className="sr-only">
                                        {!hasChanges ? 'No changes to save' : Object.keys(validationErrors).length > 0 ? 'Please fix errors before saving' : 'Save all settings changes'}
                                    </span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Appearance & Branding Tab */}
                <TabsContent
                    value="appearance"
                    className="admin-settings-tab-content"
                    ref={tabContentRef}
                    onTouchStart={handleContentTouchStart}
                    onTouchMove={handleContentTouchMove}
                    onTouchEnd={handleContentTouchEnd}
                >
                    <Card className="admin-settings-card">
                        <CardHeader>
                            <CardTitle className="admin-settings-card-title">
                                <Palette size={20} style={{ marginRight: '0.5rem' }} aria-hidden="true" />
                                Appearance & Branding
                            </CardTitle>
                            <CardDescription>
                                Customize the visual appearance, colors, fonts, and layout of your site.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="admin-form">
                                {/* Theme Colors Section */}
                                <div className="admin-settings-section-divider">
                                    <h3 className="admin-settings-section-title">
                                        <Palette size={18} style={{ marginRight: '0.5rem' }} aria-hidden="true" />
                                        Theme Colors
                                    </h3>
                                </div>

                                {/* Color Picker Grid */}
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', marginBottom: '1rem' }}>
                                    {/* Primary Color */}
                                    <div className={`admin-form-group admin-form-group-important ${settings.themePrimaryColor !== originalSettings.themePrimaryColor ? 'has-changes' : ''}`} style={{ flex: '0 0 auto', minWidth: '120px' }}>
                                        <Label htmlFor="theme-primary-color-input" className="admin-form-label-with-icon">
                                            <Palette size={16} className="admin-form-label-icon" aria-hidden="true" />
                                            Primary Color
                                            <span className="admin-setting-importance-badge admin-setting-importance-important">Important</span>
                                            <div className="admin-tooltip-wrapper">
                                                <HelpCircle size={14} className="admin-tooltip-icon" aria-hidden="true" />
                                                <span className="admin-tooltip-text" role="tooltip">
                                                    Main brand color used for buttons, links, and primary actions
                                                </span>
                                            </div>
                                        </Label>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: 'fit-content' }}>
                                            <Input
                                                id="theme-primary-color-input"
                                                type="color"
                                                value={settings.themePrimaryColor}
                                                onChange={(e) => setSettings(prev => ({ ...prev, themePrimaryColor: e.target.value }))}
                                                style={{ width: '60px', height: '40px', padding: '2px', cursor: 'pointer' }}
                                                aria-describedby="theme-primary-color-help"
                                            />
                                            <Input
                                                type="text"
                                                value={settings.themePrimaryColor}
                                                onChange={(e) => setSettings(prev => ({ ...prev, themePrimaryColor: e.target.value }))}
                                                placeholder="#7c3aed"
                                                style={{ width: '100px' }}
                                                aria-label="Primary color hex code"
                                            />
                                        </div>
                                        <p className="admin-form-help-text" id="theme-primary-color-help">
                                            Main brand color (hex format: #RRGGBB)
                                        </p>
                                        {settings.themePrimaryColor !== originalSettings.themePrimaryColor && (
                                            <p className="admin-change-indicator" aria-live="polite">
                                                <span className="admin-change-dot" aria-hidden="true"></span>
                                                Modified
                                            </p>
                                        )}
                                    </div>

                                    {/* Secondary Color */}
                                    <div className={`admin-form-group ${settings.themeSecondaryColor !== originalSettings.themeSecondaryColor ? 'has-changes' : ''}`} style={{ flex: '0 0 auto', minWidth: '120px' }}>
                                        <Label htmlFor="theme-secondary-color-input" className="admin-form-label-with-icon">
                                            <Palette size={16} className="admin-form-label-icon" aria-hidden="true" />
                                            Secondary Color
                                            <div className="admin-tooltip-wrapper">
                                                <HelpCircle size={14} className="admin-tooltip-icon" aria-hidden="true" />
                                                <span className="admin-tooltip-text" role="tooltip">
                                                    Secondary brand color for accents and highlights
                                                </span>
                                            </div>
                                        </Label>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: 'fit-content' }}>
                                            <Input
                                                id="theme-secondary-color-input"
                                                type="color"
                                                value={settings.themeSecondaryColor}
                                                onChange={(e) => setSettings(prev => ({ ...prev, themeSecondaryColor: e.target.value }))}
                                                style={{ width: '60px', height: '40px', padding: '2px', cursor: 'pointer' }}
                                                aria-describedby="theme-secondary-color-help"
                                            />
                                            <Input
                                                type="text"
                                                value={settings.themeSecondaryColor}
                                                onChange={(e) => setSettings(prev => ({ ...prev, themeSecondaryColor: e.target.value }))}
                                                placeholder="#a78bfa"
                                                style={{ width: '100px' }}
                                                aria-label="Secondary color hex code"
                                            />
                                        </div>
                                        <p className="admin-form-help-text" id="theme-secondary-color-help">
                                            Secondary brand color (hex format: #RRGGBB)
                                        </p>
                                        {settings.themeSecondaryColor !== originalSettings.themeSecondaryColor && (
                                            <p className="admin-change-indicator" aria-live="polite">
                                                <span className="admin-change-dot" aria-hidden="true"></span>
                                                Modified
                                            </p>
                                        )}
                                    </div>

                                    {/* Accent Color */}
                                    <div className={`admin-form-group ${settings.themeAccentColor !== originalSettings.themeAccentColor ? 'has-changes' : ''}`} style={{ flex: '0 0 auto', minWidth: '120px' }}>
                                        <Label htmlFor="theme-accent-color-input" className="admin-form-label-with-icon">
                                            <Palette size={16} className="admin-form-label-icon" aria-hidden="true" />
                                            Accent Color
                                            <div className="admin-tooltip-wrapper">
                                                <HelpCircle size={14} className="admin-tooltip-icon" aria-hidden="true" />
                                                <span className="admin-tooltip-text" role="tooltip">
                                                    Accent color for special highlights and call-to-action elements
                                                </span>
                                            </div>
                                        </Label>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: 'fit-content' }}>
                                            <Input
                                                id="theme-accent-color-input"
                                                type="color"
                                                value={settings.themeAccentColor}
                                                onChange={(e) => setSettings(prev => ({ ...prev, themeAccentColor: e.target.value }))}
                                                style={{ width: '60px', height: '40px', padding: '2px', cursor: 'pointer' }}
                                                aria-describedby="theme-accent-color-help"
                                            />
                                            <Input
                                                type="text"
                                                value={settings.themeAccentColor}
                                                onChange={(e) => setSettings(prev => ({ ...prev, themeAccentColor: e.target.value }))}
                                                placeholder="#67e8f9"
                                                style={{ width: '100px' }}
                                                aria-label="Accent color hex code"
                                            />
                                        </div>
                                        <p className="admin-form-help-text" id="theme-accent-color-help">
                                            Accent color (hex format: #RRGGBB)
                                        </p>
                                        {settings.themeAccentColor !== originalSettings.themeAccentColor && (
                                            <p className="admin-change-indicator" aria-live="polite">
                                                <span className="admin-change-dot" aria-hidden="true"></span>
                                                Modified
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Extended Color Palette */}
                                <div className="admin-settings-section-divider" style={{ marginTop: '2rem' }}>
                                    <h3 className="admin-settings-section-title">
                                        <Palette size={18} style={{ marginRight: '0.5rem' }} aria-hidden="true" />
                                        Status Colors
                                    </h3>
                                </div>

                                {/* Status Colors Grid */}
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', marginBottom: '1rem' }}>
                                    {/* Success Color */}
                                    <div className={`admin-form-group ${settings.themeSuccessColor !== originalSettings.themeSuccessColor ? 'has-changes' : ''}`} style={{ flex: '0 0 auto', minWidth: '120px' }}>
                                        <Label htmlFor="theme-success-color-input" className="admin-form-label-with-icon">
                                            <CheckCircle size={16} className="admin-form-label-icon" aria-hidden="true" />
                                            Success Color
                                            <div className="admin-tooltip-wrapper">
                                                <HelpCircle size={14} className="admin-tooltip-icon" aria-hidden="true" />
                                                <span className="admin-tooltip-text" role="tooltip">
                                                    Color for success messages and positive actions
                                                </span>
                                            </div>
                                        </Label>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: 'fit-content' }}>
                                            <Input
                                                id="theme-success-color-input"
                                                type="color"
                                                value={settings.themeSuccessColor}
                                                onChange={(e) => setSettings(prev => ({ ...prev, themeSuccessColor: e.target.value }))}
                                                style={{ width: '60px', height: '40px', padding: '2px', cursor: 'pointer' }}
                                            />
                                            <Input
                                                type="text"
                                                value={settings.themeSuccessColor}
                                                onChange={(e) => setSettings(prev => ({ ...prev, themeSuccessColor: e.target.value }))}
                                                placeholder="#10b981"
                                                style={{ width: '100px' }}
                                            />
                                        </div>
                                        {settings.themeSuccessColor !== originalSettings.themeSuccessColor && (
                                            <p className="admin-change-indicator" aria-live="polite">
                                                <span className="admin-change-dot" aria-hidden="true"></span>
                                                Modified
                                            </p>
                                        )}
                                    </div>

                                    {/* Warning Color */}
                                    <div className={`admin-form-group ${settings.themeWarningColor !== originalSettings.themeWarningColor ? 'has-changes' : ''}`} style={{ flex: '0 0 auto', minWidth: '120px' }}>
                                        <Label htmlFor="theme-warning-color-input" className="admin-form-label-with-icon">
                                            <AlertTriangle size={16} className="admin-form-label-icon" aria-hidden="true" />
                                            Warning Color
                                            <div className="admin-tooltip-wrapper">
                                                <HelpCircle size={14} className="admin-tooltip-icon" aria-hidden="true" />
                                                <span className="admin-tooltip-text" role="tooltip">
                                                    Color for warning messages and caution indicators
                                                </span>
                                            </div>
                                        </Label>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: 'fit-content' }}>
                                            <Input
                                                id="theme-warning-color-input"
                                                type="color"
                                                value={settings.themeWarningColor}
                                                onChange={(e) => setSettings(prev => ({ ...prev, themeWarningColor: e.target.value }))}
                                                style={{ width: '60px', height: '40px', padding: '2px', cursor: 'pointer' }}
                                            />
                                            <Input
                                                type="text"
                                                value={settings.themeWarningColor}
                                                onChange={(e) => setSettings(prev => ({ ...prev, themeWarningColor: e.target.value }))}
                                                placeholder="#f59e0b"
                                                style={{ width: '100px' }}
                                            />
                                        </div>
                                        {settings.themeWarningColor !== originalSettings.themeWarningColor && (
                                            <p className="admin-change-indicator" aria-live="polite">
                                                <span className="admin-change-dot" aria-hidden="true"></span>
                                                Modified
                                            </p>
                                        )}
                                    </div>

                                    {/* Error Color */}
                                    <div className={`admin-form-group ${settings.themeErrorColor !== originalSettings.themeErrorColor ? 'has-changes' : ''}`} style={{ flex: '0 0 auto', minWidth: '120px' }}>
                                        <Label htmlFor="theme-error-color-input" className="admin-form-label-with-icon">
                                            <XCircle size={16} className="admin-form-label-icon" aria-hidden="true" />
                                            Error Color
                                            <div className="admin-tooltip-wrapper">
                                                <HelpCircle size={14} className="admin-tooltip-icon" aria-hidden="true" />
                                                <span className="admin-tooltip-text" role="tooltip">
                                                    Color for error messages and destructive actions
                                                </span>
                                            </div>
                                        </Label>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: 'fit-content' }}>
                                            <Input
                                                id="theme-error-color-input"
                                                type="color"
                                                value={settings.themeErrorColor}
                                                onChange={(e) => setSettings(prev => ({ ...prev, themeErrorColor: e.target.value }))}
                                                style={{ width: '60px', height: '40px', padding: '2px', cursor: 'pointer' }}
                                            />
                                            <Input
                                                type="text"
                                                value={settings.themeErrorColor}
                                                onChange={(e) => setSettings(prev => ({ ...prev, themeErrorColor: e.target.value }))}
                                                placeholder="#ef4444"
                                                style={{ width: '100px' }}
                                            />
                                        </div>
                                        {settings.themeErrorColor !== originalSettings.themeErrorColor && (
                                            <p className="admin-change-indicator" aria-live="polite">
                                                <span className="admin-change-dot" aria-hidden="true"></span>
                                                Modified
                                            </p>
                                        )}
                                    </div>

                                    {/* Info Color */}
                                    <div className={`admin-form-group ${settings.themeInfoColor !== originalSettings.themeInfoColor ? 'has-changes' : ''}`} style={{ flex: '0 0 auto', minWidth: '120px' }}>
                                        <Label htmlFor="theme-info-color-input" className="admin-form-label-with-icon">
                                            <Info size={16} className="admin-form-label-icon" aria-hidden="true" />
                                            Info Color
                                            <div className="admin-tooltip-wrapper">
                                                <HelpCircle size={14} className="admin-tooltip-icon" aria-hidden="true" />
                                                <span className="admin-tooltip-text" role="tooltip">
                                                    Color for informational messages and neutral actions
                                                </span>
                                            </div>
                                        </Label>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: 'fit-content' }}>
                                            <Input
                                                id="theme-info-color-input"
                                                type="color"
                                                value={settings.themeInfoColor}
                                                onChange={(e) => setSettings(prev => ({ ...prev, themeInfoColor: e.target.value }))}
                                                style={{ width: '60px', height: '40px', padding: '2px', cursor: 'pointer' }}
                                            />
                                            <Input
                                                type="text"
                                                value={settings.themeInfoColor}
                                                onChange={(e) => setSettings(prev => ({ ...prev, themeInfoColor: e.target.value }))}
                                                placeholder="#3b82f6"
                                                style={{ width: '100px' }}
                                            />
                                        </div>
                                        {settings.themeInfoColor !== originalSettings.themeInfoColor && (
                                            <p className="admin-change-indicator" aria-live="polite">
                                                <span className="admin-change-dot" aria-hidden="true"></span>
                                                Modified
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Design Tokens Section */}
                                <div className="admin-settings-section-divider" style={{ marginTop: '2rem' }}>
                                    <h3 className="admin-settings-section-title">
                                        <Settings size={18} style={{ marginRight: '0.5rem' }} aria-hidden="true" />
                                        Design Tokens
                                    </h3>
                                </div>

                                {/* Border Radius */}
                                <div className={`admin-form-group ${settings.borderRadius !== originalSettings.borderRadius ? 'has-changes' : ''}`}>
                                    <Label htmlFor="border-radius-input" className="admin-form-label-with-icon">
                                        <Settings size={16} className="admin-form-label-icon" aria-hidden="true" />
                                        Border Radius
                                        <div className="admin-tooltip-wrapper">
                                            <HelpCircle size={14} className="admin-tooltip-icon" aria-hidden="true" />
                                            <span className="admin-tooltip-text" role="tooltip">
                                                Global border radius for buttons, cards, and other components (e.g., 0.5rem, 1rem, 1.5rem)
                                            </span>
                                        </div>
                                    </Label>
                                    <Input
                                        id="border-radius-input"
                                        type="text"
                                        value={settings.borderRadius}
                                        onChange={(e) => setSettings(prev => ({ ...prev, borderRadius: e.target.value }))}
                                        placeholder="1rem"
                                        aria-describedby="border-radius-help"
                                    />
                                    <p className="admin-form-help-text" id="border-radius-help">
                                        Current border radius: {settings.borderRadius} (e.g., 0.5rem, 1rem, 1.5rem, 2rem)
                                    </p>
                                    {settings.borderRadius !== originalSettings.borderRadius && (
                                        <p className="admin-change-indicator" aria-live="polite">
                                            <span className="admin-change-dot" aria-hidden="true"></span>
                                            Modified
                                        </p>
                                    )}
                                </div>

                                {/* Animations */}
                                <div className={`admin-form-group ${settings.animationsEnabled !== originalSettings.animationsEnabled ? 'has-changes' : ''}`}>
                                    <Label className="admin-form-label-with-icon" htmlFor="animations-enabled-toggle">
                                        <Settings size={16} className="admin-form-label-icon" aria-hidden="true" />
                                        Enable Animations
                                        <div className="admin-tooltip-wrapper">
                                            <HelpCircle size={14} className="admin-tooltip-icon" aria-hidden="true" />
                                            <span className="admin-tooltip-text" role="tooltip">
                                                Enable or disable animations and transitions across the site
                                            </span>
                                        </div>
                                    </Label>
                                    <label className="admin-toggle-switch-label" htmlFor="animations-enabled-toggle">
                                        <input
                                            id="animations-enabled-toggle"
                                            type="checkbox"
                                            checked={settings.animationsEnabled}
                                            onChange={(e) => setSettings(prev => ({ ...prev, animationsEnabled: e.target.checked }))}
                                            className="admin-toggle-input"
                                        />
                                        <span className="admin-toggle-slider"></span>
                                    </label>
                                    <p className="admin-form-help-text">
                                        {settings.animationsEnabled ? 'Animations are enabled' : 'Animations are disabled'}
                                    </p>
                                    {settings.animationsEnabled !== originalSettings.animationsEnabled && (
                                        <p className="admin-change-indicator" aria-live="polite">
                                            <span className="admin-change-dot" aria-hidden="true"></span>
                                            Modified
                                        </p>
                                    )}
                                </div>

                                {/* Animation Speed */}
                                {settings.animationsEnabled && (
                                    <div className={`admin-form-group ${settings.animationSpeed !== originalSettings.animationSpeed ? 'has-changes' : ''}`}>
                                        <Label htmlFor="animation-speed-select" className="admin-form-label-with-icon">
                                            <Settings size={16} className="admin-form-label-icon" aria-hidden="true" />
                                            Animation Speed
                                            <div className="admin-tooltip-wrapper">
                                                <HelpCircle size={14} className="admin-tooltip-icon" aria-hidden="true" />
                                                <span className="admin-tooltip-text" role="tooltip">
                                                    Control the speed of animations and transitions
                                                </span>
                                            </div>
                                        </Label>
                                        <select
                                            id="animation-speed-select"
                                            value={settings.animationSpeed}
                                            onChange={(e) => setSettings(prev => ({ ...prev, animationSpeed: e.target.value }))}
                                            className="admin-select"
                                        >
                                            <option value="fast">Fast</option>
                                            <option value="normal">Normal</option>
                                            <option value="slow">Slow</option>
                                        </select>
                                        <p className="admin-form-help-text">
                                            Animation speed: {settings.animationSpeed}
                                        </p>
                                        {settings.animationSpeed !== originalSettings.animationSpeed && (
                                            <p className="admin-change-indicator" aria-live="polite">
                                                <span className="admin-change-dot" aria-hidden="true"></span>
                                                Modified
                                            </p>
                                        )}
                                    </div>
                                )}

                                {/* Component Styles Section */}
                                <div className="admin-settings-section-divider" style={{ marginTop: '2rem' }}>
                                    <h3 className="admin-settings-section-title">
                                        <Layout size={18} style={{ marginRight: '0.5rem' }} aria-hidden="true" />
                                        Component Styles
                                    </h3>
                                </div>

                                {/* Button Style */}
                                <div className={`admin-form-group ${settings.buttonStyle !== originalSettings.buttonStyle ? 'has-changes' : ''}`}>
                                    <Label htmlFor="button-style-select" className="admin-form-label-with-icon">
                                        <Settings size={16} className="admin-form-label-icon" aria-hidden="true" />
                                        Button Style
                                        <div className="admin-tooltip-wrapper">
                                            <HelpCircle size={14} className="admin-tooltip-icon" aria-hidden="true" />
                                            <span className="admin-tooltip-text" role="tooltip">
                                                Default style for buttons across the site
                                            </span>
                                        </div>
                                    </Label>
                                    <select
                                        id="button-style-select"
                                        value={settings.buttonStyle}
                                        onChange={(e) => setSettings(prev => ({ ...prev, buttonStyle: e.target.value }))}
                                        className="admin-select"
                                    >
                                        <option value="rounded">Rounded</option>
                                        <option value="square">Square</option>
                                        <option value="pill">Pill</option>
                                    </select>
                                    <p className="admin-form-help-text">
                                        Button style: {settings.buttonStyle === 'rounded' ? 'Rounded corners' : settings.buttonStyle === 'pill' ? 'Fully rounded (pill)' : 'Sharp corners'}
                                    </p>
                                    {settings.buttonStyle !== originalSettings.buttonStyle && (
                                        <p className="admin-change-indicator" aria-live="polite">
                                            <span className="admin-change-dot" aria-hidden="true"></span>
                                            Modified
                                        </p>
                                    )}
                                </div>

                                {/* Card Style */}
                                <div className={`admin-form-group ${settings.cardStyle !== originalSettings.cardStyle ? 'has-changes' : ''}`}>
                                    <Label htmlFor="card-style-select" className="admin-form-label-with-icon">
                                        <Settings size={16} className="admin-form-label-icon" aria-hidden="true" />
                                        Card Style
                                        <div className="admin-tooltip-wrapper">
                                            <HelpCircle size={14} className="admin-tooltip-icon" aria-hidden="true" />
                                            <span className="admin-tooltip-text" role="tooltip">
                                                Default style for cards and containers
                                            </span>
                                        </div>
                                    </Label>
                                    <select
                                        id="card-style-select"
                                        value={settings.cardStyle}
                                        onChange={(e) => setSettings(prev => ({ ...prev, cardStyle: e.target.value }))}
                                        className="admin-select"
                                    >
                                        <option value="flat">Flat</option>
                                        <option value="elevated">Elevated</option>
                                        <option value="outlined">Outlined</option>
                                    </select>
                                    <p className="admin-form-help-text">
                                        Card style: {settings.cardStyle === 'flat' ? 'No shadow' : settings.cardStyle === 'elevated' ? 'With shadow' : 'With border'}
                                    </p>
                                    {settings.cardStyle !== originalSettings.cardStyle && (
                                        <p className="admin-change-indicator" aria-live="polite">
                                            <span className="admin-change-dot" aria-hidden="true"></span>
                                            Modified
                                        </p>
                                    )}
                                </div>

                                {/* Dark Mode Section */}
                                <div className="admin-settings-section-divider" style={{ marginTop: '2rem' }}>
                                    <h3 className="admin-settings-section-title">
                                        <Monitor size={18} style={{ marginRight: '0.5rem' }} aria-hidden="true" />
                                        Dark Mode
                                    </h3>
                                </div>

                                {/* Dark Mode Enabled */}
                                <div className={`admin-form-group admin-form-group-important ${settings.darkModeEnabled !== originalSettings.darkModeEnabled ? 'has-changes' : ''}`}>
                                    <Label className="admin-form-label-with-icon" htmlFor="dark-mode-enabled-toggle">
                                        <Monitor size={16} className="admin-form-label-icon" aria-hidden="true" />
                                        Enable Dark Mode
                                        <span className="admin-setting-importance-badge admin-setting-importance-important">Important</span>
                                        <div className="admin-tooltip-wrapper">
                                            <HelpCircle size={14} className="admin-tooltip-icon" aria-hidden="true" />
                                            <span className="admin-tooltip-text" role="tooltip">
                                                Allow users to switch between light and dark themes
                                            </span>
                                        </div>
                                    </Label>
                                    <label className="admin-toggle-switch-label" htmlFor="dark-mode-enabled-toggle">
                                        <input
                                            id="dark-mode-enabled-toggle"
                                            type="checkbox"
                                            checked={settings.darkModeEnabled}
                                            onChange={(e) => setSettings(prev => ({ ...prev, darkModeEnabled: e.target.checked }))}
                                            className="admin-toggle-input"
                                            aria-describedby="dark-mode-enabled-help"
                                        />
                                        <span className="admin-toggle-slider"></span>
                                    </label>
                                    <p className="admin-form-help-text" id="dark-mode-enabled-help">
                                        {settings.darkModeEnabled ? 'Dark mode is available to users' : 'Dark mode is disabled'}
                                    </p>
                                    {settings.darkModeEnabled !== originalSettings.darkModeEnabled && (
                                        <p className="admin-change-indicator" aria-live="polite">
                                            <span className="admin-change-dot" aria-hidden="true"></span>
                                            Modified
                                        </p>
                                    )}
                                </div>

                                {/* Dark Mode Default */}
                                {settings.darkModeEnabled && (
                                    <div className={`admin-form-group ${settings.darkModeDefault !== originalSettings.darkModeDefault ? 'has-changes' : ''}`}>
                                        <Label htmlFor="dark-mode-default-select" className="admin-form-label-with-icon">
                                            <Monitor size={16} className="admin-form-label-icon" aria-hidden="true" />
                                            Default Theme
                                            <div className="admin-tooltip-wrapper">
                                                <HelpCircle size={14} className="admin-tooltip-icon" aria-hidden="true" />
                                                <span className="admin-tooltip-text" role="tooltip">
                                                    Default theme for new users (auto uses system preference)
                                                </span>
                                            </div>
                                        </Label>
                                        <select
                                            id="dark-mode-default-select"
                                            value={settings.darkModeDefault}
                                            onChange={(e) => setSettings(prev => ({ ...prev, darkModeDefault: e.target.value }))}
                                            className="admin-select"
                                            aria-describedby="dark-mode-default-help"
                                        >
                                            <option value="auto">Auto (System Preference)</option>
                                            <option value="light">Light</option>
                                            <option value="dark">Dark</option>
                                        </select>
                                        <p className="admin-form-help-text" id="dark-mode-default-help">
                                            Default theme: {settings.darkModeDefault === 'auto' ? 'Follows system preference' : settings.darkModeDefault === 'dark' ? 'Dark mode' : 'Light mode'}
                                        </p>
                                        {settings.darkModeDefault !== originalSettings.darkModeDefault && (
                                            <p className="admin-change-indicator" aria-live="polite">
                                                <span className="admin-change-dot" aria-hidden="true"></span>
                                                Modified
                                            </p>
                                        )}
                                    </div>
                                )}

                                {/* Custom CSS Section */}
                                <div className="admin-settings-section-divider" style={{ marginTop: '2rem' }}>
                                    <h3 className="admin-settings-section-title">
                                        <FileText size={18} style={{ marginRight: '0.5rem' }} aria-hidden="true" />
                                        Custom CSS
                                    </h3>
                                </div>

                                {/* Custom CSS */}
                                <div className={`admin-form-group ${settings.customCSS !== originalSettings.customCSS ? 'has-changes' : ''}`}>
                                    <Label htmlFor="custom-css-textarea" className="admin-form-label-with-icon">
                                        <FileText size={16} className="admin-form-label-icon" aria-hidden="true" />
                                        Custom CSS Code
                                        <div className="admin-tooltip-wrapper">
                                            <HelpCircle size={14} className="admin-tooltip-icon" aria-hidden="true" />
                                            <span className="admin-tooltip-text" role="tooltip">
                                                Inject custom CSS to override default styles. Use with caution.
                                            </span>
                                        </div>
                                    </Label>
                                    <Textarea
                                        id="custom-css-textarea"
                                        value={settings.customCSS}
                                        onChange={(e) => setSettings(prev => ({ ...prev, customCSS: e.target.value }))}
                                        placeholder="/* Your custom CSS here */"
                                        rows={8}
                                        className="admin-textarea"
                                        style={{ fontFamily: 'monospace', fontSize: '13px' }}
                                        aria-describedby="custom-css-help"
                                    />
                                    <p className="admin-form-help-text" id="custom-css-help">
                                        Custom CSS will be injected into all pages. Use with caution.
                                    </p>
                                    {settings.customCSS !== originalSettings.customCSS && (
                                        <p className="admin-change-indicator" aria-live="polite">
                                            <span className="admin-change-dot" aria-hidden="true"></span>
                                            Modified
                                        </p>
                                    )}
                                </div>

                                {/* Font Settings Section */}
                                <div className="admin-settings-section-divider" style={{ marginTop: '2rem' }}>
                                    <h3 className="admin-settings-section-title">
                                        <Type size={18} style={{ marginRight: '0.5rem' }} aria-hidden="true" />
                                        Font Settings
                                    </h3>
                                </div>

                                {/* Font Family */}
                                <div className={`admin-form-group ${settings.fontFamily !== originalSettings.fontFamily ? 'has-changes' : ''}`}>
                                    <Label htmlFor="font-family-select" className="admin-form-label-with-icon">
                                        <Type size={16} className="admin-form-label-icon" aria-hidden="true" />
                                        Font Family
                                        <div className="admin-tooltip-wrapper">
                                            <HelpCircle size={14} className="admin-tooltip-icon" aria-hidden="true" />
                                            <span className="admin-tooltip-text" role="tooltip">
                                                Choose the default font family for the site
                                            </span>
                                        </div>
                                    </Label>
                                    <select
                                        id="font-family-select"
                                        value={settings.fontFamily}
                                        onChange={(e) => setSettings(prev => ({ ...prev, fontFamily: e.target.value }))}
                                        className="admin-select"
                                        aria-describedby="font-family-help"
                                    >
                                        <option value="Roboto">Roboto</option>
                                        <option value="Inter">Inter</option>
                                        <option value="Open Sans">Open Sans</option>
                                        <option value="Lato">Lato</option>
                                        <option value="Montserrat">Montserrat</option>
                                        <option value="Poppins">Poppins</option>
                                        <option value="System">System Default</option>
                                    </select>
                                    <p className="admin-form-help-text" id="font-family-help">
                                        Current font: {settings.fontFamily}
                                    </p>
                                    {settings.fontFamily !== originalSettings.fontFamily && (
                                        <p className="admin-change-indicator" aria-live="polite">
                                            <span className="admin-change-dot" aria-hidden="true"></span>
                                            Modified
                                        </p>
                                    )}
                                </div>

                                {/* Font Size */}
                                <div className={`admin-form-group ${settings.fontSize !== originalSettings.fontSize ? 'has-changes' : ''}`}>
                                    <Label htmlFor="font-size-input" className="admin-form-label-with-icon">
                                        <Type size={16} className="admin-form-label-icon" aria-hidden="true" />
                                        Base Font Size
                                        <div className="admin-tooltip-wrapper">
                                            <HelpCircle size={14} className="admin-tooltip-icon" aria-hidden="true" />
                                            <span className="admin-tooltip-text" role="tooltip">
                                                Base font size for the site (px, rem, or em)
                                            </span>
                                        </div>
                                    </Label>
                                    <Input
                                        id="font-size-input"
                                        type="text"
                                        value={settings.fontSize}
                                        onChange={(e) => setSettings(prev => ({ ...prev, fontSize: e.target.value }))}
                                        placeholder="16px"
                                        aria-describedby="font-size-help"
                                    />
                                    <p className="admin-form-help-text" id="font-size-help">
                                        Base font size: {settings.fontSize} (e.g., 16px, 1rem, 1em)
                                    </p>
                                    {settings.fontSize !== originalSettings.fontSize && (
                                        <p className="admin-change-indicator" aria-live="polite">
                                            <span className="admin-change-dot" aria-hidden="true"></span>
                                            Modified
                                        </p>
                                    )}
                                </div>

                                {/* Layout Options Section */}
                                <div className="admin-settings-section-divider" style={{ marginTop: '2rem' }}>
                                    <h3 className="admin-settings-section-title">
                                        <Layout size={18} style={{ marginRight: '0.5rem' }} aria-hidden="true" />
                                        Layout Options
                                    </h3>
                                </div>

                                {/* Default View Mode */}
                                <div className={`admin-form-group ${settings.defaultViewMode !== originalSettings.defaultViewMode ? 'has-changes' : ''}`}>
                                    <Label htmlFor="default-view-mode-select" className="admin-form-label-with-icon">
                                        <Layout size={16} className="admin-form-label-icon" aria-hidden="true" />
                                        Default View Mode
                                        <div className="admin-tooltip-wrapper">
                                            <HelpCircle size={14} className="admin-tooltip-icon" aria-hidden="true" />
                                            <span className="admin-tooltip-text" role="tooltip">
                                                Default view mode for image galleries and collections
                                            </span>
                                        </div>
                                    </Label>
                                    <select
                                        id="default-view-mode-select"
                                        value={settings.defaultViewMode}
                                        onChange={(e) => setSettings(prev => ({ ...prev, defaultViewMode: e.target.value }))}
                                        className="admin-select"
                                        aria-describedby="default-view-mode-help"
                                    >
                                        <option value="grid">Grid View</option>
                                        <option value="list">List View</option>
                                    </select>
                                    <p className="admin-form-help-text" id="default-view-mode-help">
                                        Default view: {settings.defaultViewMode === 'grid' ? 'Grid (masonry layout)' : 'List (vertical list)'}
                                    </p>
                                    {settings.defaultViewMode !== originalSettings.defaultViewMode && (
                                        <p className="admin-change-indicator" aria-live="polite">
                                            <span className="admin-change-dot" aria-hidden="true"></span>
                                            Modified
                                        </p>
                                    )}
                                </div>

                                {/* Homepage Layout */}
                                <div className={`admin-form-group ${settings.homepageLayout !== originalSettings.homepageLayout ? 'has-changes' : ''}`}>
                                    <Label htmlFor="homepage-layout-select" className="admin-form-label-with-icon">
                                        <Home size={16} className="admin-form-label-icon" aria-hidden="true" />
                                        Homepage Layout
                                        <div className="admin-tooltip-wrapper">
                                            <HelpCircle size={14} className="admin-tooltip-icon" aria-hidden="true" />
                                            <span className="admin-tooltip-text" role="tooltip">
                                                Choose the default layout style for the homepage
                                            </span>
                                        </div>
                                    </Label>
                                    <select
                                        id="homepage-layout-select"
                                        value={settings.homepageLayout}
                                        onChange={(e) => setSettings(prev => ({ ...prev, homepageLayout: e.target.value }))}
                                        className="admin-select"
                                        aria-describedby="homepage-layout-help"
                                    >
                                        <option value="default">Default</option>
                                        <option value="compact">Compact</option>
                                        <option value="spacious">Spacious</option>
                                        <option value="featured">Featured First</option>
                                    </select>
                                    <p className="admin-form-help-text" id="homepage-layout-help">
                                        Homepage layout: {settings.homepageLayout}
                                    </p>
                                    {settings.homepageLayout !== originalSettings.homepageLayout && (
                                        <p className="admin-change-indicator" aria-live="polite">
                                            <span className="admin-change-dot" aria-hidden="true"></span>
                                            Modified
                                        </p>
                                    )}
                                </div>

                                <div className="admin-modal-actions">
                                    <div className="admin-actions-status">
                                        {hasChanges && (
                                            <div className="admin-unsaved-changes-indicator">
                                                <AlertCircle size={16} />
                                                <span>You have unsaved changes</span>
                                            </div>
                                        )}
                                        {saveSuccess && (
                                            <div className={`admin-save-success-indicator ${isFadingOut ? 'fade-out' : ''}`}>
                                                <CheckCircle2 size={16} />
                                                <span>Settings saved successfully!</span>
                                            </div>
                                        )}
                                    </div>
                                    <Button
                                        onClick={handleSave}
                                        loading={saving}
                                        disabled={!hasChanges || Object.keys(validationErrors).length > 0}
                                        className="admin-add-category-btn"
                                        aria-label={saving ? 'Saving settings' : 'Save all settings'}
                                        aria-describedby="save-button-help"
                                    >
                                        {!saving && <Save size={16} aria-hidden="true" />}
                                        {saving ? t('admin.saving') : t('admin.saveSettings')}
                                    </Button>
                                    <span id="save-button-help" className="sr-only">
                                        {!hasChanges ? 'No changes to save' : Object.keys(validationErrors).length > 0 ? 'Please fix errors before saving' : 'Save all settings changes'}
                                    </span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* System Settings Tab */}
                <TabsContent
                    value="system"
                    className="admin-settings-tab-content"
                    ref={tabContentRef}
                    onTouchStart={handleContentTouchStart}
                    onTouchMove={handleContentTouchMove}
                    onTouchEnd={handleContentTouchEnd}
                >
                    <Card className="admin-settings-card">
                        <CardHeader>
                            <CardTitle className="admin-settings-card-title">
                                <Shield size={20} style={{ marginRight: '0.5rem' }} aria-hidden="true" />
                                System Settings
                            </CardTitle>
                            <CardDescription>
                                Configure system-wide settings and maintenance mode
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="admin-form">
                                <div className={`admin-form-group admin-form-group-critical ${settings.maintenanceMode !== originalSettings.maintenanceMode ? 'has-changes' : ''}`}>
                                    <Label className="admin-maintenance-toggle-label admin-form-label-with-icon" htmlFor="maintenance-mode-toggle">
                                        {settings.maintenanceMode ? (
                                            <Lock size={16} className="admin-form-label-icon" aria-hidden="true" />
                                        ) : (
                                            <Unlock size={16} className="admin-form-label-icon" aria-hidden="true" />
                                        )}
                                        <input
                                            id="maintenance-mode-toggle"
                                            type="checkbox"
                                            checked={settings.maintenanceMode}
                                            onChange={(e) => handleMaintenanceModeChange(e.target.checked)}
                                            className="admin-maintenance-checkbox"
                                            aria-describedby="maintenance-mode-help"
                                            aria-label="Enable maintenance mode"
                                        />
                                        <span>{t('admin.maintenanceMode')}</span>
                                        <span className="admin-setting-importance-badge admin-setting-importance-critical">Critical</span>
                                        {settings.maintenanceMode ? (
                                            <span className="admin-status-badge admin-status-badge-error" aria-label="Maintenance mode is active">
                                                <AlertTriangle size={14} aria-hidden="true" />
                                                Active - Site Locked
                                            </span>
                                        ) : (
                                            <span className="admin-status-badge admin-status-badge-success" aria-label="Maintenance mode is inactive">
                                                <CheckCircle size={14} aria-hidden="true" />
                                                Inactive - Site Online
                                            </span>
                                        )}
                                    </Label>
                                    <p className="admin-form-help-text" id="maintenance-mode-help">
                                        When enabled, the site will be unavailable to regular users. Only administrators can access.
                                    </p>
                                    {settings.maintenanceMode !== originalSettings.maintenanceMode && (
                                        <p className="admin-change-indicator">
                                            <span className="admin-change-dot"></span>
                                            Modified
                                        </p>
                                    )}
                                </div>

                                {/* Maintenance Mode Confirmation Dialog */}
                                {showMaintenanceConfirm && (
                                    <div className="admin-confirmation-dialog-overlay" onClick={() => setShowMaintenanceConfirm(false)}>
                                        <div className="admin-confirmation-dialog" onClick={(e) => e.stopPropagation()}>
                                            <div className="admin-confirmation-dialog-header">
                                                <AlertCircle size={24} className="admin-confirmation-icon" />
                                                <h3>Enable Maintenance Mode?</h3>
                                            </div>
                                            <div className="admin-confirmation-dialog-content">
                                                <p>Enabling maintenance mode will make the site unavailable to all regular users. Only administrators will be able to access the site.</p>
                                                <p><strong>Are you sure you want to continue?</strong></p>
                                            </div>
                                            <div className="admin-confirmation-dialog-actions">
                                                <Button
                                                    variant="outline"
                                                    onClick={() => setShowMaintenanceConfirm(false)}
                                                >
                                                    Cancel
                                                </Button>
                                                <Button
                                                    onClick={confirmMaintenanceMode}
                                                    className="admin-confirmation-button-danger"
                                                >
                                                    Enable Maintenance Mode
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="admin-modal-actions">
                                    <div className="admin-actions-status">
                                        {hasChanges && (
                                            <div className="admin-unsaved-changes-indicator">
                                                <AlertCircle size={16} />
                                                <span>You have unsaved changes</span>
                                            </div>
                                        )}
                                        {saveSuccess && (
                                            <div className={`admin-save-success-indicator ${isFadingOut ? 'fade-out' : ''}`}>
                                                <CheckCircle2 size={16} />
                                                <span>Settings saved successfully!</span>
                                            </div>
                                        )}
                                    </div>
                                    <Button
                                        onClick={handleSave}
                                        disabled={saving || !hasChanges || Object.keys(validationErrors).length > 0}
                                        className="admin-add-category-btn"
                                        aria-label={saving ? 'Saving settings' : 'Save all settings'}
                                        aria-describedby="save-button-help"
                                    >
                                        <Save size={16} aria-hidden="true" />
                                        {saving ? t('admin.saving') : t('admin.saveSettings')}
                                    </Button>
                                    <span id="save-button-help" className="sr-only">
                                        {!hasChanges ? 'No changes to save' : Object.keys(validationErrors).length > 0 ? 'Please fix errors before saving' : 'Save all settings changes'}
                                    </span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Security Settings Tab */}
                <TabsContent
                    value="security"
                    className="admin-settings-tab-content"
                    ref={tabContentRef}
                    onTouchStart={handleContentTouchStart}
                    onTouchMove={handleContentTouchMove}
                    onTouchEnd={handleContentTouchEnd}
                >
                    <Card className="admin-settings-card">
                        <CardHeader>
                            <CardTitle className="admin-settings-card-title">
                                <Lock size={20} style={{ marginRight: '0.5rem' }} aria-hidden="true" />
                                Security Settings
                            </CardTitle>
                            <CardDescription>
                                Configure password policies, session management, and security settings
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="admin-form">
                                {/* Password Policy Section */}
                                <div className="admin-settings-section-divider">
                                    <h3 className="admin-settings-section-title">
                                        <Shield size={18} style={{ marginRight: '0.5rem' }} aria-hidden="true" />
                                        Password Policy
                                    </h3>
                                </div>

                                {/* Password Minimum Length */}
                                <div className={`admin-form-group admin-form-group-critical ${settings.passwordMinLength !== originalSettings.passwordMinLength ? 'has-changes' : ''}`}>
                                    <Label htmlFor="password-min-length-input" className="admin-form-label-with-icon">
                                        <Lock size={16} className="admin-form-label-icon" aria-hidden="true" />
                                        Minimum Length
                                        <span className="admin-setting-importance-badge admin-setting-importance-critical">Critical</span>
                                        <div className="admin-tooltip-wrapper">
                                            <HelpCircle size={14} className="admin-tooltip-icon" aria-hidden="true" />
                                            <span className="admin-tooltip-text" role="tooltip">
                                                Minimum number of characters required for passwords
                                            </span>
                                        </div>
                                    </Label>
                                    <Input
                                        id="password-min-length-input"
                                        type="number"
                                        value={settings.passwordMinLength}
                                        onChange={(e) => setSettings(prev => ({ ...prev, passwordMinLength: parseInt(e.target.value) || 6 }))}
                                        min="6"
                                        max="20"
                                        className={validationErrors.passwordMinLength ? 'input-error' : ''}
                                        aria-describedby={validationErrors.passwordMinLength ? 'password-min-length-error' : 'password-min-length-help'}
                                        aria-invalid={validationErrors.passwordMinLength ? 'true' : 'false'}
                                    />
                                    {validationErrors.passwordMinLength && (
                                        <p className="admin-validation-error" id="password-min-length-error" role="alert" aria-live="polite">
                                            <AlertCircle size={14} aria-hidden="true" />
                                            {validationErrors.passwordMinLength}
                                        </p>
                                    )}
                                    <p id="password-min-length-help" className="admin-form-help-text">
                                        Passwords must be at least {settings.passwordMinLength} characters long
                                    </p>
                                    {settings.passwordMinLength !== originalSettings.passwordMinLength && (
                                        <p className="admin-change-indicator" aria-live="polite">
                                            <span className="admin-change-dot" aria-hidden="true"></span>
                                            Modified
                                        </p>
                                    )}
                                </div>

                                {/* Password Complexity Requirements */}
                                <div className={`admin-form-group admin-form-group-important ${passwordComplexityChanged ? 'has-changes' : ''}`}>
                                    <Label className="admin-form-label-with-icon">
                                        <Shield size={16} className="admin-form-label-icon" aria-hidden="true" />
                                        Complexity Requirements
                                        <span className="admin-setting-importance-badge admin-setting-importance-important">Important</span>
                                        <div className="admin-tooltip-wrapper">
                                            <HelpCircle size={14} className="admin-tooltip-icon" aria-hidden="true" />
                                            <span className="admin-tooltip-text" role="tooltip">
                                                Configure which character types are required in passwords
                                            </span>
                                        </div>
                                    </Label>
                                    <div className="admin-checkbox-group">
                                        <label className="admin-checkbox-label">
                                            <input
                                                type="checkbox"
                                                checked={settings.passwordRequireUppercase}
                                                onChange={(e) => setSettings(prev => ({ ...prev, passwordRequireUppercase: e.target.checked }))}
                                                className="admin-checkbox"
                                            />
                                            <span>Require Uppercase (A-Z)</span>
                                        </label>
                                        <label className="admin-checkbox-label">
                                            <input
                                                type="checkbox"
                                                checked={settings.passwordRequireLowercase}
                                                onChange={(e) => setSettings(prev => ({ ...prev, passwordRequireLowercase: e.target.checked }))}
                                                className="admin-checkbox"
                                            />
                                            <span>Require Lowercase (a-z)</span>
                                        </label>
                                        <label className="admin-checkbox-label">
                                            <input
                                                type="checkbox"
                                                checked={settings.passwordRequireNumber}
                                                onChange={(e) => setSettings(prev => ({ ...prev, passwordRequireNumber: e.target.checked }))}
                                                className="admin-checkbox"
                                            />
                                            <span>Require Number (0-9)</span>
                                        </label>
                                        <label className="admin-checkbox-label">
                                            <input
                                                type="checkbox"
                                                checked={settings.passwordRequireSpecialChar}
                                                onChange={(e) => setSettings(prev => ({ ...prev, passwordRequireSpecialChar: e.target.checked }))}
                                                className="admin-checkbox"
                                            />
                                            <span>Require Special Character (!@#$%^&*)</span>
                                        </label>
                                    </div>
                                    {passwordComplexityChanged && (
                                        <p className="admin-change-indicator" aria-live="polite">
                                            <span className="admin-change-dot" aria-hidden="true"></span>
                                            Modified
                                        </p>
                                    )}
                                </div>

                                {/* Password Expiration */}
                                <div className={`admin-form-group ${settings.passwordExpirationDays !== originalSettings.passwordExpirationDays ? 'has-changes' : ''}`}>
                                    <Label htmlFor="password-expiration-input" className="admin-form-label-with-icon">
                                        <Clock size={16} className="admin-form-label-icon" aria-hidden="true" />
                                        Password Expiration (Days)
                                        <div className="admin-tooltip-wrapper">
                                            <HelpCircle size={14} className="admin-tooltip-icon" aria-hidden="true" />
                                            <span className="admin-tooltip-text" role="tooltip">
                                                Number of days until passwords expire. Set to 0 to disable expiration.
                                            </span>
                                        </div>
                                    </Label>
                                    <Input
                                        id="password-expiration-input"
                                        type="number"
                                        value={settings.passwordExpirationDays}
                                        onChange={(e) => setSettings(prev => ({ ...prev, passwordExpirationDays: parseInt(e.target.value) || 0 }))}
                                        min="0"
                                        max="365"
                                    />
                                    <p className="admin-form-help-text">
                                        {settings.passwordExpirationDays === 0
                                            ? 'Passwords never expire'
                                            : `Passwords expire after ${settings.passwordExpirationDays} days`}
                                    </p>
                                    {settings.passwordExpirationDays !== originalSettings.passwordExpirationDays && (
                                        <p className="admin-change-indicator" aria-live="polite">
                                            <span className="admin-change-dot" aria-hidden="true"></span>
                                            Modified
                                        </p>
                                    )}
                                </div>

                                {/* Session Management Section */}
                                <div className="admin-settings-section-divider" style={{ marginTop: '2rem' }}>
                                    <h3 className="admin-settings-section-title">
                                        <Clock size={18} style={{ marginRight: '0.5rem' }} aria-hidden="true" />
                                        Session Management
                                    </h3>
                                </div>

                                {/* Access Token Expiry */}
                                <div className={`admin-form-group admin-form-group-important ${settings.accessTokenExpiry !== originalSettings.accessTokenExpiry ? 'has-changes' : ''}`}>
                                    <Label htmlFor="access-token-expiry-select" className="admin-form-label-with-icon">
                                        <Lock size={16} className="admin-form-label-icon" aria-hidden="true" />
                                        Access Token Expiry
                                        <span className="admin-setting-importance-badge admin-setting-importance-important">Important</span>
                                        <div className="admin-tooltip-wrapper">
                                            <HelpCircle size={14} className="admin-tooltip-icon" aria-hidden="true" />
                                            <span className="admin-tooltip-text" role="tooltip">
                                                How long access tokens remain valid before requiring refresh
                                            </span>
                                        </div>
                                    </Label>
                                    <select
                                        id="access-token-expiry-select"
                                        value={settings.accessTokenExpiry}
                                        onChange={(e) => setSettings(prev => ({ ...prev, accessTokenExpiry: e.target.value }))}
                                        className="admin-select"
                                    >
                                        <option value="15m">15 minutes</option>
                                        <option value="30m">30 minutes</option>
                                        <option value="1h">1 hour</option>
                                        <option value="2h">2 hours</option>
                                        <option value="4h">4 hours</option>
                                        <option value="8h">8 hours</option>
                                        <option value="24h">24 hours</option>
                                    </select>
                                    <p className="admin-form-help-text">
                                        Current: {settings.accessTokenExpiry}
                                    </p>
                                    {settings.accessTokenExpiry !== originalSettings.accessTokenExpiry && (
                                        <p className="admin-change-indicator" aria-live="polite">
                                            <span className="admin-change-dot" aria-hidden="true"></span>
                                            Modified
                                        </p>
                                    )}
                                </div>

                                {/* Refresh Token Expiry */}
                                <div className={`admin-form-group admin-form-group-important ${settings.refreshTokenExpiry !== originalSettings.refreshTokenExpiry ? 'has-changes' : ''}`}>
                                    <Label htmlFor="refresh-token-expiry-input" className="admin-form-label-with-icon">
                                        <Clock size={16} className="admin-form-label-icon" aria-hidden="true" />
                                        Refresh Token Expiry (Days)
                                        <span className="admin-setting-importance-badge admin-setting-importance-important">Important</span>
                                        <div className="admin-tooltip-wrapper">
                                            <HelpCircle size={14} className="admin-tooltip-icon" aria-hidden="true" />
                                            <span className="admin-tooltip-text" role="tooltip">
                                                How long refresh tokens remain valid before users must log in again
                                            </span>
                                        </div>
                                    </Label>
                                    <Input
                                        id="refresh-token-expiry-input"
                                        type="number"
                                        value={settings.refreshTokenExpiry}
                                        onChange={(e) => setSettings(prev => ({ ...prev, refreshTokenExpiry: parseInt(e.target.value) || 7 }))}
                                        min="1"
                                        max="365"
                                    />
                                    <p className="admin-form-help-text">
                                        Users stay logged in for {settings.refreshTokenExpiry} days
                                    </p>
                                    {settings.refreshTokenExpiry !== originalSettings.refreshTokenExpiry && (
                                        <p className="admin-change-indicator" aria-live="polite">
                                            <span className="admin-change-dot" aria-hidden="true"></span>
                                            Modified
                                        </p>
                                    )}
                                </div>

                                {/* Max Concurrent Sessions */}
                                <div className={`admin-form-group ${settings.maxConcurrentSessions !== originalSettings.maxConcurrentSessions ? 'has-changes' : ''}`}>
                                    <Label htmlFor="max-concurrent-sessions-input" className="admin-form-label-with-icon">
                                        <Server size={16} className="admin-form-label-icon" aria-hidden="true" />
                                        Max Concurrent Sessions
                                        <div className="admin-tooltip-wrapper">
                                            <HelpCircle size={14} className="admin-tooltip-icon" aria-hidden="true" />
                                            <span className="admin-tooltip-text" role="tooltip">
                                                Maximum number of active sessions per user. Set to 0 for unlimited.
                                            </span>
                                        </div>
                                    </Label>
                                    <Input
                                        id="max-concurrent-sessions-input"
                                        type="number"
                                        value={settings.maxConcurrentSessions}
                                        onChange={(e) => setSettings(prev => ({ ...prev, maxConcurrentSessions: parseInt(e.target.value) || 0 }))}
                                        min="0"
                                        max="100"
                                    />
                                    <p className="admin-form-help-text">
                                        {settings.maxConcurrentSessions === 0
                                            ? 'Unlimited concurrent sessions allowed'
                                            : `Users can have up to ${settings.maxConcurrentSessions} active sessions`}
                                    </p>
                                    {settings.maxConcurrentSessions !== originalSettings.maxConcurrentSessions && (
                                        <p className="admin-change-indicator" aria-live="polite">
                                            <span className="admin-change-dot" aria-hidden="true"></span>
                                            Modified
                                        </p>
                                    )}
                                </div>

                                {/* Force Logout on Password Change */}
                                <div className={`admin-form-group ${settings.forceLogoutOnPasswordChange !== originalSettings.forceLogoutOnPasswordChange ? 'has-changes' : ''}`}>
                                    <Label className="admin-form-label-with-icon" htmlFor="force-logout-toggle">
                                        <Shield size={16} className="admin-form-label-icon" aria-hidden="true" />
                                        Force Logout on Password Change
                                        <div className="admin-tooltip-wrapper">
                                            <HelpCircle size={14} className="admin-tooltip-icon" aria-hidden="true" />
                                            <span className="admin-tooltip-text" role="tooltip">
                                                Automatically log out all user sessions when password is changed
                                            </span>
                                        </div>
                                    </Label>
                                    <label className="admin-toggle-switch">
                                        <input
                                            id="force-logout-toggle"
                                            type="checkbox"
                                            checked={settings.forceLogoutOnPasswordChange}
                                            onChange={(e) => setSettings(prev => ({ ...prev, forceLogoutOnPasswordChange: e.target.checked }))}
                                            className="admin-toggle-input"
                                        />
                                        <span className="admin-toggle-slider"></span>
                                    </label>
                                    <p className="admin-form-help-text">
                                        {settings.forceLogoutOnPasswordChange
                                            ? 'All sessions will be terminated when password is changed'
                                            : 'Users will remain logged in after password change'}
                                    </p>
                                    {settings.forceLogoutOnPasswordChange !== originalSettings.forceLogoutOnPasswordChange && (
                                        <p className="admin-change-indicator" aria-live="polite">
                                            <span className="admin-change-dot" aria-hidden="true"></span>
                                            Modified
                                        </p>
                                    )}
                                </div>

                                <div className="admin-modal-actions">
                                    <div className="admin-actions-status">
                                        {hasChanges && (
                                            <div className="admin-unsaved-changes-indicator">
                                                <AlertCircle size={16} />
                                                <span>You have unsaved changes</span>
                                            </div>
                                        )}
                                        {saveSuccess && (
                                            <div className={`admin-save-success-indicator ${isFadingOut ? 'fade-out' : ''}`}>
                                                <CheckCircle2 size={16} />
                                                <span>Settings saved successfully!</span>
                                            </div>
                                        )}
                                    </div>
                                    <Button
                                        onClick={handleSave}
                                        loading={saving}
                                        disabled={!hasChanges || Object.keys(validationErrors).length > 0}
                                        className="admin-add-category-btn"
                                        aria-label={saving ? 'Saving settings' : 'Save all settings'}
                                        aria-describedby="save-button-help"
                                    >
                                        {!saving && <Save size={16} aria-hidden="true" />}
                                        {saving ? t('admin.saving') : t('admin.saveSettings')}
                                    </Button>
                                    <span id="save-button-help" className="sr-only">
                                        {!hasChanges ? 'No changes to save' : Object.keys(validationErrors).length > 0 ? 'Please fix errors before saving' : 'Save all settings changes'}
                                    </span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Email & Notifications Tab */}
                <TabsContent
                    value="email"
                    className="admin-settings-tab-content"
                    ref={tabContentRef}
                    onTouchStart={handleContentTouchStart}
                    onTouchMove={handleContentTouchMove}
                    onTouchEnd={handleContentTouchEnd}
                >
                    <Card className="admin-settings-card">
                        <CardHeader>
                            <CardTitle className="admin-settings-card-title">
                                <Mail size={20} style={{ marginRight: '0.5rem' }} aria-hidden="true" />
                                Email & Notifications
                            </CardTitle>
                            <CardDescription>
                                Configure email server settings, templates, and notification preferences
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="admin-form">
                                {/* SMTP Settings */}
                                <div className="admin-settings-section-divider">
                                    <h3 className="admin-settings-section-title">
                                        <Server size={18} style={{ marginRight: '0.5rem' }} aria-hidden="true" />
                                        SMTP Settings
                                    </h3>
                                </div>

                                <div className={`admin-form-group ${settings.smtpEnabled !== originalSettings.smtpEnabled ? 'has-changes' : ''}`}>
                                    <Label className="admin-maintenance-toggle-label" htmlFor="smtp-enabled-toggle">
                                        <input
                                            id="smtp-enabled-toggle"
                                            type="checkbox"
                                            checked={settings.smtpEnabled}
                                            onChange={(e) => setSettings(prev => ({ ...prev, smtpEnabled: e.target.checked }))}
                                            className="admin-maintenance-checkbox"
                                        />
                                        <span>Enable SMTP</span>
                                        <div className="admin-tooltip-wrapper">
                                            <HelpCircle size={14} className="admin-tooltip-icon" aria-hidden="true" />
                                            <span className="admin-tooltip-text" role="tooltip">
                                                Enable SMTP to send emails from your server
                                            </span>
                                        </div>
                                    </Label>
                                </div>

                                {settings.smtpEnabled && (
                                    <>
                                        <div className={`admin-form-group ${validationErrors.smtpHost ? 'has-error' : ''} ${settings.smtpHost !== originalSettings.smtpHost ? 'has-changes' : ''}`}>
                                            <Label htmlFor="smtp-host-input" className="admin-form-label-with-icon">
                                                <Server size={16} className="admin-form-label-icon" aria-hidden="true" />
                                                SMTP Host
                                                <span className="admin-required-indicator" aria-label="required">*</span>
                                            </Label>
                                            <Input
                                                id="smtp-host-input"
                                                type="text"
                                                value={settings.smtpHost}
                                                onChange={(e) => setSettings(prev => ({ ...prev, smtpHost: e.target.value }))}
                                                placeholder="smtp.example.com"
                                                aria-invalid={!!validationErrors.smtpHost}
                                                aria-describedby={validationErrors.smtpHost ? "smtp-host-error" : "smtp-host-help"}
                                            />
                                            {validationErrors.smtpHost ? (
                                                <p className="admin-form-error-text" id="smtp-host-error" role="alert">{validationErrors.smtpHost}</p>
                                            ) : (
                                                <p className="admin-form-help-text" id="smtp-host-help">Your SMTP server hostname</p>
                                            )}
                                        </div>

                                        <div className={`admin-form-group ${validationErrors.smtpPort ? 'has-error' : ''} ${settings.smtpPort !== originalSettings.smtpPort ? 'has-changes' : ''}`}>
                                            <Label htmlFor="smtp-port-input" className="admin-form-label-with-icon">
                                                <Server size={16} className="admin-form-label-icon" aria-hidden="true" />
                                                SMTP Port
                                                <span className="admin-required-indicator" aria-label="required">*</span>
                                            </Label>
                                            <Input
                                                id="smtp-port-input"
                                                type="number"
                                                value={settings.smtpPort}
                                                onChange={(e) => setSettings(prev => ({ ...prev, smtpPort: parseInt(e.target.value) || 587 }))}
                                                placeholder="587"
                                                min="1"
                                                max="65535"
                                                aria-invalid={!!validationErrors.smtpPort}
                                                aria-describedby={validationErrors.smtpPort ? "smtp-port-error" : "smtp-port-help"}
                                            />
                                            {validationErrors.smtpPort ? (
                                                <p className="admin-form-error-text" id="smtp-port-error" role="alert">{validationErrors.smtpPort}</p>
                                            ) : (
                                                <p className="admin-form-help-text" id="smtp-port-help">Common ports: 587 (TLS), 465 (SSL), 25 (unencrypted)</p>
                                            )}
                                        </div>

                                        <div className={`admin-form-group ${settings.smtpSecure !== originalSettings.smtpSecure ? 'has-changes' : ''}`}>
                                            <Label className="admin-maintenance-toggle-label" htmlFor="smtp-secure-toggle">
                                                <input
                                                    id="smtp-secure-toggle"
                                                    type="checkbox"
                                                    checked={settings.smtpSecure}
                                                    onChange={(e) => setSettings(prev => ({ ...prev, smtpSecure: e.target.checked }))}
                                                    className="admin-maintenance-checkbox"
                                                />
                                                <span>Use SSL/TLS</span>
                                                <div className="admin-tooltip-wrapper">
                                                    <HelpCircle size={14} className="admin-tooltip-icon" aria-hidden="true" />
                                                    <span className="admin-tooltip-text" role="tooltip">
                                                        Enable for secure connections (usually port 465)
                                                    </span>
                                                </div>
                                            </Label>
                                        </div>

                                        <div className={`admin-form-group ${validationErrors.smtpUser ? 'has-error' : ''} ${settings.smtpUser !== originalSettings.smtpUser ? 'has-changes' : ''}`}>
                                            <Label htmlFor="smtp-user-input" className="admin-form-label-with-icon">
                                                <AtSign size={16} className="admin-form-label-icon" aria-hidden="true" />
                                                SMTP Username
                                                <span className="admin-required-indicator" aria-label="required">*</span>
                                            </Label>
                                            <Input
                                                id="smtp-user-input"
                                                type="text"
                                                value={settings.smtpUser}
                                                onChange={(e) => setSettings(prev => ({ ...prev, smtpUser: e.target.value }))}
                                                placeholder="user@example.com"
                                                aria-invalid={!!validationErrors.smtpUser}
                                                aria-describedby={validationErrors.smtpUser ? "smtp-user-error" : undefined}
                                            />
                                            {validationErrors.smtpUser && (
                                                <p className="admin-form-error-text" id="smtp-user-error" role="alert">{validationErrors.smtpUser}</p>
                                            )}
                                        </div>

                                        <div className={`admin-form-group ${validationErrors.smtpPassword ? 'has-error' : ''} ${settings.smtpPassword !== originalSettings.smtpPassword ? 'has-changes' : ''}`}>
                                            <Label htmlFor="smtp-password-input" className="admin-form-label-with-icon">
                                                <Lock size={16} className="admin-form-label-icon" aria-hidden="true" />
                                                SMTP Password
                                                <span className="admin-required-indicator" aria-label="required">*</span>
                                            </Label>
                                            <div style={{ position: 'relative' }}>
                                                <Input
                                                    id="smtp-password-input"
                                                    type="password"
                                                    value={settings.smtpPassword}
                                                    onChange={(e) => setSettings(prev => ({ ...prev, smtpPassword: e.target.value }))}
                                                    placeholder="Enter SMTP password"
                                                    aria-invalid={!!validationErrors.smtpPassword}
                                                    aria-describedby={validationErrors.smtpPassword ? "smtp-password-error" : "smtp-password-help"}
                                                />
                                            </div>
                                            {validationErrors.smtpPassword ? (
                                                <p className="admin-form-error-text" id="smtp-password-error" role="alert">{validationErrors.smtpPassword}</p>
                                            ) : (
                                                <p className="admin-form-help-text" id="smtp-password-help">Password for SMTP authentication</p>
                                            )}
                                        </div>

                                        <div className={`admin-form-group ${settings.smtpFromName !== originalSettings.smtpFromName ? 'has-changes' : ''}`}>
                                            <Label htmlFor="smtp-from-name-input" className="admin-form-label-with-icon">
                                                <FileText size={16} className="admin-form-label-icon" aria-hidden="true" />
                                                From Name
                                            </Label>
                                            <Input
                                                id="smtp-from-name-input"
                                                type="text"
                                                value={settings.smtpFromName}
                                                onChange={(e) => setSettings(prev => ({ ...prev, smtpFromName: e.target.value }))}
                                                placeholder={settings.siteName || "Your Site Name"}
                                            />
                                            <p className="admin-form-help-text">Display name for sent emails</p>
                                        </div>

                                        <div className={`admin-form-group ${validationErrors.smtpFromEmail ? 'has-error' : ''} ${settings.smtpFromEmail !== originalSettings.smtpFromEmail ? 'has-changes' : ''}`}>
                                            <Label htmlFor="smtp-from-email-input" className="admin-form-label-with-icon">
                                                <Mail size={16} className="admin-form-label-icon" aria-hidden="true" />
                                                From Email
                                                <span className="admin-required-indicator" aria-label="required">*</span>
                                            </Label>
                                            <Input
                                                id="smtp-from-email-input"
                                                type="email"
                                                value={settings.smtpFromEmail}
                                                onChange={(e) => setSettings(prev => ({ ...prev, smtpFromEmail: e.target.value }))}
                                                placeholder="noreply@example.com"
                                                aria-invalid={!!validationErrors.smtpFromEmail}
                                                aria-describedby={validationErrors.smtpFromEmail ? "smtp-from-email-error" : "smtp-from-email-help"}
                                            />
                                            {validationErrors.smtpFromEmail ? (
                                                <p className="admin-form-error-text" id="smtp-from-email-error" role="alert">{validationErrors.smtpFromEmail}</p>
                                            ) : (
                                                <p className="admin-form-help-text" id="smtp-from-email-help">Email address to send from</p>
                                            )}
                                        </div>
                                    </>
                                )}

                                {/* Email Verification */}
                                <div className="admin-settings-section-divider" style={{ marginTop: '2rem' }}>
                                    <h3 className="admin-settings-section-title">
                                        <Shield size={18} style={{ marginRight: '0.5rem' }} aria-hidden="true" />
                                        Email Verification
                                    </h3>
                                </div>

                                <div className={`admin-form-group ${settings.emailVerificationRequired !== originalSettings.emailVerificationRequired ? 'has-changes' : ''}`}>
                                    <Label className="admin-maintenance-toggle-label" htmlFor="email-verification-toggle">
                                        <input
                                            id="email-verification-toggle"
                                            type="checkbox"
                                            checked={settings.emailVerificationRequired}
                                            onChange={(e) => setSettings(prev => ({ ...prev, emailVerificationRequired: e.target.checked }))}
                                            className="admin-maintenance-checkbox"
                                        />
                                        <span>Require Email Verification</span>
                                        <div className="admin-tooltip-wrapper">
                                            <HelpCircle size={14} className="admin-tooltip-icon" aria-hidden="true" />
                                            <span className="admin-tooltip-text" role="tooltip">
                                                Require users to verify their email address during signup
                                            </span>
                                        </div>
                                    </Label>
                                    <p className="admin-form-help-text">Users must verify their email before accessing the site</p>
                                </div>

                                {/* Welcome Email */}
                                <div className="admin-settings-section-divider" style={{ marginTop: '2rem' }}>
                                    <h3 className="admin-settings-section-title">
                                        <Send size={18} style={{ marginRight: '0.5rem' }} aria-hidden="true" />
                                        Welcome Email
                                    </h3>
                                </div>

                                <div className={`admin-form-group ${settings.welcomeEmailEnabled !== originalSettings.welcomeEmailEnabled ? 'has-changes' : ''}`}>
                                    <Label className="admin-maintenance-toggle-label" htmlFor="welcome-email-enabled-toggle">
                                        <input
                                            id="welcome-email-enabled-toggle"
                                            type="checkbox"
                                            checked={settings.welcomeEmailEnabled}
                                            onChange={(e) => setSettings(prev => ({ ...prev, welcomeEmailEnabled: e.target.checked }))}
                                            className="admin-maintenance-checkbox"
                                        />
                                        <span>Enable Welcome Email</span>
                                        <div className="admin-tooltip-wrapper">
                                            <HelpCircle size={14} className="admin-tooltip-icon" aria-hidden="true" />
                                            <span className="admin-tooltip-text" role="tooltip">
                                                Send a welcome email to new users after signup
                                            </span>
                                        </div>
                                    </Label>
                                </div>

                                {settings.welcomeEmailEnabled && (
                                    <>
                                        <div className={`admin-form-group ${settings.welcomeEmailSubject !== originalSettings.welcomeEmailSubject ? 'has-changes' : ''}`}>
                                            <Label htmlFor="welcome-email-subject-input" className="admin-form-label-with-icon">
                                                <FileText size={16} className="admin-form-label-icon" aria-hidden="true" />
                                                Email Subject
                                            </Label>
                                            <Input
                                                id="welcome-email-subject-input"
                                                type="text"
                                                value={settings.welcomeEmailSubject}
                                                onChange={(e) => setSettings(prev => ({ ...prev, welcomeEmailSubject: e.target.value }))}
                                                placeholder="Welcome to {siteName}!"
                                            />
                                            <p className="admin-form-help-text">Use {'{siteName}'} to insert the site name</p>
                                        </div>

                                        <div className={`admin-form-group ${settings.welcomeEmailContent !== originalSettings.welcomeEmailContent ? 'has-changes' : ''}`}>
                                            <Label htmlFor="welcome-email-content-input" className="admin-form-label-with-icon">
                                                <FileEdit size={16} className="admin-form-label-icon" aria-hidden="true" />
                                                Email Content
                                            </Label>
                                            <Textarea
                                                id="welcome-email-content-input"
                                                value={settings.welcomeEmailContent}
                                                onChange={(e) => setSettings(prev => ({ ...prev, welcomeEmailContent: e.target.value }))}
                                                placeholder="Welcome to {siteName}! We're excited to have you here..."
                                                rows={8}
                                            />
                                            <p className="admin-form-help-text">Use {'{siteName}'}, {'{username}'}, {'{email}'} for dynamic content</p>
                                        </div>
                                    </>
                                )}

                                {/* Notification Preferences */}
                                <div className="admin-settings-section-divider" style={{ marginTop: '2rem' }}>
                                    <h3 className="admin-settings-section-title">
                                        <Bell size={18} style={{ marginRight: '0.5rem' }} aria-hidden="true" />
                                        Notification Preferences
                                    </h3>
                                </div>

                                <div className={`admin-form-group ${settings.notifyOnSignup !== originalSettings.notifyOnSignup ? 'has-changes' : ''}`}>
                                    <Label className="admin-maintenance-toggle-label" htmlFor="notify-on-signup-toggle">
                                        <input
                                            id="notify-on-signup-toggle"
                                            type="checkbox"
                                            checked={settings.notifyOnSignup}
                                            onChange={(e) => setSettings(prev => ({ ...prev, notifyOnSignup: e.target.checked }))}
                                            className="admin-maintenance-checkbox"
                                        />
                                        <span>Notify on New User Signup</span>
                                    </Label>
                                </div>

                                <div className={`admin-form-group ${settings.notifyOnPasswordChange !== originalSettings.notifyOnPasswordChange ? 'has-changes' : ''}`}>
                                    <Label className="admin-maintenance-toggle-label" htmlFor="notify-on-password-change-toggle">
                                        <input
                                            id="notify-on-password-change-toggle"
                                            type="checkbox"
                                            checked={settings.notifyOnPasswordChange}
                                            onChange={(e) => setSettings(prev => ({ ...prev, notifyOnPasswordChange: e.target.checked }))}
                                            className="admin-maintenance-checkbox"
                                        />
                                        <span>Notify on Password Change</span>
                                    </Label>
                                </div>

                                <div className={`admin-form-group ${settings.notifyOnProfileUpdate !== originalSettings.notifyOnProfileUpdate ? 'has-changes' : ''}`}>
                                    <Label className="admin-maintenance-toggle-label" htmlFor="notify-on-profile-update-toggle">
                                        <input
                                            id="notify-on-profile-update-toggle"
                                            type="checkbox"
                                            checked={settings.notifyOnProfileUpdate}
                                            onChange={(e) => setSettings(prev => ({ ...prev, notifyOnProfileUpdate: e.target.checked }))}
                                            className="admin-maintenance-checkbox"
                                        />
                                        <span>Notify on Profile Update</span>
                                    </Label>
                                </div>

                                <div className={`admin-form-group ${settings.notifyOnImageUpload !== originalSettings.notifyOnImageUpload ? 'has-changes' : ''}`}>
                                    <Label className="admin-maintenance-toggle-label" htmlFor="notify-on-image-upload-toggle">
                                        <input
                                            id="notify-on-image-upload-toggle"
                                            type="checkbox"
                                            checked={settings.notifyOnImageUpload}
                                            onChange={(e) => setSettings(prev => ({ ...prev, notifyOnImageUpload: e.target.checked }))}
                                            className="admin-maintenance-checkbox"
                                        />
                                        <span>Notify on Image Upload</span>
                                    </Label>
                                </div>

                                <div className={`admin-form-group ${settings.notifyOnComment !== originalSettings.notifyOnComment ? 'has-changes' : ''}`}>
                                    <Label className="admin-maintenance-toggle-label" htmlFor="notify-on-comment-toggle">
                                        <input
                                            id="notify-on-comment-toggle"
                                            type="checkbox"
                                            checked={settings.notifyOnComment}
                                            onChange={(e) => setSettings(prev => ({ ...prev, notifyOnComment: e.target.checked }))}
                                            className="admin-maintenance-checkbox"
                                        />
                                        <span>Notify on Comment</span>
                                    </Label>
                                </div>

                                <div className={`admin-form-group ${settings.notifyOnFavorite !== originalSettings.notifyOnFavorite ? 'has-changes' : ''}`}>
                                    <Label className="admin-maintenance-toggle-label" htmlFor="notify-on-favorite-toggle">
                                        <input
                                            id="notify-on-favorite-toggle"
                                            type="checkbox"
                                            checked={settings.notifyOnFavorite}
                                            onChange={(e) => setSettings(prev => ({ ...prev, notifyOnFavorite: e.target.checked }))}
                                            className="admin-maintenance-checkbox"
                                        />
                                        <span>Notify on Favorite</span>
                                    </Label>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* User Management Tab */}
                <TabsContent
                    value="users"
                    className="admin-settings-tab-content"
                    ref={tabContentRef}
                    onTouchStart={handleContentTouchStart}
                    onTouchMove={handleContentTouchMove}
                    onTouchEnd={handleContentTouchEnd}
                >
                    <Card className="admin-settings-card">
                        <CardHeader>
                            <CardTitle className="admin-settings-card-title">
                                <Users size={20} style={{ marginRight: '0.5rem' }} aria-hidden="true" />
                                User Management
                            </CardTitle>
                            <CardDescription>
                                Configure user registration, roles, profile fields, and account management
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="admin-form">
                                {/* Registration Settings */}
                                <div className="admin-settings-section-divider">
                                    <h3 className="admin-settings-section-title">
                                        <UserPlus size={18} style={{ marginRight: '0.5rem' }} aria-hidden="true" />
                                        Registration Settings
                                    </h3>
                                </div>

                                <div className={`admin-form-group ${settings.registrationEnabled !== originalSettings.registrationEnabled ? 'has-changes' : ''}`}>
                                    <Label className="admin-maintenance-toggle-label" htmlFor="registration-enabled-toggle">
                                        <input
                                            id="registration-enabled-toggle"
                                            type="checkbox"
                                            checked={settings.registrationEnabled}
                                            onChange={(e) => setSettings(prev => ({ ...prev, registrationEnabled: e.target.checked }))}
                                            className="admin-maintenance-checkbox"
                                        />
                                        <span>Enable User Registration</span>
                                        <div className="admin-tooltip-wrapper">
                                            <HelpCircle size={14} className="admin-tooltip-icon" aria-hidden="true" />
                                            <span className="admin-tooltip-text" role="tooltip">
                                                Allow new users to create accounts
                                            </span>
                                        </div>
                                    </Label>
                                    <p className="admin-form-help-text">When disabled, only admins can create new user accounts</p>
                                </div>

                                {settings.registrationEnabled && (
                                    <div className={`admin-form-group ${settings.registrationType !== originalSettings.registrationType ? 'has-changes' : ''}`}>
                                        <Label htmlFor="registration-type-select" className="admin-form-label-with-icon">
                                            <UserPlus size={16} className="admin-form-label-icon" aria-hidden="true" />
                                            Registration Type
                                        </Label>
                                        <select
                                            id="registration-type-select"
                                            value={settings.registrationType}
                                            onChange={(e) => setSettings(prev => ({ ...prev, registrationType: e.target.value as 'open' | 'closed' | 'invite-only' }))}
                                            className="admin-select"
                                        >
                                            <option value="open">Open - Anyone can register</option>
                                            <option value="closed">Closed - Registration disabled</option>
                                            <option value="invite-only">Invite Only - Requires invitation code</option>
                                        </select>
                                        <p className="admin-form-help-text">
                                            {settings.registrationType === 'open' && 'Anyone can create an account'}
                                            {settings.registrationType === 'closed' && 'Registration is disabled for everyone'}
                                            {settings.registrationType === 'invite-only' && 'Users need an invitation code to register'}
                                        </p>
                                    </div>
                                )}

                                {/* Default User Role */}
                                <div className="admin-settings-section-divider" style={{ marginTop: '2rem' }}>
                                    <h3 className="admin-settings-section-title">
                                        <Shield size={18} style={{ marginRight: '0.5rem' }} aria-hidden="true" />
                                        Default User Role
                                    </h3>
                                </div>

                                <div className={`admin-form-group ${settings.defaultUserRole !== originalSettings.defaultUserRole ? 'has-changes' : ''}`}>
                                    <Label htmlFor="default-user-role-select" className="admin-form-label-with-icon">
                                        <Shield size={16} className="admin-form-label-icon" aria-hidden="true" />
                                        Default Role for New Users
                                    </Label>
                                    <select
                                        id="default-user-role-select"
                                        value={settings.defaultUserRole}
                                        onChange={(e) => setSettings(prev => ({ ...prev, defaultUserRole: e.target.value as 'user' | 'moderator' | 'admin' }))}
                                        className="admin-select"
                                    >
                                        <option value="user">User - Standard user permissions</option>
                                        <option value="moderator">Moderator - Can moderate content</option>
                                        <option value="admin">Admin - Full administrative access</option>
                                    </select>
                                    <p className="admin-form-help-text">Role assigned to new users when they register</p>
                                </div>

                                {/* User Verification */}
                                <div className="admin-settings-section-divider" style={{ marginTop: '2rem' }}>
                                    <h3 className="admin-settings-section-title">
                                        <UserCheck size={18} style={{ marginRight: '0.5rem' }} aria-hidden="true" />
                                        User Verification
                                    </h3>
                                </div>

                                <div className={`admin-form-group ${settings.requireEmailVerification !== originalSettings.requireEmailVerification ? 'has-changes' : ''}`}>
                                    <Label className="admin-maintenance-toggle-label" htmlFor="require-email-verification-toggle">
                                        <input
                                            id="require-email-verification-toggle"
                                            type="checkbox"
                                            checked={settings.requireEmailVerification}
                                            onChange={(e) => setSettings(prev => ({ ...prev, requireEmailVerification: e.target.checked }))}
                                            className="admin-maintenance-checkbox"
                                        />
                                        <span>Require Email Verification</span>
                                        <div className="admin-tooltip-wrapper">
                                            <HelpCircle size={14} className="admin-tooltip-icon" aria-hidden="true" />
                                            <span className="admin-tooltip-text" role="tooltip">
                                                Users must verify their email address before accessing the site
                                            </span>
                                        </div>
                                    </Label>
                                </div>

                                <div className={`admin-form-group ${settings.requirePhoneVerification !== originalSettings.requirePhoneVerification ? 'has-changes' : ''}`}>
                                    <Label className="admin-maintenance-toggle-label" htmlFor="require-phone-verification-toggle">
                                        <input
                                            id="require-phone-verification-toggle"
                                            type="checkbox"
                                            checked={settings.requirePhoneVerification}
                                            onChange={(e) => setSettings(prev => ({ ...prev, requirePhoneVerification: e.target.checked }))}
                                            className="admin-maintenance-checkbox"
                                        />
                                        <span>Require Phone Verification</span>
                                        <div className="admin-tooltip-wrapper">
                                            <HelpCircle size={14} className="admin-tooltip-icon" aria-hidden="true" />
                                            <span className="admin-tooltip-text" role="tooltip">
                                                Users must verify their phone number (requires SMS service)
                                            </span>
                                        </div>
                                    </Label>
                                </div>

                                {/* Profile Fields */}
                                <div className="admin-settings-section-divider" style={{ marginTop: '2rem' }}>
                                    <h3 className="admin-settings-section-title">
                                        <FileText size={18} style={{ marginRight: '0.5rem' }} aria-hidden="true" />
                                        Profile Fields
                                    </h3>
                                </div>

                                <p className="admin-form-help-text" style={{ marginBottom: '1rem' }}>Configure which profile fields are required or optional</p>

                                <div className={`admin-form-group ${JSON.stringify(settings.requiredProfileFields) !== JSON.stringify(originalSettings.requiredProfileFields) ? 'has-changes' : ''}`}>
                                    <Label className="admin-maintenance-toggle-label" htmlFor="profile-field-displayname-toggle">
                                        <input
                                            id="profile-field-displayname-toggle"
                                            type="checkbox"
                                            checked={settings.requiredProfileFields.displayName}
                                            onChange={(e) => setSettings(prev => ({
                                                ...prev,
                                                requiredProfileFields: {
                                                    ...prev.requiredProfileFields,
                                                    displayName: e.target.checked
                                                }
                                            }))}
                                            className="admin-maintenance-checkbox"
                                        />
                                        <span>Display Name (Required)</span>
                                    </Label>
                                </div>

                                <div className={`admin-form-group ${JSON.stringify(settings.requiredProfileFields) !== JSON.stringify(originalSettings.requiredProfileFields) ? 'has-changes' : ''}`}>
                                    <Label className="admin-maintenance-toggle-label" htmlFor="profile-field-bio-toggle">
                                        <input
                                            id="profile-field-bio-toggle"
                                            type="checkbox"
                                            checked={settings.requiredProfileFields.bio}
                                            onChange={(e) => setSettings(prev => ({
                                                ...prev,
                                                requiredProfileFields: {
                                                    ...prev.requiredProfileFields,
                                                    bio: e.target.checked
                                                }
                                            }))}
                                            className="admin-maintenance-checkbox"
                                        />
                                        <span>Bio (Required)</span>
                                    </Label>
                                </div>

                                <div className={`admin-form-group ${JSON.stringify(settings.requiredProfileFields) !== JSON.stringify(originalSettings.requiredProfileFields) ? 'has-changes' : ''}`}>
                                    <Label className="admin-maintenance-toggle-label" htmlFor="profile-field-location-toggle">
                                        <input
                                            id="profile-field-location-toggle"
                                            type="checkbox"
                                            checked={settings.requiredProfileFields.location}
                                            onChange={(e) => setSettings(prev => ({
                                                ...prev,
                                                requiredProfileFields: {
                                                    ...prev.requiredProfileFields,
                                                    location: e.target.checked
                                                }
                                            }))}
                                            className="admin-maintenance-checkbox"
                                        />
                                        <span>Location (Required)</span>
                                    </Label>
                                </div>

                                <div className={`admin-form-group ${JSON.stringify(settings.requiredProfileFields) !== JSON.stringify(originalSettings.requiredProfileFields) ? 'has-changes' : ''}`}>
                                    <Label className="admin-maintenance-toggle-label" htmlFor="profile-field-website-toggle">
                                        <input
                                            id="profile-field-website-toggle"
                                            type="checkbox"
                                            checked={settings.requiredProfileFields.website}
                                            onChange={(e) => setSettings(prev => ({
                                                ...prev,
                                                requiredProfileFields: {
                                                    ...prev.requiredProfileFields,
                                                    website: e.target.checked
                                                }
                                            }))}
                                            className="admin-maintenance-checkbox"
                                        />
                                        <span>Website (Required)</span>
                                    </Label>
                                </div>

                                <div className={`admin-form-group ${JSON.stringify(settings.requiredProfileFields) !== JSON.stringify(originalSettings.requiredProfileFields) ? 'has-changes' : ''}`}>
                                    <Label className="admin-maintenance-toggle-label" htmlFor="profile-field-phone-toggle">
                                        <input
                                            id="profile-field-phone-toggle"
                                            type="checkbox"
                                            checked={settings.requiredProfileFields.phone}
                                            onChange={(e) => setSettings(prev => ({
                                                ...prev,
                                                requiredProfileFields: {
                                                    ...prev.requiredProfileFields,
                                                    phone: e.target.checked
                                                }
                                            }))}
                                            className="admin-maintenance-checkbox"
                                        />
                                        <span>Phone (Required)</span>
                                    </Label>
                                </div>

                                {/* Account Deletion */}
                                <div className="admin-settings-section-divider" style={{ marginTop: '2rem' }}>
                                    <h3 className="admin-settings-section-title">
                                        <Trash2 size={18} style={{ marginRight: '0.5rem' }} aria-hidden="true" />
                                        Account Deletion
                                    </h3>
                                </div>

                                <div className={`admin-form-group ${settings.allowAccountSelfDeletion !== originalSettings.allowAccountSelfDeletion ? 'has-changes' : ''}`}>
                                    <Label className="admin-maintenance-toggle-label" htmlFor="allow-account-self-deletion-toggle">
                                        <input
                                            id="allow-account-self-deletion-toggle"
                                            type="checkbox"
                                            checked={settings.allowAccountSelfDeletion}
                                            onChange={(e) => setSettings(prev => ({ ...prev, allowAccountSelfDeletion: e.target.checked }))}
                                            className="admin-maintenance-checkbox"
                                        />
                                        <span>Allow Account Self-Deletion</span>
                                        <div className="admin-tooltip-wrapper">
                                            <HelpCircle size={14} className="admin-tooltip-icon" aria-hidden="true" />
                                            <span className="admin-tooltip-text" role="tooltip">
                                                Allow users to delete their own accounts from their profile settings
                                            </span>
                                        </div>
                                    </Label>
                                    <p className="admin-form-help-text">When disabled, only admins can delete user accounts</p>
                                </div>

                                {/* Save Button */}
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    marginTop: '2rem',
                                    paddingTop: '1.5rem',
                                    borderTop: '1px solid hsl(var(--border))'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        {hasChanges && (
                                            <span className="admin-change-indicator" style={{ fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))' }}>
                                                <AlertCircle size={14} style={{ marginRight: '0.25rem' }} aria-hidden="true" />
                                                You have unsaved changes
                                            </span>
                                        )}
                                        {saveSuccess && (
                                            <div className={`admin-save-success-indicator ${isFadingOut ? 'fade-out' : ''}`}>
                                                <CheckCircle2 size={16} />
                                                <span>Settings saved successfully!</span>
                                            </div>
                                        )}
                                    </div>
                                    <Button
                                        onClick={handleSave}
                                        disabled={saving || !hasChanges || Object.keys(validationErrors).length > 0}
                                        className="admin-add-category-btn"
                                        aria-label={saving ? 'Saving settings' : 'Save all settings'}
                                        aria-describedby="save-button-help-users"
                                    >
                                        <Save size={16} aria-hidden="true" />
                                        {saving ? t('admin.saving') : t('admin.saveSettings')}
                                    </Button>
                                    <span id="save-button-help-users" className="sr-only">
                                        {!hasChanges ? 'No changes to save' : Object.keys(validationErrors).length > 0 ? 'Please fix errors before saving' : 'Save all settings changes'}
                                    </span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Notifications Tab */}
                <TabsContent
                    value="notifications"
                    className="admin-settings-tab-content"
                    ref={tabContentRef}
                    onTouchStart={handleContentTouchStart}
                    onTouchMove={handleContentTouchMove}
                    onTouchEnd={handleContentTouchEnd}
                >
                    <Card className="admin-settings-card">
                        <CardHeader>
                            <CardTitle className="admin-settings-card-title">
                                <Bell size={20} style={{ marginRight: '0.5rem' }} aria-hidden="true" />
                                System Notifications
                            </CardTitle>
                            <CardDescription>
                                {t('admin.systemNotificationsDescription')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {!showAnnouncementForm && !showHistory && !showTemplates ? (
                                <div className="admin-empty-state">
                                    <div className="admin-empty-state-icon">
                                        <Bell size={48} />
                                    </div>
                                    <h3 className="admin-empty-state-title">System Announcements</h3>
                                    <p className="admin-empty-state-description">
                                        Create, schedule, and manage system-wide notifications to inform users about important updates, maintenance, or announcements.
                                    </p>
                                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                                        <Button
                                            onClick={() => setShowAnnouncementForm(true)}
                                            className="admin-add-category-btn"
                                        >
                                            <Megaphone size={16} style={{ marginRight: '0.5rem' }} />
                                            Create Announcement
                                        </Button>
                                        <Button
                                            onClick={() => setShowHistory(true)}
                                            variant="outline"
                                        >
                                            <History size={16} style={{ marginRight: '0.5rem' }} />
                                            View History
                                        </Button>
                                        <Button
                                            onClick={() => setShowTemplates(true)}
                                            variant="outline"
                                        >
                                            <BookOpen size={16} style={{ marginRight: '0.5rem' }} />
                                            Templates
                                        </Button>
                                    </div>
                                </div>
                            ) : showHistory ? (
                                <div className="admin-form">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                        <h3 className="admin-announcement-form-title">Announcement History</h3>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setShowHistory(false)}
                                        >
                                            <X size={16} style={{ marginRight: '0.5rem' }} />
                                            Back
                                        </Button>
                                    </div>
                                    {announcementHistory.length === 0 ? (
                                        <div className="admin-empty-state" style={{ padding: '2rem' }}>
                                            <History size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                                            <p>No announcement history yet</p>
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                            {announcementHistory.map((announcement) => (
                                                <Card key={announcement.id} style={{ padding: '1rem' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                                                        <div style={{ flex: 1 }}>
                                                            <h4 style={{ marginBottom: '0.5rem', fontWeight: 600 }}>{announcement.title}</h4>
                                                            <p style={{ fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))', marginBottom: '0.5rem' }}>
                                                                Sent: {new Date(announcement.sentAt).toLocaleString()}
                                                            </p>
                                                            <div style={{ display: 'flex', gap: '1rem', fontSize: '0.875rem' }}>
                                                                <span>Recipients: {announcement.recipientCount}</span>
                                                                <span>Read: {announcement.readCount} ({Math.round((announcement.readCount / announcement.recipientCount) * 100)}%)</span>
                                                            </div>
                                                        </div>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => {
                                                                // View read receipts - would need backend API
                                                                toast.info('Read receipts feature coming soon');
                                                            }}
                                                        >
                                                            <Eye size={16} />
                                                        </Button>
                                                    </div>
                                                </Card>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ) : showTemplates ? (
                                <div className="admin-form">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                        <h3 className="admin-announcement-form-title">Announcement Templates</h3>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                    setShowTemplates(false);
                                                    setShowAnnouncementForm(true);
                                                }}
                                            >
                                                <Plus size={16} style={{ marginRight: '0.5rem' }} />
                                                New Template
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setShowTemplates(false)}
                                            >
                                                <X size={16} />
                                            </Button>
                                        </div>
                                    </div>
                                    {announcementTemplates.length === 0 ? (
                                        <div className="admin-empty-state" style={{ padding: '2rem' }}>
                                            <BookOpen size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                                            <p>No templates saved yet</p>
                                            <Button
                                                variant="outline"
                                                onClick={() => {
                                                    setShowTemplates(false);
                                                    setShowAnnouncementForm(true);
                                                }}
                                                style={{ marginTop: '1rem' }}
                                            >
                                                Create First Template
                                            </Button>
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                            {announcementTemplates.map((template) => (
                                                <Card key={template.id} style={{ padding: '1rem' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <div>
                                                            <h4 style={{ marginBottom: '0.25rem', fontWeight: 600 }}>{template.name}</h4>
                                                            <p style={{ fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))' }}>
                                                                {template.data.title}
                                                            </p>
                                                        </div>
                                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => {
                                                                    setAnnouncementData(template.data);
                                                                    setShowTemplates(false);
                                                                    setShowAnnouncementForm(true);
                                                                }}
                                                            >
                                                                <FolderOpen size={16} />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => {
                                                                    setAnnouncementTemplates(prev => prev.filter(t => t.id !== template.id));
                                                                    toast.success('Template deleted');
                                                                }}
                                                            >
                                                                <Trash2 size={16} />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </Card>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="admin-form admin-announcement-form">
                                    <div className="admin-announcement-form-header">
                                        <h3 className="admin-announcement-form-title">Create System Announcement</h3>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => {
                                                    const templateName = prompt('Template name:');
                                                    if (templateName && templateName.trim()) {
                                                        const newTemplate = {
                                                            id: Date.now().toString(),
                                                            name: templateName.trim(),
                                                            data: { ...announcementData },
                                                        };
                                                        setAnnouncementTemplates(prev => [...prev, newTemplate]);
                                                        toast.success('Template saved');
                                                    }
                                                }}
                                                title="Save as template"
                                            >
                                                <SaveIcon size={16} />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => {
                                                    setShowAnnouncementForm(false);
                                                    setAnnouncementData({
                                                        type: 'system_announcement',
                                                        title: '',
                                                        message: '',
                                                        scheduledDate: '',
                                                        priority: 'medium',
                                                        expirationDate: '',
                                                        targetRoles: [],
                                                        targetUserIds: [],
                                                        sendToAll: true,
                                                    });
                                                }}
                                            >
                                                <X size={16} />
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="admin-form-group">
                                        <Label htmlFor="announcement-type-select">Loại thông báo</Label>
                                        <select
                                            id="announcement-type-select"
                                            value={announcementData.type}
                                            onChange={(e) => setAnnouncementData({ ...announcementData, type: e.target.value as 'system_announcement' | 'feature_update' | 'maintenance_scheduled' | 'terms_updated' })}
                                            className="admin-select"
                                            aria-describedby="announcement-type-help"
                                        >
                                            <option value="system_announcement">Thông báo hệ thống</option>
                                            <option value="feature_update">Cập nhật tính năng</option>
                                            <option value="maintenance_scheduled">Bảo trì hệ thống</option>
                                            <option value="terms_updated">Cập nhật điều khoản</option>
                                        </select>
                                        <span id="announcement-type-help" className="sr-only">
                                            Select the type of system announcement to send
                                        </span>
                                    </div>

                                    <div className="admin-form-group">
                                        <Label htmlFor="announcement-title-input">Tiêu đề</Label>
                                        <Input
                                            id="announcement-title-input"
                                            value={announcementData.title}
                                            onChange={(e) => setAnnouncementData({ ...announcementData, title: e.target.value })}
                                            placeholder="Nhập tiêu đề thông báo"
                                            aria-required="true"
                                            aria-describedby="announcement-title-help"
                                        />
                                        <span id="announcement-title-help" className="sr-only">
                                            Enter the title for the system announcement
                                        </span>
                                    </div>

                                    <div className="admin-form-group">
                                        <Label htmlFor="announcement-message-textarea">Content</Label>
                                        <Textarea
                                            id="announcement-message-textarea"
                                            value={announcementData.message}
                                            onChange={(e) => setAnnouncementData({ ...announcementData, message: e.target.value })}
                                            placeholder="Enter announcement content (supports basic HTML)"
                                            rows={8}
                                            aria-required="true"
                                            aria-describedby="announcement-message-help"
                                        />
                                        <p className="admin-form-help-text">Supports basic HTML formatting (bold, italic, links, lists)</p>
                                        <span id="announcement-message-help" className="sr-only">
                                            Enter the message content for the system announcement
                                        </span>
                                    </div>

                                    {/* Advanced Settings Section */}
                                    <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid hsl(var(--border))' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                            <h4 style={{ fontSize: '1rem', fontWeight: 600 }}>Advanced Settings</h4>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                                            >
                                                {showAdvancedSettings ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                                {showAdvancedSettings ? 'Hide' : 'Show'}
                                            </Button>
                                        </div>

                                        {showAdvancedSettings && (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                                {/* Priority Level */}
                                                <div className="admin-form-group">
                                                    <Label htmlFor="announcement-priority-select" className="admin-form-label-with-icon">
                                                        <Star size={16} className="admin-form-label-icon" aria-hidden="true" />
                                                        Priority Level
                                                    </Label>
                                                    <select
                                                        id="announcement-priority-select"
                                                        value={announcementData.priority}
                                                        onChange={(e) => setAnnouncementData({ ...announcementData, priority: e.target.value as 'low' | 'medium' | 'high' | 'urgent' })}
                                                        className="admin-select"
                                                    >
                                                        <option value="low">Low - General information</option>
                                                        <option value="medium">Medium - Important notice</option>
                                                        <option value="high">High - Urgent action required</option>
                                                        <option value="urgent">Urgent - Immediate attention</option>
                                                    </select>
                                                </div>

                                                {/* Scheduled Date */}
                                                <div className="admin-form-group">
                                                    <Label htmlFor="announcement-scheduled-date" className="admin-form-label-with-icon">
                                                        <Calendar size={16} className="admin-form-label-icon" aria-hidden="true" />
                                                        Schedule Announcement
                                                    </Label>
                                                    <Input
                                                        id="announcement-scheduled-date"
                                                        type="datetime-local"
                                                        value={announcementData.scheduledDate ? new Date(announcementData.scheduledDate).toISOString().slice(0, 16) : ''}
                                                        onChange={(e) => {
                                                            const dateValue = e.target.value;
                                                            setAnnouncementData({
                                                                ...announcementData,
                                                                scheduledDate: dateValue ? new Date(dateValue).toISOString() : ''
                                                            });
                                                        }}
                                                    />
                                                    <p className="admin-form-help-text">Leave empty to send immediately, or set a future date/time</p>
                                                </div>

                                                {/* Expiration Date */}
                                                <div className="admin-form-group">
                                                    <Label htmlFor="announcement-expiration-date" className="admin-form-label-with-icon">
                                                        <Clock size={16} className="admin-form-label-icon" aria-hidden="true" />
                                                        Expiration Date
                                                    </Label>
                                                    <Input
                                                        id="announcement-expiration-date"
                                                        type="datetime-local"
                                                        value={announcementData.expirationDate ? new Date(announcementData.expirationDate).toISOString().slice(0, 16) : ''}
                                                        onChange={(e) => {
                                                            const dateValue = e.target.value;
                                                            setAnnouncementData({
                                                                ...announcementData,
                                                                expirationDate: dateValue ? new Date(dateValue).toISOString() : ''
                                                            });
                                                        }}
                                                    />
                                                    <p className="admin-form-help-text">Announcement will automatically expire after this date</p>
                                                </div>

                                                {/* Target Audience */}
                                                <div className="admin-form-group">
                                                    <Label className="admin-form-label-with-icon">
                                                        <Target size={16} className="admin-form-label-icon" aria-hidden="true" />
                                                        Target Audience
                                                    </Label>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                                        <Label className="admin-maintenance-toggle-label" htmlFor="send-to-all-toggle">
                                                            <input
                                                                id="send-to-all-toggle"
                                                                type="checkbox"
                                                                checked={announcementData.sendToAll}
                                                                onChange={(e) => setAnnouncementData({ ...announcementData, sendToAll: e.target.checked })}
                                                                className="admin-maintenance-checkbox"
                                                            />
                                                            <span>Send to All Users</span>
                                                        </Label>
                                                        {!announcementData.sendToAll && (
                                                            <div style={{ paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                                                <Label className="admin-maintenance-toggle-label" htmlFor="target-role-user">
                                                                    <input
                                                                        id="target-role-user"
                                                                        type="checkbox"
                                                                        checked={announcementData.targetRoles.includes('user')}
                                                                        onChange={(e) => {
                                                                            const roles = e.target.checked
                                                                                ? [...announcementData.targetRoles, 'user']
                                                                                : announcementData.targetRoles.filter(r => r !== 'user');
                                                                            setAnnouncementData({ ...announcementData, targetRoles: roles });
                                                                        }}
                                                                        className="admin-maintenance-checkbox"
                                                                    />
                                                                    <span>Users</span>
                                                                </Label>
                                                                <Label className="admin-maintenance-toggle-label" htmlFor="target-role-moderator">
                                                                    <input
                                                                        id="target-role-moderator"
                                                                        type="checkbox"
                                                                        checked={announcementData.targetRoles.includes('moderator')}
                                                                        onChange={(e) => {
                                                                            const roles = e.target.checked
                                                                                ? [...announcementData.targetRoles, 'moderator']
                                                                                : announcementData.targetRoles.filter(r => r !== 'moderator');
                                                                            setAnnouncementData({ ...announcementData, targetRoles: roles });
                                                                        }}
                                                                        className="admin-maintenance-checkbox"
                                                                    />
                                                                    <span>Moderators</span>
                                                                </Label>
                                                                <Label className="admin-maintenance-toggle-label" htmlFor="target-role-admin">
                                                                    <input
                                                                        id="target-role-admin"
                                                                        type="checkbox"
                                                                        checked={announcementData.targetRoles.includes('admin')}
                                                                        onChange={(e) => {
                                                                            const roles = e.target.checked
                                                                                ? [...announcementData.targetRoles, 'admin']
                                                                                : announcementData.targetRoles.filter(r => r !== 'admin');
                                                                            setAnnouncementData({ ...announcementData, targetRoles: roles });
                                                                        }}
                                                                        className="admin-maintenance-checkbox"
                                                                    />
                                                                    <span>Admins</span>
                                                                </Label>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="admin-modal-actions">
                                        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                                            <Button
                                                onClick={handleSendAnnouncement}
                                                disabled={sendingAnnouncement || !announcementData.title.trim() || !announcementData.message.trim()}
                                                className="admin-add-category-btn"
                                            >
                                                <Megaphone size={16} style={{ marginRight: '0.5rem' }} />
                                                {announcementData.scheduledDate
                                                    ? (sendingAnnouncement ? 'Scheduling...' : 'Schedule Announcement')
                                                    : (sendingAnnouncement ? 'Sending...' : 'Send Announcement')
                                                }
                                            </Button>
                                            <Button
                                                variant="outline"
                                                onClick={() => {
                                                    setShowAnnouncementForm(false);
                                                    setAnnouncementData({
                                                        type: 'system_announcement',
                                                        title: '',
                                                        message: '',
                                                        scheduledDate: '',
                                                        priority: 'medium',
                                                        expirationDate: '',
                                                        targetRoles: [],
                                                        targetUserIds: [],
                                                        sendToAll: true,
                                                    });
                                                }}
                                                disabled={sendingAnnouncement}
                                            >
                                                Cancel
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Monitoring & Alerts Tab */}
                <TabsContent
                    value="monitoring"
                    className="admin-settings-tab-content"
                    ref={tabContentRef}
                    onTouchStart={handleContentTouchStart}
                    onTouchMove={handleContentTouchMove}
                    onTouchEnd={handleContentTouchEnd}
                >
                    <Card className="admin-settings-card">
                        <CardHeader>
                            <CardTitle className="admin-settings-card-title">
                                <Activity size={20} style={{ marginRight: '0.5rem' }} aria-hidden="true" />
                                Monitoring & Alerts
                            </CardTitle>
                            <CardDescription>
                                Configure system health monitoring, alert thresholds, and email notifications for critical events.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="admin-form">
                                {/* Health Checks */}
                                <div className="admin-settings-section-divider">
                                    <h3 className="admin-settings-section-title">
                                        <Activity size={18} style={{ marginRight: '0.5rem' }} aria-hidden="true" />
                                        Health Checks
                                    </h3>
                                </div>

                                <div className={`admin-form-group ${settings.healthCheckEnabled !== originalSettings.healthCheckEnabled ? 'has-changes' : ''}`}>
                                    <Label className="admin-maintenance-toggle-label" htmlFor="health-check-enabled-toggle">
                                        <input
                                            id="health-check-enabled-toggle"
                                            type="checkbox"
                                            checked={settings.healthCheckEnabled}
                                            onChange={(e) => setSettings(prev => ({ ...prev, healthCheckEnabled: e.target.checked }))}
                                            className="admin-maintenance-checkbox"
                                        />
                                        <span>Enable Health Checks</span>
                                        <div className="admin-tooltip-wrapper">
                                            <HelpCircle size={14} className="admin-tooltip-icon" aria-hidden="true" />
                                            <span className="admin-tooltip-text" role="tooltip">
                                                Automatically monitor system health and performance metrics
                                            </span>
                                        </div>
                                    </Label>
                                </div>

                                {settings.healthCheckEnabled && (
                                    <div className={`admin-form-group ${settings.healthCheckInterval !== originalSettings.healthCheckInterval ? 'has-changes' : ''}`}>
                                        <Label htmlFor="health-check-interval-input" className="admin-form-label-with-icon">
                                            <Clock size={16} className="admin-form-label-icon" aria-hidden="true" />
                                            Check Interval (seconds)
                                        </Label>
                                        <Input
                                            id="health-check-interval-input"
                                            type="number"
                                            value={settings.healthCheckInterval}
                                            onChange={(e) => setSettings(prev => ({ ...prev, healthCheckInterval: parseInt(e.target.value) || 60 }))}
                                            min="10"
                                            max="3600"
                                            placeholder="60"
                                        />
                                        <p className="admin-form-help-text">How often to perform health checks (10-3600 seconds)</p>
                                    </div>
                                )}

                                {/* Alert Thresholds */}
                                <div className="admin-settings-section-divider" style={{ marginTop: '2rem' }}>
                                    <h3 className="admin-settings-section-title">
                                        <AlertCircleIcon size={18} style={{ marginRight: '0.5rem' }} aria-hidden="true" />
                                        Alert Thresholds
                                    </h3>
                                </div>

                                <p className="admin-form-help-text" style={{ marginBottom: '1rem' }}>Set thresholds for when alerts should be triggered</p>

                                <div className={`admin-form-group ${(settings.alertThresholds?.cpuUsage ?? 80) !== (originalSettings.alertThresholds?.cpuUsage ?? 80) ? 'has-changes' : ''}`}>
                                    <Label htmlFor="cpu-threshold-input" className="admin-form-label-with-icon">
                                        <Zap size={16} className="admin-form-label-icon" aria-hidden="true" />
                                        CPU Usage Threshold (%)
                                    </Label>
                                    <Input
                                        id="cpu-threshold-input"
                                        type="number"
                                        value={settings.alertThresholds?.cpuUsage ?? 80}
                                        onChange={(e) => setSettings(prev => ({
                                            ...prev,
                                            alertThresholds: {
                                                ...(prev.alertThresholds || {}),
                                                cpuUsage: parseInt(e.target.value) || 80
                                            }
                                        }))}
                                        min="50"
                                        max="100"
                                        placeholder="80"
                                    />
                                    <p className="admin-form-help-text">Alert when CPU usage exceeds this percentage</p>
                                </div>

                                <div className={`admin-form-group ${(settings.alertThresholds?.memoryUsage ?? 85) !== (originalSettings.alertThresholds?.memoryUsage ?? 85) ? 'has-changes' : ''}`}>
                                    <Label htmlFor="memory-threshold-input" className="admin-form-label-with-icon">
                                        <Database size={16} className="admin-form-label-icon" aria-hidden="true" />
                                        Memory Usage Threshold (%)
                                    </Label>
                                    <Input
                                        id="memory-threshold-input"
                                        type="number"
                                        value={settings.alertThresholds?.memoryUsage ?? 85}
                                        onChange={(e) => setSettings(prev => ({
                                            ...prev,
                                            alertThresholds: {
                                                ...(prev.alertThresholds || {}),
                                                memoryUsage: parseInt(e.target.value) || 85
                                            }
                                        }))}
                                        min="50"
                                        max="100"
                                        placeholder="85"
                                    />
                                    <p className="admin-form-help-text">Alert when memory usage exceeds this percentage</p>
                                </div>

                                <div className={`admin-form-group ${(settings.alertThresholds?.diskUsage ?? 90) !== (originalSettings.alertThresholds?.diskUsage ?? 90) ? 'has-changes' : ''}`}>
                                    <Label htmlFor="disk-threshold-input" className="admin-form-label-with-icon">
                                        <Server size={16} className="admin-form-label-icon" aria-hidden="true" />
                                        Disk Usage Threshold (%)
                                    </Label>
                                    <Input
                                        id="disk-threshold-input"
                                        type="number"
                                        value={settings.alertThresholds?.diskUsage ?? 90}
                                        onChange={(e) => setSettings(prev => ({
                                            ...prev,
                                            alertThresholds: {
                                                ...(prev.alertThresholds || {}),
                                                diskUsage: parseInt(e.target.value) || 90
                                            }
                                        }))}
                                        min="50"
                                        max="100"
                                        placeholder="90"
                                    />
                                    <p className="admin-form-help-text">Alert when disk usage exceeds this percentage</p>
                                </div>

                                <div className={`admin-form-group ${(settings.alertThresholds?.responseTime ?? 1000) !== (originalSettings.alertThresholds?.responseTime ?? 1000) ? 'has-changes' : ''}`}>
                                    <Label htmlFor="response-time-threshold-input" className="admin-form-label-with-icon">
                                        <Clock size={16} className="admin-form-label-icon" aria-hidden="true" />
                                        Response Time Threshold (ms)
                                    </Label>
                                    <Input
                                        id="response-time-threshold-input"
                                        type="number"
                                        value={settings.alertThresholds?.responseTime ?? 1000}
                                        onChange={(e) => setSettings(prev => ({
                                            ...prev,
                                            alertThresholds: {
                                                ...(prev.alertThresholds || {}),
                                                responseTime: parseInt(e.target.value) || 1000
                                            }
                                        }))}
                                        min="100"
                                        max="10000"
                                        placeholder="1000"
                                    />
                                    <p className="admin-form-help-text">Alert when average response time exceeds this value (milliseconds)</p>
                                </div>

                                <div className={`admin-form-group ${(settings.alertThresholds?.errorRate ?? 5) !== (originalSettings.alertThresholds?.errorRate ?? 5) ? 'has-changes' : ''}`}>
                                    <Label htmlFor="error-rate-threshold-input" className="admin-form-label-with-icon">
                                        <AlertTriangle size={16} className="admin-form-label-icon" aria-hidden="true" />
                                        Error Rate Threshold (%)
                                    </Label>
                                    <Input
                                        id="error-rate-threshold-input"
                                        type="number"
                                        value={settings.alertThresholds?.errorRate ?? 5}
                                        onChange={(e) => setSettings(prev => ({
                                            ...prev,
                                            alertThresholds: {
                                                ...(prev.alertThresholds || {}),
                                                errorRate: parseInt(e.target.value) || 5
                                            }
                                        }))}
                                        min="0"
                                        max="100"
                                        placeholder="5"
                                    />
                                    <p className="admin-form-help-text">Alert when error rate exceeds this percentage</p>
                                </div>

                                {/* Email Alerts */}
                                <div className="admin-settings-section-divider" style={{ marginTop: '2rem' }}>
                                    <h3 className="admin-settings-section-title">
                                        <Mail size={18} style={{ marginRight: '0.5rem' }} aria-hidden="true" />
                                        Email Alerts
                                    </h3>
                                </div>

                                <div className={`admin-form-group ${settings.emailAlertsEnabled !== originalSettings.emailAlertsEnabled ? 'has-changes' : ''}`}>
                                    <Label className="admin-maintenance-toggle-label" htmlFor="email-alerts-enabled-toggle">
                                        <input
                                            id="email-alerts-enabled-toggle"
                                            type="checkbox"
                                            checked={settings.emailAlertsEnabled}
                                            onChange={(e) => setSettings(prev => ({ ...prev, emailAlertsEnabled: e.target.checked }))}
                                            className="admin-maintenance-checkbox"
                                        />
                                        <span>Enable Email Alerts</span>
                                        <div className="admin-tooltip-wrapper">
                                            <HelpCircle size={14} className="admin-tooltip-icon" aria-hidden="true" />
                                            <span className="admin-tooltip-text" role="tooltip">
                                                Send email notifications when alert thresholds are exceeded
                                            </span>
                                        </div>
                                    </Label>
                                </div>

                                {settings.emailAlertsEnabled && (
                                    <div className={`admin-form-group ${JSON.stringify(settings.emailAlertRecipients) !== JSON.stringify(originalSettings.emailAlertRecipients) ? 'has-changes' : ''}`}>
                                        <Label htmlFor="email-alert-recipients-textarea" className="admin-form-label-with-icon">
                                            <Mail size={16} className="admin-form-label-icon" aria-hidden="true" />
                                            Alert Recipients
                                        </Label>
                                        <Textarea
                                            id="email-alert-recipients-textarea"
                                            value={(settings.emailAlertRecipients || []).join(', ')}
                                            onChange={(e) => {
                                                const emails = e.target.value.split(',').map(email => email.trim()).filter(email => email);
                                                setSettings(prev => ({ ...prev, emailAlertRecipients: emails }));
                                            }}
                                            placeholder="admin@example.com, support@example.com"
                                            rows={3}
                                        />
                                        <p className="admin-form-help-text">Comma-separated list of email addresses to receive alerts</p>
                                    </div>
                                )}

                                {/* Alert Events */}
                                <div className="admin-settings-section-divider" style={{ marginTop: '2rem' }}>
                                    <h3 className="admin-settings-section-title">
                                        <Bell size={18} style={{ marginRight: '0.5rem' }} aria-hidden="true" />
                                        Alert Events
                                    </h3>
                                </div>

                                <p className="admin-form-help-text" style={{ marginBottom: '1rem' }}>Select which events should trigger alerts</p>

                                {settings.alertEvents && Object.entries(settings.alertEvents).map(([key, value]) => (
                                    <div key={key} className={`admin-form-group ${(settings.alertEvents?.[key as keyof typeof settings.alertEvents] ?? false) !== (originalSettings.alertEvents?.[key as keyof typeof originalSettings.alertEvents] ?? false) ? 'has-changes' : ''}`}>
                                        <Label className="admin-maintenance-toggle-label" htmlFor={`alert-event-${key}-toggle`}>
                                            <input
                                                id={`alert-event-${key}-toggle`}
                                                type="checkbox"
                                                checked={value || false}
                                                onChange={(e) => setSettings(prev => ({
                                                    ...prev,
                                                    alertEvents: {
                                                        ...(prev.alertEvents || {}),
                                                        [key]: e.target.checked
                                                    }
                                                }))}
                                                className="admin-maintenance-checkbox"
                                            />
                                            <span>{key.split(/(?=[A-Z])/).map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}</span>
                                        </Label>
                                    </div>
                                ))}

                                {/* Save Button */}
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    marginTop: '2rem',
                                    paddingTop: '1.5rem',
                                    borderTop: '1px solid hsl(var(--border))'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        {hasChanges && (
                                            <span className="admin-change-indicator" style={{ fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))' }}>
                                                <AlertCircle size={14} style={{ marginRight: '0.25rem' }} aria-hidden="true" />
                                                You have unsaved changes
                                            </span>
                                        )}
                                        {saveSuccess && (
                                            <div className={`admin-save-success-indicator ${isFadingOut ? 'fade-out' : ''}`}>
                                                <CheckCircle2 size={16} />
                                                <span>Settings saved successfully!</span>
                                            </div>
                                        )}
                                    </div>
                                    <Button
                                        onClick={handleSave}
                                        disabled={saving || !hasChanges || Object.keys(validationErrors).length > 0}
                                        className="admin-add-category-btn"
                                        aria-label={saving ? 'Saving settings' : 'Save all settings'}
                                        aria-describedby="save-button-help-monitoring"
                                    >
                                        <Save size={16} aria-hidden="true" />
                                        {saving ? t('admin.saving') : t('admin.saveSettings')}
                                    </Button>
                                    <span id="save-button-help-monitoring" className="sr-only">
                                        {!hasChanges ? 'No changes to save' : Object.keys(validationErrors).length > 0 ? 'Please fix errors before saving' : 'Save all settings changes'}
                                    </span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}

