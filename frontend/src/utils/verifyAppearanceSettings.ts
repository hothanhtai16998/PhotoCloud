/**
 * Utility to verify appearance settings are applied correctly
 * Call this in the browser console to check if settings are active
 */

export function verifyAppearanceSettings() {
    const root = document.documentElement;
    const computed = getComputedStyle(root);
    
    const checks = {
        primaryColor: computed.getPropertyValue('--primary').trim(),
        secondaryColor: computed.getPropertyValue('--secondary').trim(),
        accentColor: computed.getPropertyValue('--accent').trim(),
        borderRadius: computed.getPropertyValue('--radius').trim(),
        fontFamily: root.style.getPropertyValue('font-family') || computed.getPropertyValue('font-family'),
        fontSize: root.style.getPropertyValue('font-size') || computed.getPropertyValue('font-size'),
        customCSS: document.getElementById('custom-appearance-css') !== null,
        animationsDisabled: document.getElementById('disable-animations') !== null,
        buttonStyle: root.getAttribute('data-button-style'),
        cardStyle: root.getAttribute('data-card-style'),
    };
    
    console.log('=== Appearance Settings Verification ===');
    console.log('CSS Variables:');
    console.log('  --primary:', checks.primaryColor || '(not set)');
    console.log('  --secondary:', checks.secondaryColor || '(not set)');
    console.log('  --accent:', checks.accentColor || '(not set)');
    console.log('  --radius:', checks.borderRadius || '(not set)');
    console.log('\nFont Settings:');
    console.log('  font-family:', checks.fontFamily || '(not set)');
    console.log('  font-size:', checks.fontSize || '(not set)');
    console.log('\nOther Settings:');
    console.log('  Custom CSS injected:', checks.customCSS);
    console.log('  Animations disabled:', checks.animationsDisabled);
    console.log('  Button style:', checks.buttonStyle || '(not set)');
    console.log('  Card style:', checks.cardStyle || '(not set)');
    console.log('========================================');
    
    return checks;
}

// Make it available globally for easy testing
if (typeof window !== 'undefined') {
    (window as any).verifyAppearanceSettings = verifyAppearanceSettings;
}

