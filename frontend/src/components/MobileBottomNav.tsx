import { useLocation, useNavigate } from 'react-router-dom';
import { Bell, CalendarDays, Home, Search } from 'lucide-react';
import { useAuthStore } from '@/stores/useAuthStore';

import { openBookingModal } from '@/utils/bookingModalEvent';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useEffect, useState } from 'react';
import './MobileBottomNav.css';

interface NavItem {
    id: string;
    label: string;
    icon: typeof Home;
    to?: string;
    action?: () => void;
    /** Show only when authenticated */
    authOnly?: boolean;
    /** Show only when NOT authenticated */
    guestOnly?: boolean;
    /** Active if pathname matches this exact route (or prefix) */
    activeMatch?: (pathname: string) => boolean;
}

export function MobileBottomNav() {
    const isMobile = useIsMobile();
    const location = useLocation();
    const navigate = useNavigate();
    const accessToken = useAuthStore((state) => state.accessToken);

    const [modalOpen, setModalOpen] = useState(false);

    /**
     * Ẩn bottom nav khi:
     *  - Không phải mobile
     *  - Đang ở trang admin
     *  - Đang ở trang auth (signin/signup/callback)
     *  - Có modal global mở (booking, upload, image viewer)
     */
    useEffect(() => {
        const checkModal = () => {
            const isModalOpen = document.body.style.overflow === 'hidden';
            setModalOpen(isModalOpen);
        };
        checkModal();
        const observer = new MutationObserver(checkModal);
        observer.observe(document.body, { attributes: true, attributeFilter: ['style'] });
        return () => observer.disconnect();
    }, []);

    if (!isMobile) return null;
    if (location.pathname.startsWith('/admin')) return null;
    if (
        location.pathname.startsWith('/signin') ||
        location.pathname.startsWith('/signup') ||
        location.pathname.startsWith('/auth/google/callback')
    ) {
        return null;
    }
    if (modalOpen) return null;

    const isAuthed = Boolean(accessToken);


    const items: NavItem[] = [
        {
            id: 'home',
            label: 'Trang chủ',
            icon: Home,
            to: '/',
            activeMatch: (pathname) => pathname === '/' || pathname.startsWith('/t/'),
        },
        {
            id: 'explore',
            label: 'Khám phá',
            icon: Search,
            action: () => {
                // Open search bar — focus existing search input if available
                const input = document.querySelector<HTMLInputElement>('.PHOTOCLOUD-header .search-input');
                if (input) {
                    input.focus();
                    input.scrollIntoView({ behavior: 'smooth', block: 'center' });
                } else {
                    navigate('/');
                    setTimeout(() => {
                        document.querySelector<HTMLInputElement>('.PHOTOCLOUD-header .search-input')?.focus();
                    }, 200);
                }
            },
        },
        {
            id: 'booking',
            label: 'Đặt lịch',
            icon: CalendarDays,
            action: openBookingModal,
        },
        {
            id: 'notifications',
            label: 'Thông báo',
            icon: Bell,
            to: '/notifications',
            authOnly: true,
            activeMatch: (pathname) => pathname === '/notifications',
        },
        {
            id: 'my-bookings',
            label: 'Lịch của tôi',
            icon: CalendarDays,
            to: '/my-bookings',
            authOnly: true,
            activeMatch: (pathname) => pathname === '/my-bookings' || pathname.startsWith('/booking/'),
        },
    ];

    const visibleItems = items.filter((item) => {
        if (item.authOnly && !isAuthed) return false;
        if (item.guestOnly && isAuthed) return false;
        return true;
    });

    return (
        <nav className="mobile-bottom-nav" role="navigation" aria-label="Điều hướng chính">
            <ul className="mobile-bottom-nav-list">
                {visibleItems.map((item) => (
                    <BottomNavButton
                        key={item.id}
                        item={item}
                        active={item.activeMatch?.(location.pathname) ?? false}
                        onNavigate={() => {
                            if (item.action) {
                                item.action();
                            } else if (item.to) {
                                if (location.pathname !== item.to) {
                                    navigate(item.to);
                                } else {
                                    // Tap lại vào cùng route → scroll to top
                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                }
                            }
                        }}
                    />
                ))}
            </ul>
            {/* Spacer phía dưới để nội dung không bị che */}
            <div className="mobile-bottom-nav-spacer" aria-hidden="true" />
        </nav>
    );
}

function BottomNavButton({
    item,
    active,
    onNavigate,
}: {
    item: NavItem;
    active: boolean;
    onNavigate: () => void;
}) {
    const Icon = item.icon;
    return (
        <li>
            <button
                type="button"
                className={`mobile-bottom-nav-item ${active ? 'is-active' : ''}`}
                onClick={onNavigate}
                aria-current={active ? 'page' : undefined}
                aria-label={item.label}
            >
                <span className="mobile-bottom-nav-icon">
                    <Icon size={20} strokeWidth={active ? 2.4 : 1.8} />
                </span>
                <span className="mobile-bottom-nav-label">{item.label}</span>
            </button>
        </li>
    );
}

export default MobileBottomNav;
