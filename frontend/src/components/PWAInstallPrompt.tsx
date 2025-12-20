import { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PWAInstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [showPrompt, setShowPrompt] = useState(false);
    const [isInstalled, setIsInstalled] = useState(false);

    useEffect(() => {
        // Check if app is already installed
        if (window.matchMedia('(display-mode: standalone)').matches) {
            setIsInstalled(true);
            return;
        }

        // Check if app was installed before (localStorage)
        const wasInstalled = localStorage.getItem('pwa-installed');
        if (wasInstalled === 'true') {
            setIsInstalled(true);
            return;
        }

        // Listen for beforeinstallprompt event
        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);
            
            // Show prompt after a delay (don't be too aggressive)
            setTimeout(() => {
                setShowPrompt(true);
            }, 3000); // Show after 3 seconds
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
    }, []);

    const handleInstall = async () => {
        if (!deferredPrompt) return;

        try {
            // Show the install prompt
            await deferredPrompt.prompt();
            
            // Wait for user's response
            const { outcome } = await deferredPrompt.userChoice;
            
            if (outcome === 'accepted') {
                toast.success('App installed successfully!');
                localStorage.setItem('pwa-installed', 'true');
                setIsInstalled(true);
            } else {
                toast.info('Installation cancelled');
            }
            
            // Clear the deferred prompt
            setDeferredPrompt(null);
            setShowPrompt(false);
        } catch {
            toast.error('Failed to install app');
        }
    };

    const handleDismiss = () => {
        setShowPrompt(false);
        // Don't show again for this session
        sessionStorage.setItem('pwa-prompt-dismissed', 'true');
    };

    // Don't show if already installed or dismissed this session
    if (isInstalled || !showPrompt || !deferredPrompt) {
        return null;
    }

    if (sessionStorage.getItem('pwa-prompt-dismissed') === 'true') {
        return null;
    }

    return (
        <div
            style={{
                position: 'fixed',
                bottom: '20px',
                left: '50%',
                transform: 'translateX(-50%)',
                backgroundColor: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: '12px',
                padding: '16px',
                boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
                zIndex: 1000,
                maxWidth: '400px',
                width: '90%',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
            }}
        >
            <Download size={24} style={{ color: '#667eea', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, marginBottom: '4px', fontSize: '14px' }}>
                    Install PhotoCloud
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>
                    Add to home screen for quick access
                </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
                <Button
                    onClick={handleInstall}
                    size="sm"
                    style={{ backgroundColor: '#667eea', color: 'white' }}
                >
                    Install
                </Button>
                <button
                    onClick={handleDismiss}
                    style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '4px',
                        display: 'flex',
                        alignItems: 'center',
                    }}
                    aria-label="Dismiss"
                >
                    <X size={18} style={{ color: '#6b7280' }} />
                </button>
            </div>
        </div>
    );
}

