import { useState, useEffect } from 'react';
import { Moon, Sun } from 'lucide-react';
import { t } from '@/i18n';
import './ThemeToggle.css';

// Initialize theme on module load - default to light
(function initializeTheme() {
    const saved = localStorage.getItem('theme');
    // Check system preference if no saved theme
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    // Only use dark if explicitly saved as 'dark', otherwise check system preference
    const shouldBeDark = saved === 'dark' || (saved === null && prefersDark);
    
    if (shouldBeDark) {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
})();

export function ThemeToggle() {
    const [isDark, setIsDark] = useState(() => {
        const saved = localStorage.getItem('theme');
        // Only return true if explicitly saved as 'dark', otherwise default to light (false)
        return saved === 'dark';
    });

    useEffect(() => {
        const root = document.documentElement;
        if (isDark) {
            root.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            root.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    }, [isDark]);

    const toggleTheme = () => {
        setIsDark(!isDark);
    };

    return (
        <button
            onClick={toggleTheme}
            className="theme-toggle-btn"
            aria-label={isDark ? t('theme.switchToLight') : t('theme.switchToDark')}
            title={isDark ? t('theme.switchToLight') : t('theme.switchToDark')}
            type="button"
        >
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
        </button>
    );
}

