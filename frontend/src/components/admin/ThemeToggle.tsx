import { useState, useEffect } from 'react';
import { Moon, Sun } from 'lucide-react';
import { t } from '@/i18n';
import './ThemeToggle.css';

// Initialize theme on module load - force light theme for now
// TODO: Re-enable dark theme toggle in future if needed
(function initializeTheme() {
    // Force light theme - remove dark class if present
    document.documentElement.classList.remove('dark');
    // Clear any saved dark theme preference
    const saved = localStorage.getItem('theme');
    if (saved === 'dark') {
        localStorage.setItem('theme', 'light');
    }
    
    // Future: Uncomment below to restore dark theme support
    // const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    // const shouldBeDark = saved === 'dark' || (saved === null && prefersDark);
    // if (shouldBeDark) {
    //     document.documentElement.classList.add('dark');
    // } else {
    //     document.documentElement.classList.remove('dark');
    // }
})();

export function ThemeToggle() {
    // Force light theme for now - keeping code for future use
    // TODO: Re-enable dark theme toggle in future if needed
    const [isDark, setIsDark] = useState(() => {
        // Always return false to force light theme
        // Future: Uncomment below to restore dark theme support
        // const hasDarkClass = document.documentElement.classList.contains('dark');
        // if (hasDarkClass) {
        //     return true;
        // }
        // const saved = localStorage.getItem('theme');
        // return saved === 'dark';
        return false;
    });

    useEffect(() => {
        const root = document.documentElement;
        // Force light theme - always remove dark class
        root.classList.remove('dark');
        localStorage.setItem('theme', 'light');
        
        // Future: Uncomment below to restore dark theme support
        // if (isDark) {
        //     root.classList.add('dark');
        //     localStorage.setItem('theme', 'dark');
        // } else {
        //     root.classList.remove('dark');
        //     localStorage.setItem('theme', 'light');
        // }
    }, [isDark]);

    const toggleTheme = () => {
        setIsDark(prev => !prev);
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

