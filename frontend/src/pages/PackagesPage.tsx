import { useCallback, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion, useScroll, useSpring, useTransform, type MotionStyle } from 'motion/react';
import { Link, useParams } from 'react-router-dom';
import { ArrowDown, ArrowLeft, ArrowRight, Check, Clock3, Images, Mouse, MoveUpRight } from 'lucide-react';
import { usePackageWheel } from './packages/usePackageWheel';
import { DataLoading } from '@/components/user/DataLoading';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';
import { usePublicPackages, type PublicPackagesState } from '@/hooks/usePublicPackages';
import { CORE_PACKAGES, type StudioPackage, formatPackagePrice, formatPackageDuration, formatPackagePhotos } from '@/constants/packages';
import { openBookingModal } from '@/utils/bookingModalEvent';
import './PackagesPage.css';

function PackageImage({ src, priority = false, className = '', frameStyle }: {
    src: string; priority?: boolean; className?: string; frameStyle?: MotionStyle;
}) {
    const [failedUrl, setFailedUrl] = useState<string | null>(null);
    if (!src || failedUrl === src) return null;
    return <motion.figure className={`package-photo ${className}`} style={frameStyle}>
        <img src={src} alt="" loading={priority ? 'eager' : 'lazy'} decoding="async" onError={() => setFailedUrl(src)} />
        <figcaption>Ảnh minh họa</figcaption>
    </motion.figure>;
}

function PackageNotice({ source, error, loading, refetch }: Pick<PublicPackagesState, 'source' | 'error' | 'loading' | 'refetch'>) {
    if (!error) return null;
    return <div className="packages-source-note" role="status">
        <p>{source === 'fallback'
            ? 'Chưa tải được thông tin mới nhất. Các gói bên dưới là thông tin tham khảo; vui lòng kiểm tra lại trước khi đặt lịch.'
            : 'Chưa cập nhật được thông tin gói chụp. Bạn có thể tải lại.'}</p>
        <button type="button" disabled={loading} onClick={refetch}>{loading ? 'Đang tải lại' : 'Thử lại'}</button>
    </div>;
}

function PackagesHero() {
    const ref = useRef<HTMLElement>(null);
    const reducedMotion = useReducedMotion();
    const { scrollYProgress } = useScroll({ target: ref, offset: ['start 0.18', 'end start'] });
    const settledProgress = useSpring(scrollYProgress, { stiffness: 160, damping: 32, mass: .8 });
    const back = useTransform(settledProgress, progress => `translateY(calc(${24 * progress}px * var(--package-motion-scale, 1))) rotate(${5 + progress * 2}deg)`);
    const front = useTransform(settledProgress, progress => `translateY(calc(${-48 * progress}px * var(--package-motion-scale, 1))) rotate(${-7 - progress * 3}deg)`);
    return <header ref={ref} className="packages-hero">
        <div className="packages-hero-copy">
            <h1>Một buổi chụp,<br /><em>đúng chất bạn.</em></h1>
            <div className="packages-intro">
            <p>Chọn gói theo thời lượng, số ảnh và ngân sách của bạn. Từ một bức chân dung đến những khoảnh khắc bên người thân.</p>
            <a href="#packages-catalog" className="package-card-cta">Tìm gói chụp của bạn <ArrowDown size={17} aria-hidden="true" /></a>
            <Link to="/explore" className="packages-compare-jump">Tìm cảm hứng <ArrowRight size={15} aria-hidden="true" /></Link>
            </div>
        </div>
        <div className="packages-hero-photos">
            <div className="packages-hero-portrait-anchor">
                <PackageImage src={CORE_PACKAGES.find(pkg => pkg.accent === 'portrait')?.coverUrl ?? ''} priority className="packages-hero-portrait" frameStyle={reducedMotion ? undefined : { transform: back }} />
            </div>
            <PackageImage src={CORE_PACKAGES.find(pkg => pkg.accent === 'family')?.coverUrl ?? ''} priority className="packages-hero-moment" frameStyle={reducedMotion ? undefined : { transform: front }} />
        </div>
    </header>;
}

export default function PackagesPage() {
    const { slug } = useParams<{ slug?: string }>();
    const data = usePublicPackages();
    const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
    const selectedIndex = Math.max(0, data.packages.findIndex(pkg => pkg.slug === selectedSlug));
    const activePackage = slug ? data.packages.find(pkg => pkg.slug === slug) : undefined;
    useDocumentMeta({ title: activePackage?.name || 'Gói chụp',
        description: activePackage ? `${activePackage.name} — ${activePackage.description} Giá ${formatPackagePrice(activePackage)}.` : 'Xem giá, thời lượng và số ảnh của các gói chụp tại PhotoCloud Studio.' });
    const initialLoading = data.loading && data.source !== 'api';
    return <main className="packages-page" data-loading-scope="local">
        <div className="packages-container">
            {slug && !initialLoading ? <>
                <Link to="/packages" className="packages-back"><ArrowLeft size={16} aria-hidden="true" /> Tất cả gói chụp</Link>
                <PackageNotice {...data} />
                {activePackage ? <PackageDetail pkg={activePackage} /> : <section className="packages-empty">
                    <h1>{data.error ? 'Chưa tải được gói chụp' : 'Không tìm thấy gói chụp này'}</h1>
                    <p>{data.error ? 'Thử tải lại thông tin hoặc quay về danh sách gói.' : 'Gói có thể đã được thay đổi hoặc ngừng hiển thị. Bạn có thể chọn một gói khác.'}</p>
                    <Link to="/packages" className="package-card-cta">Xem các gói chụp <ArrowRight size={16} aria-hidden="true" /></Link>
                </section>}
            </> : <>
                <PackagesHero />
                <section id="packages-catalog" className="packages-catalog" aria-labelledby="packages-catalog-title">
                    <div className="packages-section-heading">
                        <h2 id="packages-catalog-title">Chọn cách lưu giữ <em>khoảnh khắc.</em></h2>
                        <p>Một mình, bên nhau, hay cùng gia đình.</p>
                    </div>
                    <PackageNotice {...data} />
                    {initialLoading ? <DataLoading message="Đang tải gói chụp" /> : <>
                        {data.loading && <DataLoading size="inline" message="Đang cập nhật gói chụp" />}
                        {data.packages.length ? <PackageStage packages={data.packages} selectedIndex={selectedIndex} onSelect={setSelectedSlug} /> : !data.error && <div className="packages-empty"><h3>Hiện chưa có gói chụp</h3><p>Bạn có thể gửi yêu cầu riêng để trao đổi về buổi chụp.</p></div>}
                    </>}
                </section>
                {!initialLoading && <CustomQuote />}
            </>}
        </div>
    </main>;
}

function PackageStage({ packages, selectedIndex, onSelect }: { packages: StudioPackage[]; selectedIndex: number; onSelect: (slug: string) => void }) {
    const reducedMotion = useReducedMotion();
    const touchStart = useRef<{ x: number; y: number } | null>(null);
    const stageRef = useRef<HTMLDivElement>(null);
    const [direction, setDirection] = useState(1);
    const pkg = packages[selectedIndex];
    const select = useCallback((index: number, focus = false) => {
        if (index < 0 || index >= packages.length || index === selectedIndex) return;
        setDirection(index > selectedIndex ? 1 : -1);
        onSelect(packages[index].slug);
        if (focus) document.getElementById(`package-tab-${packages[index].slug}`)?.focus();
    }, [packages, selectedIndex, onSelect]);
    usePackageWheel(stageRef, selectedIndex, packages.length, select);
    return <div className="package-stage" ref={stageRef}>
        <div className="package-stage-toolbar">
            <div className="package-tabs" role="tablist" aria-label="Chọn gói chụp" onKeyDown={event => {
                let index = selectedIndex;
                if (event.key === 'ArrowRight') index = (index + 1) % packages.length;
                else if (event.key === 'ArrowLeft') index = (index - 1 + packages.length) % packages.length;
                else if (event.key === 'Home') index = 0;
                else if (event.key === 'End') index = packages.length - 1;
                else return;
                event.preventDefault();
                select(index, true);
            }}>
                {packages.map((item, index) => <button key={item.id} type="button" role="tab" id={`package-tab-${item.slug}`} aria-selected={index === selectedIndex} aria-controls="package-selected-panel" tabIndex={index === selectedIndex ? 0 : -1} onClick={() => select(index)}>
                    {index === selectedIndex && <motion.span className="package-tab-selection" layoutId="package-tab-selection" aria-hidden="true" transition={{ duration: reducedMotion ? 0 : .28, ease: [.16, 1, .3, 1] }} />}
                    <span className="package-tab-label">{item.name}</span>
                </button>)}
            </div>
            <div className="package-stage-navigation">
                <span aria-live="polite" aria-atomic="true">{selectedIndex + 1} / {packages.length}</span>
                <button type="button" aria-label="Gói trước" disabled={selectedIndex === 0} onClick={() => select(selectedIndex - 1)}><ArrowLeft size={19} aria-hidden="true" /></button>
                <button type="button" aria-label="Gói tiếp theo" disabled={selectedIndex === packages.length - 1} onClick={() => select(selectedIndex + 1)}><ArrowRight size={19} aria-hidden="true" /></button>
            </div>
        </div>
        <p className="package-stage-scroll-hint"><Mouse size={16} aria-hidden="true" />{selectedIndex === packages.length - 1 ? 'Cuộn lên để xem lại · Cuộn xuống để tiếp tục' : 'Cuộn để chuyển gói · Hoặc chọn tên gói phía trên'}</p>
        <article className="package-card" id="package-selected-panel" role="tabpanel" aria-labelledby={`package-tab-${pkg.slug}`}>
            <div className="package-stage-art" onPointerDown={event => {
                touchStart.current = event.pointerType === 'touch' ? { x: event.clientX, y: event.clientY } : null;
            }} onPointerCancel={() => { touchStart.current = null; }} onPointerUp={event => {
                const start = touchStart.current;
                touchStart.current = null;
                if (!start) return;
                const dx = event.clientX - start.x, dy = event.clientY - start.y;
                if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) select(selectedIndex + (dx < 0 ? 1 : -1));
            }}>
                <AnimatePresence initial={false} custom={direction}>
                    <motion.div key={pkg.slug} className="package-stage-print" custom={direction}
                        variants={{ enter: (d: number) => ({ y: d * 28, opacity: 0 }), center: { y: 0, opacity: 1 }, leave: (d: number) => ({ y: d * -18, opacity: 0, transition: { duration: .18 } }) }}
                        initial={reducedMotion ? false : 'enter'} animate="center" exit={reducedMotion ? { opacity: 0 } : 'leave'}
                        transition={{ duration: reducedMotion ? .08 : .4, ease: [.16, 1, .3, 1] }}>
                        <PackageImage src={pkg.coverUrl} priority />
                    </motion.div>
                </AnimatePresence>
            </div>
        <motion.div key={pkg.slug} className="package-card-body" initial={reducedMotion ? false : { opacity: .7 }} animate={{ opacity: 1 }} transition={{ duration: reducedMotion ? .08 : .2 }}>
        <div className="package-card-heading">
            <div><h3><Link to={`/packages/${pkg.slug}`}>{pkg.name}</Link></h3><p className="package-card-description">{pkg.description}</p></div>
        </div>
        <div className="package-stage-facts">
        <p className="package-card-price"><span>Giá từ</span><strong>{formatPackagePrice(pkg).replace(/^từ\s*/, '')}</strong></p>
        <dl className="package-card-meta">
            <div><dt><Clock3 size={15} aria-hidden="true" /> Thời lượng</dt><dd>{formatPackageDuration(pkg)}</dd></div>
            <div><dt><Images size={15} aria-hidden="true" /> Ảnh chỉnh màu</dt><dd>{pkg.photos} ảnh</dd></div>
        </dl>
        </div>
        <div className="package-card-actions">
            <button type="button" className="package-card-cta" aria-label={`Đặt lịch gói ${pkg.name}`} onClick={() => openBookingModal({ selectedPackageId: pkg.id })}>Chọn gói này <ArrowRight size={17} aria-hidden="true" /></button>
            <Link to={`/packages/${pkg.slug}`} className="package-card-detail" aria-label={`Xem chi tiết gói ${pkg.name}`}>Khám phá gói <MoveUpRight size={15} aria-hidden="true" /></Link>
        </div>
        </motion.div>
    </article>
    </div>;
}

function CustomQuote() {
    return <section className="packages-custom" aria-labelledby="packages-custom-title">
        <div><h2 id="packages-custom-title">Một ý tưởng <em>của riêng bạn?</em></h2>
            <p>Chưa tìm thấy gói phù hợp? Chia sẻ ý tưởng, số người và thời gian dự kiến để trao đổi về một buổi chụp theo yêu cầu.</p></div>
        <button type="button" className="package-card-cta package-card-cta--secondary" onClick={() => openBookingModal({ mode: 'custom-quote' })}>Trao đổi về buổi chụp <MoveUpRight size={17} aria-hidden="true" /></button>
    </section>;
}

function PackageDetail({ pkg }: { pkg: StudioPackage }) {
    return <article className="package-detail">
        <header className="package-detail-hero"><h1>{pkg.name}</h1><p>{pkg.description}</p></header>
        <div className="package-detail-layout">
            <div className="package-detail-content">
                <PackageImage key={pkg.coverUrl} src={pkg.coverUrl} priority />
                <section className="package-detail-section"><h2>Trong buổi chụp của bạn</h2>
                    <ul className="package-detail-list">{pkg.includes.map(item => <li key={item}><Check size={18} aria-hidden="true" /><span>{item}</span></li>)}</ul>
                </section>
            </div>
            <aside className="package-detail-booking" aria-label="Thông tin và đặt lịch gói">
                <p className="package-card-price"><span>Giá khởi điểm</span><strong>{formatPackagePrice(pkg).replace(/^từ\s*/, '')}</strong></p>
                <dl className="package-detail-meta"><div><dt>Thời lượng</dt><dd>{formatPackageDuration(pkg)}</dd></div><div><dt>Số ảnh giao</dt><dd>{formatPackagePhotos(pkg)}</dd></div></dl>
                <button type="button" className="package-card-cta" onClick={() => openBookingModal({ selectedPackageId: pkg.id })}>Đặt lịch gói này <ArrowRight size={17} aria-hidden="true" /></button>
                <Link to="/booking" className="package-card-detail">Xem form đầy đủ <MoveUpRight size={15} aria-hidden="true" /></Link>
            </aside>
        </div>
    </article>;
}
