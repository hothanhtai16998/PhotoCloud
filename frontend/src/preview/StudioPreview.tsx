import { StrictMode, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { AnimatePresence, motion, useReducedMotion, useScroll, useTransform } from 'motion/react';
import { ArrowDown, ArrowLeft, ArrowRight, CalendarDays, Check, ChevronLeft, ChevronRight, Clock, Images, Menu, Pause, Play, Plus, RotateCcw, X } from 'lucide-react';
import { CORE_PACKAGES, formatPackageDuration, formatPackagePrice } from '../constants/packages';
import './StudioPreview.css';
import { PhotoStage, STAGE_PHOTOS } from './StudioWorld';
import { SpatialGallery } from './SpatialGallery';
import './CinematicPreview.css';
import './SpatialPreview.css';

const stories = [
  { name: 'Một phiên bản rất riêng', category: 'Chân dung', packageId: 'portrait', location: 'Ánh sáng studio · Chân dung cá nhân', image: STAGE_PHOTOS[0], index: '01' },
  { name: 'Hai người, một câu chuyện', category: 'Couple', packageId: 'couple', location: 'Khoảnh khắc gần gũi · Hai người', image: STAGE_PHOTOS[1], index: '02' },
  { name: 'Những ngày bên nhau', category: 'Gia đình', packageId: 'family', location: 'Kỷ niệm gia đình · Ngoại cảnh', image: STAGE_PHOTOS[2], index: '03' },
];
const faqs = [
  ['Tôi chưa biết tạo dáng thì sao?', 'Bạn có thể chia sẻ phong cách thích trước buổi chụp. Photographer sẽ gợi ý tư thế và cùng bạn tìm những khoảnh khắc thoải mái, tự nhiên.'],
  ['Gửi yêu cầu có nghĩa là đã chốt lịch chưa?', 'Ngày bạn chọn là ngày mong muốn. Studio cần kiểm tra lịch và trao đổi với bạn trước khi xác nhận buổi chụp.'],
  ['Tôi nên chuẩn bị trang phục như thế nào?', 'Chọn trang phục bạn cảm thấy tự tin và thoải mái. Concept, màu sắc và địa điểm sẽ được trao đổi trước để bộ ảnh đồng nhất.'],
  ['Đổi lịch, đặt cọc và thời gian giao ảnh?', 'Các điều kiện cụ thể cần được studio xác nhận trước khi đặt cọc. Thời gian giao ảnh tham khảo trong dữ liệu gói hiện tại là 5–7 ngày.'],
];

function Reveal({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const reduced = useReducedMotion();
  return <motion.div className={className} initial={reduced ? false : { opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.12 }} transition={{ duration: 0.4 }}>{children}</motion.div>;
}

function Booking({ initialPackage, onClose }: { initialPackage: string; onClose: () => void }) {
  const reduced = useReducedMotion();
  const [step, setStep] = useState(0);
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ packageId: initialPackage || 'portrait', date: '', time: 'Linh hoạt', place: 'Studio', name: '', phone: '', email: '', concept: '' });
  const dialog = useRef<HTMLDialogElement>(null);
  const selected = CORE_PACKAGES.find(p => p.id === form.packageId)!;
  const today = new Date();
  const minimumDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.current?.showModal();
    return () => { document.body.style.overflow = previousOverflow; previousFocus?.focus(); };
  }, []);
  const update = (key: keyof typeof form, value: string) => setForm(current => ({ ...current, [key]: value }));
  return <dialog ref={dialog} className="sp-dialog" aria-labelledby="booking-title" onCancel={onClose} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
    <div className="sp-dialog-head"><span>PHOTOCLOUD / ĐẶT LỊCH</span><button className="sp-icon" type="button" aria-label="Đóng" onClick={onClose}><X size={22} /></button></div>
    {sent ? <div className="sp-success" role="status"><Check size={40} /><h2>Đã hoàn tất bản thử.</h2><p>Không có yêu cầu nào được gửi đến studio. Khi tích hợp thật, bạn sẽ nhận mã yêu cầu và chờ studio xác nhận lịch.</p><button className="sp-button" onClick={onClose}>Quay lại trang <ArrowRight size={18} /></button></div> : <>
      <div className="sp-progress" aria-label={`Bước ${step + 1} trên 4`}>{['Gói chụp', 'Lịch chụp', 'Liên hệ', 'Kiểm tra'].map((label, i) => <span key={label} className={i <= step ? 'active' : ''}>{i + 1}. {label}</span>)}</div>
      <form onSubmit={e => { e.preventDefault(); if (step < 3) setStep(step + 1); else setSent(true); }}>
        <AnimatePresence mode="wait"><motion.div key={step} className="sp-form-content" initial={reduced ? false : { opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.16 }}>
          <h2 id="booking-title">{['Bạn muốn chụp gì?', 'Một ngày dành cho bạn.', 'Cùng lên ý tưởng nhé.', 'Kiểm tra yêu cầu của bạn.'][step]}</h2>
          {step === 0 && <div className="sp-package-options">{CORE_PACKAGES.map(p => <label key={p.id} className={form.packageId === p.id ? 'selected' : ''}><input type="radio" name="package" value={p.id} checked={form.packageId === p.id} onChange={() => update('packageId', p.id)} /><span><strong>{p.name}</strong><small>{formatPackageDuration(p)} · {p.photos} ảnh chỉnh màu</small></span><strong>{formatPackagePrice(p)}</strong></label>)}</div>}
          {step === 1 && <div className="sp-fields"><label>Ngày mong muốn<input type="date" required min={minimumDate} value={form.date} onChange={e => update('date', e.target.value)} /></label><label>Buổi chụp<select value={form.time} onChange={e => update('time', e.target.value)}>{['Linh hoạt', 'Buổi sáng', 'Buổi chiều', 'Buổi tối'].map(t => <option key={t}>{t}</option>)}</select></label><label className="sp-field-wide">Địa điểm<select value={form.place} onChange={e => update('place', e.target.value)}>{['Studio', 'Ngoại cảnh', 'Tại nhà', 'Trao đổi sau'].map(t => <option key={t}>{t}</option>)}</select></label><p className="sp-field-wide sp-hint">Studio sẽ kiểm tra ngày mong muốn trước khi xác nhận.</p></div>}
          {step === 2 && <div className="sp-fields"><label className="sp-field-wide">Tên của bạn<input autoComplete="name" required value={form.name} onChange={e => update('name', e.target.value)} /></label><label>Số điện thoại<input autoComplete="tel" type="tel" required pattern="[+0-9 ()-]{8,20}" value={form.phone} onChange={e => update('phone', e.target.value)} /></label><label>Email<input autoComplete="email" type="email" required value={form.email} onChange={e => update('email', e.target.value)} /></label><label className="sp-field-wide">Ý tưởng / điều bạn muốn lưu lại<textarea rows={3} value={form.concept} onChange={e => update('concept', e.target.value)} placeholder="Phong cách, trang phục, bộ ảnh bạn yêu thích..." /></label></div>}
          {step === 3 && <><dl className="sp-summary"><div><dt>Gói chụp</dt><dd>{selected.name}</dd></div><div><dt>Giá tham khảo</dt><dd>{formatPackagePrice(selected)}</dd></div><div><dt>Ngày / buổi</dt><dd>{form.date} · {form.time}</dd></div><div><dt>Địa điểm</dt><dd>{form.place}</dd></div><div><dt>Liên hệ</dt><dd>{form.name}<br />{form.phone}<br />{form.email}</dd></div>{form.concept && <div><dt>Ý tưởng</dt><dd>{form.concept}</dd></div>}</dl><label className="sp-consent"><input type="checkbox" required />Tôi hiểu đây là ngày mong muốn, cần studio xác nhận.</label></>}
        </motion.div></AnimatePresence>
        <div className="sp-form-footer"><span className="sp-hint">Bản xem trước · Không gửi booking thật</span><div>{step > 0 && <button type="button" className="sp-icon" aria-label="Quay lại bước trước" onClick={() => setStep(step - 1)}><ArrowLeft size={20} /></button>}<button className="sp-button" type="submit">{step === 3 ? 'Gửi thử yêu cầu' : 'Tiếp tục'}<ArrowRight size={18} /></button></div></div>
      </form>
    </>}
  </dialog>;
}

function CinematicHero({ onBook, onOpen }: { onBook: (id?: string) => void; onOpen: (index: number) => void }) {
  const reduced = useReducedMotion();
  const section = useRef<HTMLElement>(null);
  const progress = useRef(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [phase, setPhase] = useState(0);
  const [running, setRunning] = useState(true);
  const { scrollYProgress } = useScroll({ target: section, offset: ['start start', 'end end'] });
  const titleY = useTransform(scrollYProgress, [0, .3], [0, reduced ? 0 : -55]);
  const titleOpacity = useTransform(scrollYProgress, [0, .3], [1, reduced ? 1 : 0]);
  const chapterOpacity = useTransform(scrollYProgress, [.2, .4], [0, 1]);
  const chapterPointer = useTransform(scrollYProgress, value => value > .35 ? 'auto' : 'none');
  const titlePointer = useTransform(scrollYProgress, value => value < .2 ? 'auto' : 'none');
  useEffect(() => scrollYProgress.on('change', value => { progress.current = value; setPhase(Math.min(2, Math.floor(value * 3))); }), [scrollYProgress]);
  const currentStory = stories[selected ?? phase];
  return <section ref={section} className={`sp-cinema ${reduced ? 'sp-cinema-static' : ''}`}>
    <div className="sp-cinema-sticky">
      <PhotoStage progress={progress} reduced={Boolean(reduced)} selected={selected} running={running} onSelect={setSelected} />
      {selected === null && <motion.div className="sp-cinema-copy" inert={!reduced && phase > 0} style={{ y: titleY, opacity: titleOpacity, pointerEvents: titlePointer }}>
        <div className="sp-eyebrow">THE PHOTOCLOUD ATELIER / 2026</div>
        <h1>PhotoCloud<span>Studio.</span></h1>
        <p>Một chút ánh sáng.<br />Rất nhiều chất riêng.</p>
        <div className="sp-hero-actions"><button className="sp-button" onClick={() => onBook()}>Đặt buổi chụp <ArrowRight size={18} /></button><a href="#portfolio">Những câu chuyện <ArrowDown size={17} /></a></div>
      </motion.div>}
      {(!reduced || selected !== null) && <motion.div className="sp-cinema-chapter" inert={selected === null && phase === 0} style={{ opacity: selected !== null ? 1 : chapterOpacity, pointerEvents: selected !== null ? 'auto' : chapterPointer }}><AnimatePresence mode="wait"><motion.div key={currentStory.index} initial={reduced ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: .25 }}><span className="sp-eyebrow">{currentStory.index} / {currentStory.category}</span><h2>{currentStory.name}</h2><p>{currentStory.location}</p><button className="sp-text-button" onClick={() => onBook(currentStory.packageId)}>Đặt lịch phong cách này <ArrowRight size={18} /></button><button className="sp-scene-open" onClick={() => onOpen(selected ?? phase)}><Images size={15} /> Xem ảnh</button></motion.div></AnimatePresence></motion.div>}
      <div className="sp-scene-controls"><div className="sp-scene-tabs" aria-label="Góc nhìn studio"><button aria-pressed={selected === null} onClick={() => setSelected(null)}>Toàn cảnh</button>{stories.map((s, i) => <button key={s.index} aria-pressed={selected === i} onClick={() => setSelected(i)}><span>{s.index}</span>{s.category}</button>)}</div><div className="sp-scene-tools"><button className="sp-icon" aria-label={running ? 'Dừng chuyển động' : 'Tiếp tục chuyển động'} title={running ? 'Dừng chuyển động' : 'Tiếp tục chuyển động'} onClick={() => setRunning(!running)}>{running ? <Pause size={17} /> : <Play size={17} />}</button><button className="sp-icon" aria-label="Về toàn cảnh" title="Về toàn cảnh" onClick={() => { setSelected(null); section.current?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' }); }}><RotateCcw size={17} /></button></div></div>
      <div className="sp-cinema-bottom"><span>CHÂN DUNG / COUPLE / GIA ĐÌNH</span><a href="#portfolio" aria-label="Xem portfolio"><ArrowDown size={18} /></a><span>PHOTOGRAPHY, IN YOUR ELEMENT.</span></div>
    </div>
  </section>;
}

function StudioPreview() {
  const reduced = useReducedMotion();
  const [active, setActive] = useState(0);
  const [booking, setBooking] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [album, setAlbum] = useState<number | null>(null);
  const [review, setReview] = useState(0);
  const storyIndex = active;
  const story = stories[storyIndex];
  const openBooking = (id = '') => { setMenuOpen(false); setBooking(id); };
  return <div className="sp-site">
    <header className="sp-header"><a href="#" className="sp-logo">PhotoCloud<span>STUDIO</span></a><nav aria-label="Điều hướng chính" className={menuOpen ? 'open' : ''}>{[['Portfolio', '#portfolio'], ['Gói chụp', '#packages'], ['Quy trình', '#process'], ['Liên hệ', '#contact']].map(([label, href]) => <a href={href} key={href} onClick={() => setMenuOpen(false)}>{label}</a>)}</nav><div className="sp-header-actions"><button className="sp-button" onClick={() => openBooking()}>Đặt lịch <ArrowRight size={16} /></button><button className="sp-icon sp-menu" aria-label={menuOpen ? 'Đóng menu' : 'Mở menu'} aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X /> : <Menu />}</button></div></header>
    <main>
      <CinematicHero onBook={openBooking} onOpen={setAlbum} />
      <div className="sp-film-band"><div><span>YOUR LIGHT.</span><span>YOUR STORY.</span><span>PHOTOCLOUD.</span><span>YOUR LIGHT.</span><span>YOUR STORY.</span><span>PHOTOCLOUD.</span></div></div>
      <div className="sp-intro"><span>KHÔNG CẦN DIỄN. CHỈ CẦN LÀ BẠN.</span><p>Ánh sáng đẹp. Một chút dẫn dắt.<br />Và đủ không gian để bạn là chính mình.</p></div>
      <section id="portfolio" className="sp-orbit-portfolio"><div className="sp-orbit-heading"><span className="sp-eyebrow">01 / SELECTED STORIES</span><h2>Những câu chuyện.</h2><div className="sp-orbit-tabs" aria-label="Chọn bộ ảnh">{stories.map((s, i) => <button key={s.index} aria-pressed={active === i} onClick={() => setActive(i)}>{s.category}</button>)}</div></div><SpatialGallery active={active} reduced={Boolean(reduced)} onSelect={setActive} onOpen={setAlbum} /><div className="sp-orbit-footer"><div className="sp-orbit-caption" aria-live="polite"><span className="sp-eyebrow">{story.index} / {story.category}</span><h3>{story.name}</h3><p>{story.location}</p></div><div className="sp-orbit-actions"><div className="sp-orbit-arrows"><button className="sp-icon" aria-label="Bộ ảnh trước" onClick={() => setActive((active + 2) % 3)}><ChevronLeft /></button><span>{story.index} / 03</span><button className="sp-icon" aria-label="Bộ ảnh tiếp theo" onClick={() => setActive((active + 1) % 3)}><ChevronRight /></button><button className="sp-icon" title="Xem ảnh lớn" aria-label="Xem ảnh lớn" onClick={() => setAlbum(active)}><Images size={19} /></button></div><button className="sp-button" onClick={() => openBooking(story.packageId)}>Đặt lịch {story.category.toLowerCase()}<ArrowRight size={18} /></button></div></div></section>
      <section id="packages" className="sp-section sp-packages"><Reveal className="sp-section-heading"><div><span className="sp-eyebrow">02 / DÀNH CHO BẠN</span><h2>Một buổi chụp.<br />Nhiều điều để nhớ.</h2></div><p>Chọn gói phù hợp với câu chuyện của bạn.<br />Concept và địa điểm được trao đổi trước buổi chụp.</p></Reveal><div className="sp-package-grid">{CORE_PACKAGES.slice(0, 3).map((p, i) => <Reveal className="sp-package" key={p.id}><div className="sp-package-image"><img src={STAGE_PHOTOS[i]} alt={`Gói chụp ${p.name}`} loading="lazy" /><span>0{i + 1} / {p.name}</span></div><div className="sp-package-heading"><h3>{p.name}</h3><span>{formatPackagePrice(p)}</span></div><div className="sp-package-facts"><span><Clock size={15} />{formatPackageDuration(p)}</span><span><Images size={15} />{p.photos} ảnh chỉnh màu</span></div><ul>{p.includes.slice(0, 3).map(item => <li key={item}><Check size={14} />{item}</li>)}</ul><button className="sp-text-button" onClick={() => openBooking(p.id)}>Chọn gói này <ArrowRight size={18} /></button></Reveal>)}</div></section>
      <section id="process" className="sp-section sp-process"><Reveal><span className="sp-eyebrow">03 / THẬT ĐƠN GIẢN</span><h2>Từ ý tưởng đến bộ ảnh.</h2></Reveal><div className="sp-process-grid">{[['Chọn buổi chụp', 'Chọn gói và gửi ngày bạn mong muốn.'], ['Cùng chốt concept', 'Trao đổi phong cách, trang phục và địa điểm.'], ['Tận hưởng buổi chụp', 'Thả lỏng. Photographer sẽ đồng hành cùng bạn.'], ['Nhận câu chuyện', 'Chọn ảnh và nhận bộ ảnh đã chỉnh màu.']].map(([title, copy], i) => <Reveal key={title}><span className="sp-process-number">0{i + 1}</span><h3>{title}</h3><p>{copy}</p></Reveal>)}</div></section>
      <section className="sp-section sp-reviews"><Reveal><span className="sp-eyebrow">04 / SAU BUỔI CHỤP</span><h2>Điều ở lại.</h2><div className="sp-review-body"><AnimatePresence mode="wait"><motion.blockquote key={review} initial={reduced ? false : { opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.25 }}>{['Một bộ ảnh đẹp bắt đầu từ cảm giác thoải mái trong buổi chụp.', 'Không chỉ là ảnh, mà là cách bạn muốn nhớ về khoảnh khắc này.'][review]}</motion.blockquote></AnimatePresence><div><span>Góc nhìn PhotoCloud</span><div className="sp-review-controls"><button className="sp-icon" aria-label="Nội dung trước" onClick={() => setReview(1 - review)}><ChevronLeft /></button><span>0{review + 1} / 02</span><button className="sp-icon" aria-label="Nội dung tiếp theo" onClick={() => setReview(1 - review)}><ChevronRight /></button></div></div></div><p className="sp-hint">Phản hồi khách hàng sẽ được bổ sung khi có nội dung đã xác thực.</p></Reveal></section>
      <section className="sp-section sp-faq"><Reveal><span className="sp-eyebrow">05 / TRƯỚC KHI ĐẶT LỊCH</span><h2>Bạn có thể đang hỏi.</h2></Reveal><div>{faqs.map(([q, a]) => <details key={q}><summary>{q}<Plus size={20} /></summary><div className="sp-faq-answer">{a}</div></details>)}</div></section>
      <section id="contact" className="sp-contact"><Reveal><span className="sp-eyebrow">MỘT KHOẢNH KHẮC, MỘT CÂU CHUYỆN.</span><h2>Đến lượt<br /><em>câu chuyện của bạn.</em></h2><button className="sp-button sp-button-light" onClick={() => openBooking()}>Cùng lên lịch chụp <CalendarDays size={18} /></button></Reveal><footer><a className="sp-logo" href="#">PhotoCloud<span>STUDIO</span></a><span>Chân dung · Couple · Gia đình</span><button className="sp-footer-link" onClick={() => openBooking()}>Trao đổi về buổi chụp <ArrowRight size={16} /></button></footer></section>
    </main>
    <div className="sp-preview-note">BẢN XEM TRƯỚC · ẢNH MINH HỌA · GIÁ THAM KHẢO</div>
    <div className="sp-mobile-booking"><span>Buổi chụp của bạn<small>Chọn gói & ngày mong muốn</small></span><button className="sp-button" onClick={() => openBooking()}>Đặt lịch <ArrowRight size={17} /></button></div>
    {booking !== null && <Booking initialPackage={booking} onClose={() => setBooking(null)} />}
    {album !== null && <Album initial={album} onClose={() => setAlbum(null)} />}
  </div>;
}

function Album({ initial, onClose }: { initial: number; onClose: () => void }) {
  const [current, setCurrent] = useState(initial);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { const focus = document.activeElement as HTMLElement; const overflow = document.body.style.overflow; document.body.style.overflow = 'hidden'; dialog.current?.showModal(); return () => { document.body.style.overflow = overflow; focus?.focus(); }; }, []);
  return <dialog ref={dialog} className="sp-album" aria-label="Xem ảnh portfolio" onCancel={onClose}><div><span>{stories[current].category} · {current + 1} / 3</span><button className="sp-icon" aria-label="Đóng ảnh" onClick={onClose}><X /></button></div><img src={stories[current].image} alt={stories[current].name} /><div><button className="sp-icon" aria-label="Ảnh trước" onClick={() => setCurrent((current + 2) % 3)}><ChevronLeft /></button><span>{stories[current].name}</span><button className="sp-icon" aria-label="Ảnh tiếp theo" onClick={() => setCurrent((current + 1) % 3)}><ChevronRight /></button></div></dialog>;
}

createRoot(document.getElementById('root')!).render(<StrictMode><StudioPreview /></StrictMode>);
