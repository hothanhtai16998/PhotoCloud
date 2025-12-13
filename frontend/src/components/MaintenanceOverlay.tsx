import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { appConfig } from '@/config/appConfig';

interface MaintenanceOverlayProps {
  isEnabled: boolean;
}

export function MaintenanceOverlay({ isEnabled }: MaintenanceOverlayProps) {
  const location = useLocation();
  const isAdmin = typeof window !== 'undefined' && (
    sessionStorage.getItem(appConfig.storage.adminKey) === 'true' || 
    localStorage.getItem(appConfig.storage.adminKey) === 'true'
  );

  useEffect(() => {
    if (!isEnabled) return;
    if (location.pathname.startsWith('/admin') || location.pathname.startsWith('/maintenance')) {
      return; // Allow admins to access admin panel even during maintenance
    }
    if (isAdmin) return; // Admins can access the site

    // Show maintenance message
    const maintenanceMessage = document.createElement('div');
    maintenanceMessage.id = 'maintenance-overlay';
    maintenanceMessage.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.95);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 99999;
      font-size: 1.5rem;
      text-align: center;
      padding: 2rem;
    `;
    maintenanceMessage.innerHTML = `
      <div>
        <h1 style="font-size: 2.5rem; margin-bottom: 1rem;">🚧 Bảo trì hệ thống</h1>
        <p>Website đang được bảo trì. Vui lòng quay lại sau.</p>
      </div>
    `;
    document.body.appendChild(maintenanceMessage);

    return () => {
      const overlay = document.getElementById('maintenance-overlay');
      if (overlay) overlay.remove();
    };
  }, [isEnabled, location.pathname, isAdmin]);

  return null;
}

