/**
 * Utility functions to apply appearance settings to the site
 */

/**
 * Convert hex color to HSL format (for CSS variables)
 * Returns HSL string like "271 79% 47%"
 */
function hexToHsl(hex: string): string {
    // Remove # if present
    hex = hex.replace('#', '');
    
    // Parse RGB
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        
        switch (max) {
            case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
            case g: h = ((b - r) / d + 2) / 6; break;
            case b: h = ((r - g) / d + 4) / 6; break;
        }
    }

    h = Math.round(h * 360);
    s = Math.round(s * 100);
    const lPercent = Math.round(l * 100);

    return `${h} ${s}% ${lPercent}%`;
}

/**
 * Apply appearance settings to the document
 */
export function applyAppearanceSettings(settings: {
    themePrimaryColor?: string;
    themeSecondaryColor?: string;
    themeAccentColor?: string;
    themeSuccessColor?: string;
    themeWarningColor?: string;
    themeErrorColor?: string;
    themeInfoColor?: string;
    borderRadius?: string;
    animationsEnabled?: boolean;
    animationSpeed?: string;
    buttonStyle?: string;
    cardStyle?: string;
    darkModeEnabled?: boolean;
    darkModeDefault?: string;
    customCSS?: string;
    fontFamily?: string;
    fontSize?: string;
    defaultViewMode?: string;
    homepageLayout?: string;
}) {
    const root = document.documentElement;
    
    // Debug logging (only in development)
    if (import.meta.env.DEV) {
        console.log('[Appearance Settings] Applying settings:', {
            themePrimaryColor: settings.themePrimaryColor,
            borderRadius: settings.borderRadius,
            animationsEnabled: settings.animationsEnabled,
            customCSS: settings.customCSS ? `${settings.customCSS.substring(0, 50)}...` : undefined,
        });
    }

    // Apply theme colors (convert hex to HSL)
    if (settings.themePrimaryColor) {
        try {
            const hsl = hexToHsl(settings.themePrimaryColor);
            root.style.setProperty('--primary', hsl);
            // Update ring color to match primary
            root.style.setProperty('--ring', hsl);
            // Also update homepage color variables if they exist
            // Note: These are separate from --primary but some components use them
            // We keep them in sync for consistency
            if (import.meta.env.DEV) {
                console.log('[Appearance Settings] Applied primary color:', settings.themePrimaryColor, '->', hsl);
                // Verify it was set
                const computed = getComputedStyle(root).getPropertyValue('--primary').trim();
                console.log('[Appearance Settings] Verified --primary CSS variable:', computed);
            }
        } catch (error) {
            console.error('[Appearance Settings] Failed to apply primary color:', error);
        }
    }

    if (settings.themeSecondaryColor) {
        try {
            const hsl = hexToHsl(settings.themeSecondaryColor);
            root.style.setProperty('--secondary', hsl);
        } catch (error) {
            console.error('[Appearance Settings] Failed to apply secondary color:', error);
        }
    }

    if (settings.themeAccentColor) {
        try {
            const hsl = hexToHsl(settings.themeAccentColor);
            root.style.setProperty('--accent', hsl);
        } catch (error) {
            console.error('[Appearance Settings] Failed to apply accent color:', error);
        }
    }

    // Apply status colors
    if (settings.themeSuccessColor) {
        try {
            const hsl = hexToHsl(settings.themeSuccessColor);
            root.style.setProperty('--success', hsl);
            // Also update --online for status indicators (keep them in sync)
            root.style.setProperty('--online', hsl);
            if (import.meta.env.DEV) {
                console.log('[Appearance Settings] Applied success color:', settings.themeSuccessColor, '->', hsl);
            }
        } catch (error) {
            console.error('[Appearance Settings] Failed to apply success color:', error);
        }
    }

    if (settings.themeWarningColor) {
        try {
            const hsl = hexToHsl(settings.themeWarningColor);
            root.style.setProperty('--warning', hsl);
            if (import.meta.env.DEV) {
                console.log('[Appearance Settings] Applied warning color:', settings.themeWarningColor, '->', hsl);
            }
        } catch (error) {
            console.error('[Appearance Settings] Failed to apply warning color:', error);
        }
    }

    if (settings.themeErrorColor) {
        try {
            const hsl = hexToHsl(settings.themeErrorColor);
            root.style.setProperty('--destructive', hsl);
            if (import.meta.env.DEV) {
                console.log('[Appearance Settings] Applied error color:', settings.themeErrorColor, '->', hsl);
            }
        } catch (error) {
            console.error('[Appearance Settings] Failed to apply error color:', error);
        }
    }

    if (settings.themeInfoColor) {
        try {
            const hsl = hexToHsl(settings.themeInfoColor);
            root.style.setProperty('--info', hsl);
            if (import.meta.env.DEV) {
                console.log('[Appearance Settings] Applied info color:', settings.themeInfoColor, '->', hsl);
            }
        } catch (error) {
            console.error('[Appearance Settings] Failed to apply info color:', error);
        }
    }

    // Apply border radius
    if (settings.borderRadius) {
        root.style.setProperty('--radius', settings.borderRadius);
        if (import.meta.env.DEV) {
            console.log('[Appearance Settings] Applied border radius:', settings.borderRadius);
        }
    }

    // Apply animations
    if (settings.animationsEnabled === false) {
        root.style.setProperty('--transition-smooth', 'none');
        root.style.setProperty('--transition-bounce', 'none');
        // Disable all transitions
        const style = document.createElement('style');
        style.id = 'disable-animations';
        style.textContent = `
            *, *::before, *::after {
                animation-duration: 0s !important;
                animation-delay: 0s !important;
                transition-duration: 0s !important;
                transition-delay: 0s !important;
            }
        `;
        if (!document.getElementById('disable-animations')) {
            document.head.appendChild(style);
        }
    } else {
        // Remove animation disable style if it exists
        const disableStyle = document.getElementById('disable-animations');
        if (disableStyle) {
            disableStyle.remove();
        }
        
        // Apply animation speed
        if (settings.animationSpeed) {
            let duration = '0.3s';
            if (settings.animationSpeed === 'fast') duration = '0.15s';
            else if (settings.animationSpeed === 'slow') duration = '0.6s';
            root.style.setProperty('--transition-smooth', `all ${duration} cubic-bezier(0.4, 0, 0.2, 1)`);
        }
    }

    // Apply font family
    if (settings.fontFamily) {
        root.style.setProperty('font-family', settings.fontFamily === 'System' 
            ? '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
            : `"${settings.fontFamily}", sans-serif`);
    }

    // Apply font size
    if (settings.fontSize) {
        root.style.setProperty('font-size', settings.fontSize);
    }

    // Apply custom CSS
    let customStyleElement = document.getElementById('custom-appearance-css');
    if (settings.customCSS) {
        if (!customStyleElement) {
            customStyleElement = document.createElement('style');
            customStyleElement.id = 'custom-appearance-css';
            document.head.appendChild(customStyleElement);
        }
        customStyleElement.textContent = settings.customCSS;
    } else {
        // Remove custom CSS if empty
        if (customStyleElement) {
            customStyleElement.remove();
        }
    }

    // Apply button style (add data attribute for CSS targeting)
    if (settings.buttonStyle) {
        root.setAttribute('data-button-style', settings.buttonStyle);
    }

    // Apply card style (add data attribute for CSS targeting)
    if (settings.cardStyle) {
        root.setAttribute('data-card-style', settings.cardStyle);
    }
    
    // Final verification log
    if (import.meta.env.DEV) {
        console.log('[Appearance Settings] Settings applied successfully');
        console.log('[Appearance Settings] To verify, run: verifyAppearanceSettings()');
    }
}

/**
 * Remove all applied appearance settings (reset to defaults)
 */
export function resetAppearanceSettings() {
    const root = document.documentElement;
    
    // Remove custom CSS
    const customStyle = document.getElementById('custom-appearance-css');
    if (customStyle) {
        customStyle.remove();
    }

    // Remove animation disable
    const disableAnimations = document.getElementById('disable-animations');
    if (disableAnimations) {
        disableAnimations.remove();
    }

    // Remove data attributes
    root.removeAttribute('data-button-style');
    root.removeAttribute('data-card-style');

    // Reset CSS variables to defaults (they'll use the CSS file defaults)
    root.style.removeProperty('--primary');
    root.style.removeProperty('--secondary');
    root.style.removeProperty('--accent');
    root.style.removeProperty('--success');
    root.style.removeProperty('--online');
    root.style.removeProperty('--warning');
    root.style.removeProperty('--destructive');
    root.style.removeProperty('--info');
    root.style.removeProperty('--radius');
    root.style.removeProperty('--transition-smooth');
    root.style.removeProperty('font-family');
    root.style.removeProperty('font-size');
}

