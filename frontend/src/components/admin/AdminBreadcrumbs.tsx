import { ChevronRight, Home } from 'lucide-react';
import { Link } from 'react-router-dom';
import { t } from '@/i18n';
import './AdminBreadcrumbs.css';

interface BreadcrumbItem {
    label: string;
    path?: string;
}

interface AdminBreadcrumbsProps {
    items: BreadcrumbItem[];
}

export function AdminBreadcrumbs({ items }: AdminBreadcrumbsProps) {
    return (
        <nav className="admin-breadcrumbs" aria-label="Breadcrumb">
            <ol className="admin-breadcrumbs-list">
                <li className="admin-breadcrumbs-item">
                    <Link to="/admin" className="admin-breadcrumbs-link">
                        <Home size={16} />
                        <span>{t('admin.dashboard')}</span>
                    </Link>
                </li>
                {items.map((item, index) => (
                    <li key={index} className="admin-breadcrumbs-item">
                        <ChevronRight size={16} className="admin-breadcrumbs-separator" />
                        {item.path ? (
                            <Link to={item.path} className="admin-breadcrumbs-link">
                                {item.label}
                            </Link>
                        ) : (
                            <span className="admin-breadcrumbs-current">{item.label}</span>
                        )}
                    </li>
                ))}
            </ol>
        </nav>
    );
}

