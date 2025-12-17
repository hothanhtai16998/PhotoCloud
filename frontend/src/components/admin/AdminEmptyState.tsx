import type { ComponentType } from 'react';
import { Button } from '@/components/ui/button';
import './AdminEmptyState.css';

interface AdminEmptyStateProps {
    icon?: ComponentType<{ size?: number }>;
    title: string;
    description?: string;
    actionLabel?: string;
    onAction?: () => void;
}

export function AdminEmptyState({ 
    icon: Icon, 
    title, 
    description, 
    actionLabel, 
    onAction 
}: AdminEmptyStateProps) {
    return (
        <div className="admin-empty-state empty-state-enhanced">
            {Icon && (
                <div className="admin-empty-state-icon empty-state-icon">
                    <Icon size={120} />
                </div>
            )}
            <h3 className="admin-empty-state-title empty-state-title">{title}</h3>
            {description && (
                <p className="admin-empty-state-description empty-state-message">{description}</p>
            )}
            {actionLabel && onAction && (
                <div className="empty-state-action">
                    <Button onClick={onAction} variant="outline" className="admin-empty-state-action">
                        {actionLabel}
                    </Button>
                </div>
            )}
        </div>
    );
}

