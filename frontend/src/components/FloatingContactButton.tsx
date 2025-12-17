import { useState, useRef, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Mail, Phone, MapPin, Globe, Linkedin, Github, Facebook, Twitter, X, Instagram } from "lucide-react";
import { t } from '@/i18n';
import "./FloatingContactButton.css";

// TikTok Icon Component (lucide-react doesn't have TikTok icon)
const TikTokIcon = ({ size = 20 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
    </svg>
);

// Author information
const authorInfo = {
    name: "PhotoApp Team",
    email: "contact@photoapp.com",
    phone: "+1 (555) 123-4567",
    address: "123 Photography Street, Creative City, CC 12345",
    website: "https://photoapp.com",
    bio: "Welcome to PhotoApp! We are passionate about photography and providing a platform for photographers and artists to share their beautiful work with the world.",
    social: {
        linkedin: "https://linkedin.com/company/photoapp",
        github: "https://github.com/photoapp",
        facebook: "https://www.facebook.com/dominhhung2003",
        twitter: "https://twitter.com/photoapp",
        instagram: "https://instagram.com/photoapp",
        tiktok: "https://www.tiktok.com/@runtapchupanh?_r=1&_d=secCgYIASAHKAESPgo8CcNaTtIGK3YCOxlsy9ZE8XQCCg0%2BKdOX39i2rrLZzXsZHvN8IcPz1wc1odal1PBFmJ1pOysKCoAfiVZGGgA%3D&_svg=1&checksum=d4af0892724a5a3444770cbcead4ce81d1e1e7df1ba613d6a009c01d37c7956d&item_author_type=1&sec_uid=MS4wLjABAAAAF1E1KZIixKzT6AUFWtl7ol2e6UCPrznChrx74TWzjISsk7EBXbuDkMIaVaTiLiy3&sec_user_id=MS4wLjABAAAAF1E1KZIixKzT6AUFWtl7ol2e6UCPrznChrx74TWzjISsk7EBXbuDkMIaVaTiLiy3&share_app_id=1180&share_author_id=7122849835637031963&share_link_id=890DD61E-C177-4E91-A4B9-550251E5FA96&share_region=VN&share_scene=1&sharer_language=vi&social_share_type=4&source=h5_t&timestamp=1764128350&tt_from=copy&u_code=e30e992e2jm9i2&ug_btm=b8727%2Cb0&user_id=7122849835637031963&utm_campaign=client_share&utm_medium=ios&utm_source=copy"
    }
};

function FloatingContactButton() {
    const location = useLocation();
    const [isOpen, setIsOpen] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        return () => {
            if (hoverTimeoutRef.current) {
                clearTimeout(hoverTimeoutRef.current);
            }
        };
    }, []);

    // Auto-expand on page load
    useEffect(() => {
        // Use setTimeout to make it asynchronous and avoid cascading renders
        const initTimeout = setTimeout(() => {
            setIsHovered(true);
            // Auto-shrink after 5 seconds if not hovered
            hoverTimeoutRef.current = setTimeout(() => {
                setIsHovered(false);
            }, 5000);
        }, 0);

        return () => {
            clearTimeout(initTimeout);
        };
    }, []);

    // Hide contact button on signin and signup pages
    // Must be after all hooks to follow Rules of Hooks
    const isAuthPage = location.pathname === '/signin' || location.pathname === '/signup';
    
    if (isAuthPage) {
        return null;
    }

    const handleMouseEnter = () => {
        setIsHovered(true);
        if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current);
            hoverTimeoutRef.current = null;
        }
    };

    const handleMouseLeave = () => {
        if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current);
        }
        hoverTimeoutRef.current = setTimeout(() => {
            setIsHovered(false);
        }, 5000);
    };

    return (
        <>
            <div className="uiverse-card-wrapper uiverse-card-variation">
                <div
                    className={`uiverse-card-v2 ${isHovered ? "hovered" : ""}`}
                    onClick={() => setIsOpen(true)}
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                >
                    <div className="uiverse-background-v2"></div>
                    <div className="uiverse-logo-v2">
                        <span className="uiverse-logo-text">{t('common.contact')}</span>
                    </div>
                    <div className="uiverse-box uiverse-box1">
                        <a href={authorInfo.social.instagram || "#"} target="_blank" rel="noopener noreferrer" className="uiverse-icon" onClick={(e) => e.stopPropagation()}>
                            <Instagram size={20} />
                        </a>
                    </div>
                    <div className="uiverse-box uiverse-box2">
                        <a href={authorInfo.social.facebook || "#"} target="_blank" rel="noopener noreferrer" className="uiverse-icon" onClick={(e) => e.stopPropagation()}>
                            <Facebook size={20} />
                        </a>
                    </div>
                    <div className="uiverse-box uiverse-box3">
                        <a href={authorInfo.social.tiktok || "#"} target="_blank" rel="noopener noreferrer" className="uiverse-icon" onClick={(e) => e.stopPropagation()}>
                            <TikTokIcon size={20} />
                        </a>
                    </div>
                    <div className="uiverse-box uiverse-box4">
                        <a href={authorInfo.social.github || "#"} target="_blank" rel="noopener noreferrer" className="uiverse-icon" onClick={(e) => e.stopPropagation()}>
                            <Github size={20} />
                        </a>
                    </div>
                </div>
            </div>

            {isOpen && (
                <div className="contact-modal-overlay" onClick={() => setIsOpen(false)}>
                    <div 
                        className="contact-modal" 
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="contact-modal-header">
                            <h2 className="contact-modal-title">Thông tin liên hệ</h2>
                            <button
                                className="contact-modal-close"
                                onClick={() => setIsOpen(false)}
                                aria-label="Close"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className="contact-modal-content">
                            <ContactInfoContent />
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

// Shared contact info content component
function ContactInfoContent() {
    return (
        <>
            <div className="contact-info-section">
                <div className="contact-item">
                    <div className="contact-icon">
                        <Mail size={20} />
                    </div>
                    <div className="contact-details">
                        <span className="contact-label">Email</span>
                        <a href={`mailto:${authorInfo.email}`} className="contact-value">
                            {authorInfo.email}
                        </a>
                    </div>
                </div>

                <div className="contact-item">
                    <div className="contact-icon">
                        <Phone size={20} />
                    </div>
                    <div className="contact-details">
                        <span className="contact-label">Điện thoại</span>
                        <a href={`tel:${authorInfo.phone}`} className="contact-value">
                            {authorInfo.phone}
                        </a>
                    </div>
                </div>

                <div className="contact-item">
                    <div className="contact-icon">
                        <MapPin size={20} />
                    </div>
                    <div className="contact-details">
                        <span className="contact-label">Địa chỉ</span>
                        <span className="contact-value">{authorInfo.address}</span>
                    </div>
                </div>

                <div className="contact-item">
                    <div className="contact-icon">
                        <Globe size={20} />
                    </div>
                    <div className="contact-details">
                        <span className="contact-label">Website</span>
                        <a
                            href={authorInfo.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="contact-value"
                        >
                            {authorInfo.website}
                        </a>
                    </div>
                </div>
            </div>

            <div className="contact-bio-section">
                <h3 className="contact-section-title">Giới thiệu</h3>
                <p className="contact-bio-text">{authorInfo.bio}</p>
            </div>

            <div className="contact-social-section">
                <h3 className="contact-section-title">Mạng xã hội</h3>
                <div className="contact-social-links">
                    {authorInfo.social.linkedin && (
                        <a
                            href={authorInfo.social.linkedin}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="contact-social-link"
                            aria-label="LinkedIn"
                        >
                            <Linkedin size={20} />
                            <span>LinkedIn</span>
                        </a>
                    )}
                    {authorInfo.social.github && (
                        <a
                            href={authorInfo.social.github}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="contact-social-link"
                            aria-label="GitHub"
                        >
                            <Github size={20} />
                            <span>GitHub</span>
                        </a>
                    )}
                    {authorInfo.social.facebook && (
                        <a
                            href={authorInfo.social.facebook}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="contact-social-link"
                            aria-label="Facebook"
                        >
                            <Facebook size={20} />
                            <span>Facebook</span>
                        </a>
                    )}
                    {authorInfo.social.twitter && (
                        <a
                            href={authorInfo.social.twitter}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="contact-social-link"
                            aria-label="Twitter"
                        >
                            <Twitter size={20} />
                            <span>Twitter</span>
                        </a>
                    )}
                </div>
            </div>
        </>
    );
}

export default FloatingContactButton;
