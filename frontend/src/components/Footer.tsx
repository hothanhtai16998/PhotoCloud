import { Link } from 'react-router-dom';
import { useRef, useState } from 'react';
import { newsletterService } from '@/services/newsletterService';
import { getErrorMessage } from '@/lib/utils';
import {
    Camera,
    Compass,
    Facebook,
    Send,
    Instagram,
    Linkedin,
    Mail,
    MessageSquare,
    Sparkles,
} from 'lucide-react';
import { BRAND } from '@/constants/brand';
import { TextLogo } from './TextLogo';
import { WebSocketStatus } from './WebSocketStatus';
import './Footer.css';

const STUDIO_LINKS = [
    { label: 'Gói chụp', to: '/packages' },
    { label: 'Đặt lịch', to: '/booking' },
    { label: 'Quy trình', to: '/#how-it-works' },
    { label: 'Liên hệ', to: '/contact' },
];

const EXPLORE_LINKS = [
    { label: 'Trang chủ', to: '/' },
    { label: 'Bộ sưu tập', to: '/collections' },
    { label: 'Yêu thích', to: '/favorites' },
    { label: 'Lịch sử tải xuống', to: '/downloads' },
];

const ABOUT_LINKS = [
    { label: 'Về chúng tôi', to: '/about' },
    { label: 'Tuyển dụng', to: '/contact?subject=Tuyển%20dụng' },
    { label: 'Điều khoản', to: '/about#terms' },
    { label: 'Bảo mật', to: '/about#privacy' },
];

interface FooterProps {
    /** Tùy chọn: thu gọn (chỉ 1 dòng) cho trang auth/admin */
    compact?: boolean;
}

export function Footer({ compact = false }: FooterProps) {
    const year = new Date().getFullYear();
    const [newsletterBusy, setNewsletterBusy] = useState(false);
    const newsletterPending = useRef(false);
    const [newsletterMessage, setNewsletterMessage] = useState('');
    const [newsletterError, setNewsletterError] = useState(false);

    if (compact) {
        return (
            <footer className="studio-footer studio-footer--compact" role="contentinfo">
                <div className="studio-footer-container">
                    <p>© {year} {BRAND.nameLong}. {BRAND.subTagline}.</p>
                </div>
            </footer>
        );
    }

    return (
        <footer className="studio-footer" role="contentinfo">
            <div className="studio-footer-container">
                <div className="studio-footer-grid">
                    {/* Brand column */}
                    <section className="studio-footer-brand">
                        <Link to="/" className="studio-footer-logo" aria-label={BRAND.name}>
                            <TextLogo text={BRAND.name} fontWeight={600} />
                        </Link>
                        <p className="studio-footer-tagline">{BRAND.tagline}</p>
                        <p className="studio-footer-subtagline">{BRAND.subTagline}</p>
                        <div className="studio-footer-social">
                            <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
                                <Facebook size={16} />
                            </a>
                            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                                <Instagram size={16} />
                            </a>
                            <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
                                <Linkedin size={16} />
                            </a>
                            <a href="https://tiktok.com" target="_blank" rel="noopener noreferrer" aria-label="TikTok">
                                <MessageSquare size={16} />
                            </a>
                        </div>
                    </section>

                    {/* Studio column */}
                    <section className="studio-footer-section">
                        <h3>
                            <Camera size={14} /> Studio
                        </h3>
                        <ul>
                            {STUDIO_LINKS.map((link) => (
                                <li key={link.to + link.label}>
                                    <Link to={link.to}>{link.label}</Link>
                                </li>
                            ))}
                        </ul>
                    </section>

                    {/* Explore column */}
                    <section className="studio-footer-section">
                        <h3>
                            <Compass size={14} /> Khám phá
                        </h3>
                        <ul>
                            {EXPLORE_LINKS.map((link) => (
                                <li key={link.to + link.label}>
                                    <Link to={link.to}>{link.label}</Link>
                                </li>
                            ))}
                        </ul>
                    </section>

                    {/* About column */}
                    <section className="studio-footer-section">
                        <h3>
                            <Sparkles size={14} /> {BRAND.name}
                        </h3>
                        <ul>
                            {ABOUT_LINKS.map((link) => (
                                <li key={link.to + link.label}>
                                    <Link to={link.to}>{link.label}</Link>
                                </li>
                            ))}
                        </ul>
                    </section>

                    {/* Newsletter column */}
                    <section className="studio-footer-section studio-footer-newsletter">
                        <h3>
                            <Mail size={14} /> Nhận tin từ studio
                        </h3>
                        <p>Nhận mẹo chụp ảnh và tin từ studio. Xác nhận qua email trước khi nhận tin; bạn có thể hủy bất cứ lúc nào.</p>
                        <form
                            className="studio-footer-newsletter-form"
                            onSubmit={async (event) => {
                                event.preventDefault();
                                if (newsletterPending.current) return;
                                const target = event.currentTarget;
                                const input = target.querySelector('input[type="email"]') as HTMLInputElement | null;
                                if (input?.value.trim()) {
                                    newsletterPending.current = true;
                                    setNewsletterBusy(true);
                                    setNewsletterMessage('');
                                    setNewsletterError(false);
                                    try {
                                        const response = await newsletterService.subscribe(input.value.trim());
                                        setNewsletterMessage(response.message);
                                        target.reset();
                                    } catch (error) {
                                        setNewsletterError(true);
                                        setNewsletterMessage(getErrorMessage(error, 'Chưa đăng ký được. Vui lòng thử lại.'));
                                    } finally {
                                        newsletterPending.current = false;
                                        setNewsletterBusy(false);
                                    }
                                }
                            }}
                        >
                            <input type="email" placeholder="you@example.com" aria-label="Email đăng ký" maxLength={254} disabled={newsletterBusy} required />
                            <button type="submit" disabled={newsletterBusy} aria-busy={newsletterBusy} aria-label={newsletterBusy ? 'Đang gửi yêu cầu' : 'Đăng ký nhận tin'} title="Đăng ký nhận tin">
                                <Send size={18} />
                            </button>
                        </form>
                        {newsletterMessage && <p role={newsletterError ? 'alert' : 'status'}>{newsletterMessage}</p>}
                    </section>
                </div>

                <div className="studio-footer-divider" />

                <div className="studio-footer-meta">
                    <WebSocketStatus />
                    <p>© {year} {BRAND.nameLong}. Đã đăng ký bản quyền.</p>
                    <p className="studio-footer-meta-sub">
                        Ảnh minh họa sử dụng từ PHOTOCLOUD theo giấy phép PHOTOCLOUD License. {BRAND.subTagline}.
                    </p>
                </div>
            </div>
        </footer>
    );
}

export default Footer;
