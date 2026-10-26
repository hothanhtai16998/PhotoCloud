import { ArrowDown, ArrowRight, Check, MoveUpRight, Image as ImageIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatPackagePrice, formatPackageDuration, type StudioPackage } from '@/constants/packages';
import { openBookingModal } from '@/utils/bookingModalEvent';
import { useState } from 'react';

export function ServicePhoto({ src, alt, main = false }: { src?: string; alt: string; main?: boolean }) {
    const [failed, setFailed] = useState<string | null>(null);
    return <figure className={`package-service-photo${main ? ' package-service-photo--main' : ''}`}>
        {src && failed !== src ? <img src={src} alt={alt} loading="lazy" decoding="async" onError={() => setFailed(src)} /> :
            <div className="package-service-photo-empty"><ImageIcon size={28} strokeWidth={1} aria-hidden="true" /><span>{src ? 'Ảnh hiện chưa tải được' : 'Ảnh đang được cập nhật'}</span></div>}
    </figure>;
}

export function PackageServices({ packages }: { packages: StudioPackage[] }) {
    return <>
        <nav className="package-service-jumps" aria-label="Đi đến gói chụp">
            {packages.map(pkg => <a key={pkg.id} href={`#service-${pkg.slug}`}>{pkg.name}<ArrowDown size={14} aria-hidden="true" /></a>)}
            <a href="#packages-compare">So sánh các gói <ArrowDown size={14} aria-hidden="true" /></a>
        </nav>
        <div className="package-services">
            {packages.map(pkg => <section key={pkg.id} id={`service-${pkg.slug}`} className="package-service" aria-labelledby={`service-title-${pkg.slug}`}>
                <div className="package-service-layout">
                    <div className="package-service-copy">
                        <h3 id={`service-title-${pkg.slug}`}>{pkg.name}</h3>
                        <p className="package-service-description">{pkg.description}</p>
                        {pkg.detailDescription && <p className="package-service-detail">{pkg.detailDescription}</p>}
                        {pkg.includes.length > 0 && <div className="package-service-includes"><h4>Trong gói chụp của bạn</h4>
                            <ul>{pkg.includes.map(item => <li key={item}><Check size={17} aria-hidden="true" /><span>{item}</span></li>)}</ul>
                        </div>}
                        <div className="package-service-summary">
                            <p className="package-card-price"><span>Giá khởi điểm</span><strong>{formatPackagePrice(pkg).replace(/^từ\s*/, '')}</strong></p>
                            <dl><div><dt>Thời lượng</dt><dd>{formatPackageDuration(pkg)}</dd></div><div><dt>Ảnh chỉnh màu</dt><dd>{pkg.photos} ảnh</dd></div></dl>
                        </div>
                        <div className="package-card-actions">
                            <button type="button" className="package-card-cta" aria-label={`Đặt lịch gói ${pkg.name}`} onClick={() => openBookingModal({ selectedPackageId: pkg.id })}>Chọn gói này <ArrowRight size={17} aria-hidden="true" /></button>
                            <Link to={`/packages/${pkg.slug}`} className="package-card-detail">Chi tiết gói <MoveUpRight size={15} aria-hidden="true" /></Link>
                        </div>
                    </div>
                    <ServicePhoto src={pkg.coverUrl} alt={`Ảnh giới thiệu gói ${pkg.name}`} main />
                </div>
                <ServiceGallery pkg={pkg} />
            </section>)}
        </div>
        <section id="packages-compare" className="package-comparison" aria-labelledby="package-comparison-title">
            <div className="packages-section-heading"><h2 id="package-comparison-title">Chọn gói <em>phù hợp với bạn.</em></h2><p>Đặt các lựa chọn cạnh nhau để dễ cân nhắc.</p></div>
            <div className="package-comparison-grid">{packages.map(pkg => <article key={pkg.id} className="package-comparison-item">
                <h3><a href={`#service-${pkg.slug}`}>{pkg.name}</a></h3>
                <p className="package-card-price"><span>Giá từ</span><strong>{formatPackagePrice(pkg).replace(/^từ\s*/, '')}</strong></p>
                <dl><div><dt>Thời lượng</dt><dd>{formatPackageDuration(pkg)}</dd></div><div><dt>Ảnh chỉnh màu</dt><dd>{pkg.photos} ảnh</dd></div></dl>
                <button type="button" className="package-card-cta" aria-label={`Chọn gói ${pkg.name} từ so sánh`} onClick={() => openBookingModal({ selectedPackageId: pkg.id })}>Đặt lịch <ArrowRight size={16} aria-hidden="true" /></button>
            </article>)}</div>
        </section>
    </>;
}

export function ServiceGallery({ pkg }: { pkg: StudioPackage }) {
    return <div className="package-service-work"><h4>Hình ảnh buổi chụp</h4>
        <div className="package-service-gallery">{pkg.gallery?.length ? pkg.gallery.map((url, i) => <a key={url} href={url} target="_blank" rel="noopener noreferrer" aria-label={'Xem ảnh ' + (i + 1) + ' của gói ' + pkg.name}><ServicePhoto src={url} alt={pkg.name + ' — ảnh ' + (i + 1)} /></a>) : [0, 1, 2].map(i => <ServicePhoto key={i} alt="" />)}</div>
    </div>;
}
