import React, { type ReactNode, type Ref } from 'react';
import { ArrowDown, ArrowRight, MoveUpRight } from 'lucide-react';
import { CORE_PACKAGES } from '../../constants/packages';
import { DataLoadingFrame } from '../../components/user/DataLoadingFrame';

function StaticPhoto({ category, className }: { category: 'portrait' | 'family'; className: string }) {
    const src = CORE_PACKAGES.find(pkg => pkg.accent === category)?.coverUrl;
    return src ? React.createElement('figure', { className: `package-photo ${className}` },
        React.createElement('img', { src, alt: '', loading: 'eager', decoding: 'async' }),
        React.createElement('figcaption', null, 'Ảnh minh họa')) : null;
}

export function PackagesHeroFrame({ heroRef, portrait, moment, inspirationLink }: { heroRef?: Ref<HTMLElement>; portrait?: ReactNode; moment?: ReactNode; inspirationLink?: ReactNode }) {
    return <header ref={heroRef} className="packages-hero">
        <div className="packages-hero-copy">
            <h1>Một buổi chụp,<br /><em>đúng chất bạn.</em></h1>
            <div className="packages-intro">
                <p>Chọn gói theo thời lượng, số ảnh và ngân sách của bạn. Từ một bức chân dung đến những khoảnh khắc bên người thân.</p>
                <a href="#packages-catalog" className="package-card-cta">Tìm gói chụp của bạn <ArrowDown size={17} aria-hidden="true" /></a>
                {inspirationLink || <a href="/explore" className="packages-compare-jump">Tìm cảm hứng <ArrowRight size={15} aria-hidden="true" /></a>}
            </div>
        </div>
        <div className="packages-hero-photos">
            <div className="packages-hero-portrait-anchor">{portrait === undefined ? <StaticPhoto category="portrait" className="packages-hero-portrait" /> : portrait}</div>
            <div className="packages-hero-moment-anchor">{moment === undefined ? <StaticPhoto category="family" className="packages-hero-moment" /> : moment}</div>
        </div>
    </header>;
}

export function PackagesCatalogHeading() {
    return <div className="packages-section-heading"><h2 id="packages-catalog-title">Chọn cách lưu giữ <em>khoảnh khắc.</em></h2><p>Một mình, bên nhau, hay cùng gia đình.</p></div>;
}

export function CustomQuoteFrame({ onClick }: { onClick?: () => void }) {
    return <section id="packages-custom" className="packages-custom" aria-labelledby="packages-custom-title">
        <div><h2 id="packages-custom-title">Một ý tưởng <em>của riêng bạn?</em></h2><p>Chưa tìm thấy gói phù hợp? Chia sẻ ý tưởng, số người và thời gian dự kiến để trao đổi về một buổi chụp theo yêu cầu.</p></div>
        <button type="button" disabled={!onClick} className="package-card-cta package-card-cta--secondary" onClick={onClick}>Trao đổi về buổi chụp <MoveUpRight size={17} aria-hidden="true" /></button>
    </section>;
}

export function PackagesStartup() {
    return <main className="packages-page" data-loading-scope="local"><div className="packages-container">
        <PackagesHeroFrame />
        <section id="packages-catalog" className="packages-catalog" aria-labelledby="packages-catalog-title"><PackagesCatalogHeading /><DataLoadingFrame message="Đang tải gói chụp" /></section>
        <CustomQuoteFrame />
    </div></main>;
}
