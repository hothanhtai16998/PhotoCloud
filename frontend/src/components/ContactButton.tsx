
import { useState, useRef, useEffect } from "react";
import { Facebook, Twitter, Instagram } from "lucide-react";
import { useLocation } from "react-router-dom";
import { t } from '@/i18n';
import { timingConfig } from '@/config/timingConfig';
import "./ContactButton.css";

interface AuthorInfo {
    social: {
        facebook?: string;
        twitter?: string;
        instagram?: string;
        tiktok?: string;
    };
}

const authorInfo: AuthorInfo = {
    social: {
        facebook: "https://www.facebook.com/dominhhung2003",
        twitter: "https://twitter.com",
        instagram: "https://instagram.com",
        tiktok: "https://www.tiktok.com/@runtapchupanh?_r=1&_d=secCgYIASAHKAESPgo8CcNaTtIGK3YCOxlsy9ZE8XQCCg0%2BKdOX39i2rrLZzXsZHvN8IcPz1wc1odal1PBFmJ1pOysKCoAfiVZGGgA%3D&_svg=1&checksum=d4af0892724a5a3444770cbcead4ce81d1e1e7df1",
    },
};

export const ContactButton = () => {
    const location = useLocation();
    const [isOpen, setIsOpen] = useState(false);
    const [isShaking, setIsShaking] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const isAuthPage =
        location.pathname === "/signin" || location.pathname === "/signup";

    useEffect(() => {
        if (isAuthPage) return;

        const interval = setInterval(() => {
            setIsShaking(true);
            setTimeout(() => setIsShaking(false), timingConfig.animation.contactButtonShakeDurationMs);
        }, timingConfig.animation.contactButtonShakeIntervalMs);

        return () => clearInterval(interval);
    }, [isAuthPage]);

    useEffect(() => {
        if (!isOpen) return;

        const handleClickOutside = (event: MouseEvent) => {
            if (
                containerRef.current &&
                !containerRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isOpen]);

    if (isAuthPage) {
        return null;
    }

    return (
        <div ref={containerRef} className="contact-button-container">
            <button
                className={`contact-button ${isOpen ? "active" : ""} ${isShaking ? "bloom" : ""}`}
                onClick={() => setIsOpen(!isOpen)}
                aria-label="Contact"
            >
                <span className={`contact-button-text ${isShaking ? "shaking" : ""}`}>
                    {t('common.contact')}
                </span>
            </button>

            {isOpen && (
                <div className="contact-social-menu">
                    {authorInfo.social.facebook && (
                        <a
                            href={authorInfo.social.facebook}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="contact-social-icon facebook"
                            aria-label="Facebook"
                        >
                            <Facebook size={24} />
                        </a>
                    )}
                    {authorInfo.social.twitter && (
                        <a
                            href={authorInfo.social.twitter}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="contact-social-icon twitter"
                            aria-label="Twitter"
                        >
                            <Twitter size={24} />
                        </a>
                    )}
                    {authorInfo.social.instagram && (
                        <a
                            href={authorInfo.social.instagram}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="contact-social-icon instagram"
                            aria-label="Instagram"
                        >
                            <Instagram size={24} />
                        </a>
                    )}
                    {authorInfo.social.tiktok && (
                        <a
                            href={authorInfo.social.tiktok}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="contact-social-icon tiktok"
                            aria-label="TikTok"
                        >
                            <TikTokIcon size={24} />
                        </a>
                    )}
                </div>
            )}
        </div>
    );
};

const TikTokIcon = ({ size = 24 }: { size?: number }) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="currentColor"
        xmlns="http://www.w3.org/2000/svg"
    >
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.68v13.7a2.85 2.85 0 1 1-5.92-2.46 2.88 2.88 0 0 1 2.31 1.39V9.4a6.53 6.53 0 1 0 5.63 6.51V8.07a8.62 8.62 0 0 0 5.43 1.94v-3.32z" />
    </svg>
);

export default ContactButton;
