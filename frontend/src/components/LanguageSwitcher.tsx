import { useState, useEffect } from 'react';
import { getLocale, setLocale, type Locale } from '@/i18n';
import { Globe } from 'lucide-react';

interface LanguageSwitcherProps {
    className?: string;
    variant?: 'button' | 'menu-item';
    showIcon?: boolean;
    showLabel?: boolean;
    onSwitch?: () => void;
}

const LANGUAGE_LABELS: Record<Locale, string> = {
    vi: 'Tiếng Việt',
    en: 'English',
};

const LANGUAGE_FLAGS: Record<Locale, string> = {
    vi: '🇻🇳',
    en: '🇺🇸',
};

export function LanguageSwitcher({
    className = '',
    variant = 'button',
    showIcon = true,
    showLabel = true,
    onSwitch,
}: LanguageSwitcherProps) {
    const [currentLocale, setCurrentLocale] = useState<Locale>(getLocale());

    // Listen for locale changes
    useEffect(() => {
        const handleLocaleChange = (e: Event) => {
            const customEvent = e as CustomEvent<{ locale: Locale }>;
            setCurrentLocale(customEvent.detail.locale);
        };

        window.addEventListener('localeChange', handleLocaleChange);
        return () => window.removeEventListener('localeChange', handleLocaleChange);
    }, []);

    const toggleLanguage = () => {
        const newLocale: Locale = currentLocale === 'vi' ? 'en' : 'vi';
        setLocale(newLocale);
        setCurrentLocale(newLocale);

        // Call the onSwitch callback if provided
        onSwitch?.();

        // Reload the page to apply translations everywhere
        window.location.reload();
    };

    const nextLocale: Locale = currentLocale === 'vi' ? 'en' : 'vi';

    if (variant === 'menu-item') {
        return (
            <button
                onClick={toggleLanguage}
                className={`user-menu-item language-switcher-menu-item ${className}`}
                aria-label={`Switch to ${LANGUAGE_LABELS[nextLocale]}`}
            >
                {showIcon && <Globe size={16} />}
                <span>
                    {LANGUAGE_FLAGS[nextLocale]} {LANGUAGE_LABELS[nextLocale]}
                </span>
            </button>
        );
    }

    return (
        <button
            onClick={toggleLanguage}
            className={`language-switcher ${className}`}
            aria-label={`Switch to ${LANGUAGE_LABELS[nextLocale]}`}
            title={`Switch to ${LANGUAGE_LABELS[nextLocale]}`}
        >
            {showIcon && <Globe size={16} />}
            <span>{LANGUAGE_FLAGS[currentLocale]}</span>
            {showLabel && <span>{LANGUAGE_LABELS[currentLocale]}</span>}
        </button>
    );
}

export default LanguageSwitcher;
