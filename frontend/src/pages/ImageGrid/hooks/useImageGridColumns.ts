import { useState, useEffect } from 'react';
import { appConfig } from '@/config/appConfig';

export function useImageGridColumns() {
    const [columnCount, setColumnCount] = useState(() => {
        if (typeof window === 'undefined') return 3;
        const width = window.innerWidth;
        if (width < appConfig.mobileBreakpoint) return 1; // Mobile: 1 column
        if (width < appConfig.breakpoints.lg) return 2; // Tablet: 2 columns
        return 3; // Desktop: 3 columns
    });

    // Update column count based on viewport size
    useEffect(() => {
        const updateColumnCount = () => {
            const width = window.innerWidth;
            if (width < appConfig.mobileBreakpoint) {
                setColumnCount(1); // Mobile: 1 column
            } else if (width < appConfig.breakpoints.lg) {
                setColumnCount(2); // Tablet: 2 columns
            } else {
                setColumnCount(3); // Desktop: 3 columns
            }
        };

        updateColumnCount();
        window.addEventListener('resize', updateColumnCount);
        return () => window.removeEventListener('resize', updateColumnCount);
    }, []);

    return columnCount;
}

