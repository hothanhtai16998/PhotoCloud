import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useMotionValueEvent, useScroll } from 'motion/react';
import { ArrowDown, ArrowUpRight, Camera, Images, Search } from 'lucide-react';
import { useSliderStore } from '@/stores/useSliderStore';
import { generateImageSlug } from '@/lib/utils';
import { openBookingModal } from '@/utils/bookingModalEvent';
import './HomeJourney.css';

const paths = [
  { title: 'Tìm một góc nhìn mới', description: 'Đi tới Khám phá để xem ảnh và dùng các bộ lọc hiện có.', href: '/explore', label: 'Mở trang Khám phá', icon: Search },
  { title: 'Xem ảnh theo câu chuyện', description: 'Mở danh sách bộ sưu tập, chọn một bộ rồi xem những ảnh bên trong.', href: '/collections', label: 'Mở bộ sưu tập', icon: Images },
  { title: 'Chuẩn bị buổi chụp', description: 'Xem nội dung, thời lượng và giá từng gói trước khi gửi yêu cầu.', href: '#home-packages', label: 'Xem gói chụp', icon: Camera },
];
const chapters = ['Lối khám phá', 'Xem một bức ảnh', 'Bộ sưu tập', 'Dịch vụ chụp'];
const collectionSteps = [
  { title: 'Chọn một bộ', description: 'Tên và ảnh bìa giúp bạn chọn bộ sưu tập muốn khám phá.' },
  { title: 'Đi vào những khung hình', description: 'Mở bộ sưu tập để xem các ảnh được nhóm trong cùng một không gian.' },
  { title: 'Dừng ở ảnh bạn thích', description: 'Chọn một ảnh để mở thông tin chi tiết, rồi tiếp tục khám phá.' },
];

function JourneyImage({ src, title }: { src: string; title: string }) {
  const [failed, setFailed] = useState(false);
  return failed ? <span className="home-photo-unavailable"><Camera size={24} /><span>Chưa tải được ảnh. Bạn vẫn có thể chọn và mở trang chi tiết.</span></span>
    : <img src={src} alt={title} loading="lazy" decoding="async" onError={() => setFailed(true)} />;
}

export function HomeJourney() {
  const section = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: section, offset: ['start start', 'end end'] });
  const [chapter, setChapter] = useState(0);
  const [path, setPath] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [collectionStep, setCollectionStep] = useState(0);
  const slides = useSliderStore(state => state.slides);
  const photos = slides.slice(0, 2);
  const selected = photos.find(photo => photo.id === selectedId) ?? photos[0];
  useMotionValueEvent(scrollYProgress, 'change', () => {
    let index = 0;
    section.current?.querySelectorAll('.home-journey-scene').forEach((node, i) => { if (node.getBoundingClientRect().top < innerHeight * .5) index = i; });
    setChapter(index);
  });
  return <section ref={section} className="home-journey" aria-labelledby="home-journey-title">
    <div className="home-journey-heading">
      <h2 id="home-journey-title">Từ một bức ảnh.<br /><em>Bạn có thể đi xa hơn.</em></h2>
      <p>Cùng xem những gì bạn có thể làm trên PhotoCloud, từ tìm cảm hứng đến chuẩn bị buổi chụp của riêng mình.</p>
    </div>
    <div className="home-journey-layout">
      <aside className="home-journey-companion" aria-label="Các bước khám phá">
        <p className="home-journey-aside-title">Cùng tìm lối đi của bạn.</p>
        <p className="home-journey-aside-copy">Mở ngay chức năng mình cần hoặc cuộn để xem từng phần. Không cần đi hết hành trình.</p>
        <div className="home-journey-progress" aria-hidden="true"><motion.span style={{ scaleX: scrollYProgress }} /></div>
        <nav className="home-journey-chapters" aria-label="Các phần hướng dẫn">{chapters.map((name, index) => <a key={name} href={`#home-chapter-${index}`} className={chapter === index ? 'is-current' : ''} aria-current={chapter === index ? 'step' : undefined}>{name}</a>)}</nav>
      </aside>
      <div className="home-journey-scenes">
        <article id="home-chapter-0" className="home-journey-scene" aria-labelledby="home-mood-title">
          <h3 id="home-mood-title">Bạn đang<br /><em>tìm điều gì?</em></h3>
          <p>Chọn một mục để xem nơi bạn có thể đến tiếp theo.</p>
          <div className="home-moods" role="group" aria-label="Mục đích khám phá">{paths.map((item, index) => {
            const Icon = item.icon;
            return <button type="button" key={item.title} aria-pressed={path === index} data-guide-caption={item.description} onClick={() => setPath(index)}><Icon size={20} aria-hidden="true" /><span>{item.title}</span><ArrowUpRight size={17} aria-hidden="true" /></button>;
          })}</div>
          <p className="home-mood-description" role="status">{paths[path].description}</p>
          {paths[path].href.startsWith('#') ? <a className="home-story-link" href={paths[path].href}>{paths[path].label}<ArrowDown size={17} /></a> : <Link className="home-story-link" to={paths[path].href}>{paths[path].label}<ArrowUpRight size={17} /></Link>}
        </article>
        <article id="home-chapter-1" className="home-journey-scene home-journey-gallery" aria-labelledby="home-frame-title">
          <h3 id="home-frame-title">Một ảnh khiến bạn<br /><em>muốn dừng lại?</em></h3>
          <p>Chọn một ảnh để xem tên, chủ đề và thông tin hiện có. Nút mở ảnh đưa bạn tới trang chi tiết thật.</p>
          {photos.length ? <>
            <div className="home-journey-photo-pair">{photos.map(photo => <figure key={photo.id}>
              <button className="home-photo-select" type="button" aria-pressed={selected?.id === photo.id} aria-label={`Xem thông tin: ${photo.title}`} data-guide-caption={`Bạn đang chọn ảnh “${photo.title}”. Thông tin bên dưới thuộc ảnh này.`} onClick={() => setSelectedId(photo.id)}><JourneyImage key={photo.image} src={photo.image} title={photo.title} /></button>
              <figcaption>{photo.title}</figcaption>
            </figure>)}</div>
            {selected && <div className="home-photo-details" aria-live="polite" aria-atomic="true">
              <h4>{selected.title}</h4>
              <dl><div><dt>Chủ đề</dt><dd>{selected.category || 'Chưa có thông tin'}</dd></div>{selected.author && <div><dt>Tác giả</dt><dd>{selected.author}</dd></div>}<div><dt>Kích thước</dt><dd>{selected.width} × {selected.height} px</dd></div></dl>
              <Link className="home-story-link" to={`/photos/${generateImageSlug(selected.title, selected.id)}`} data-guide-caption="Mở trang ảnh để xem nội dung và các thông tin chi tiết hiện có.">Mở ảnh này<ArrowUpRight size={17} /></Link>
            </div>}
          </> : <div className="home-journey-photo-placeholder"><Camera size={32} /><p>Chưa có ảnh để xem thử tại đây.</p><Link to="/explore">Đến trang Khám phá</Link></div>}
          <p className="home-photo-source">Ảnh lấy từ nội dung đang có trên PhotoCloud; không dùng làm minh chứng cho một buổi chụp dịch vụ.</p>
          <Link className="home-story-link" to="/explore">Tìm thêm cảm hứng <ArrowUpRight size={17} /></Link>
        </article>
        <article id="home-chapter-2" className="home-journey-scene" aria-labelledby="home-story-title">
          <h3 id="home-story-title">Nhiều khung hình.<br /><em>Một lối khám phá khác.</em></h3>
          <p>Bộ sưu tập là nơi xem một nhóm ảnh cùng nhau. Chọn từng bước dưới đây để tìm hiểu cách bắt đầu.</p>
          <ol className="home-shoot-story">{collectionSteps.map((item, index) => <li key={item.title}><button type="button" className="home-collection-step" aria-pressed={collectionStep === index} data-guide-caption={item.description} onClick={() => setCollectionStep(index)}>{item.title}<ArrowUpRight size={17} /></button></li>)}</ol>
          <p role="status">{collectionSteps[collectionStep].description}</p>
          <Link className="home-story-link" to="/collections" data-guide-caption="Mở danh sách bộ sưu tập; chọn một bộ để xem các ảnh bên trong.">Khám phá bộ sưu tập<ArrowUpRight size={17} /></Link>
        </article>
        <article id="home-chapter-3" className="home-journey-scene home-journey-invitation" aria-labelledby="home-ready-title">
          <h3 id="home-ready-title">Đến lượt<br /><em>buổi chụp của bạn.</em></h3>
          <p>Xem các gói đang được công bố hoặc gửi ý tưởng riêng để bắt đầu trao đổi. Gửi yêu cầu chưa đồng nghĩa lịch chụp đã được xác nhận.</p>
          <a className="studio-cta-primary" href="#home-packages">Xem gói chụp <ArrowDown size={17} /></a>
          <button type="button" className="home-story-link" data-guide-caption="Bạn có thể mô tả ý tưởng trong form báo giá; chỉ gửi khi đã kiểm tra thông tin." onClick={() => openBookingModal({ mode: 'custom-quote' })}>Trao đổi ý tưởng riêng <ArrowUpRight size={17} /></button>
          <Link className="home-story-link" to="/explore">Tôi muốn tiếp tục xem ảnh<ArrowUpRight size={17} /></Link>
        </article>
      </div>
    </div>
  </section>;
}
