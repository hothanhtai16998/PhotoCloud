import { memo } from 'react';
import './HeaderMarquee.css';

const MARQUEE_WORDS = [
    'CHỤP ẢNH CHÂN DUNG',
    'COUPLE SESSION',
    'GIA ĐÌNH',
    'MINI SESSION',
    'WEDDING',
    'EDITORIAL',
    'CHỤP ẢNH DOANH NGHIỆP',
    'BOOKING NHANH',
];

/**
 * HeaderMarquee — sits as a fixed ribbon directly under the fixed <Header />
 * (top: var(--header-height)). It fills the white space that was previously
 * empty padding on .app-body so the page content never starts with a gap.
 *
 * - Position: fixed; top: var(--header-height) so it always sits flush
 *   against the bottom of the header (no gap).
 * - Width: 100vw; full-bleed, not constrained by .app-body.
 * - Z-index: below the header but above page content so the marquee
 *   stays in place when the page scrolls.
 * - Responsive: uses --header-height which is overridden at <=768px to
 *   86px, so the ribbon follows the header on mobile.
 */
export const HeaderMarquee = memo(function HeaderMarquee() {
    return (
        <div className="header-marquee" aria-hidden="true">
            <div className="header-marquee-track">
                {[...MARQUEE_WORDS, ...MARQUEE_WORDS].map((word, i) => (
                    <span key={i}>
                        {word}
                        <span className="dot" />
                    </span>
                ))}
            </div>
        </div>
    );
});

export default HeaderMarquee;
