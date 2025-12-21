
import { useState, useRef, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { t } from '@/i18n';
import "./ContactButton.css";
import facebookIcon from '@/assets/social-icon/facebook.svg?url';
import twitterIcon from '@/assets/social-icon/twitter.svg?url';
import instagramIcon from '@/assets/social-icon/instagram.svg?url';
import tiktokIcon from '@/assets/social-icon/tiktok.svg?url';

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
    const [isShaking, setIsShaking] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const isAuthPage =
        location.pathname === "/signin" || location.pathname === "/signup";

    useEffect(() => {
        if (isAuthPage) return;

        const interval = setInterval(() => {
            setIsShaking(true);
            setTimeout(() => setIsShaking(false), 3000);
        }, 13000);

        return () => clearInterval(interval);
    }, [isAuthPage]);

    if (isAuthPage) {
        return null;
    }

    return (
        <>
            <div ref={containerRef} className="contact-button-container">
                <button
                    className={`contact-button ${isShaking ? "bloom" : ""}`}
                    aria-label="Contact"
                    data-contact-button="true"
                >
                <span className={`contact-button-text ${isShaking ? "shaking" : ""}`}>
                    {t('common.contact')}
                </span>
            </button>

            <div className="contact-social-menu">
                    {authorInfo.social.facebook && (
                        <a
                            href={authorInfo.social.facebook}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="contact-social-icon facebook"
                            aria-label="Facebook"
                        >
                            <img src={facebookIcon} alt="Facebook" />
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
                            <img src={twitterIcon} alt="Twitter" />
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
                            <img src={instagramIcon} alt="Instagram" />
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
                            <img src={tiktokIcon} alt="TikTok" />
                        </a>
                    )}
                </div>
            </div>
        </>
    );
};

export default ContactButton;
