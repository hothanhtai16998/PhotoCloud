import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMotionValueEvent, useScroll } from 'motion/react';
import { ArrowDown, ArrowUpRight, Camera, Images, Search } from 'lucide-react';
import { useSliderStore } from '@/stores/useSliderStore';
import { generateImageSlug } from '@/lib/utils';
import { openBookingModal } from '@/utils/bookingModalEvent';
import './HomeJourney.css';
import type { HomeCollectionsState } from './useHomeCollections';
import { photoCaption, photoFacts } from './homeGuideFacts';
import { HomeCollectionCards } from './HomeCollectionCards';

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

export function HomeJourney({ collectionState }: { collectionState: HomeCollectionsState }) {
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
    <div className="home-journey-layout">
      <div className="home-journey-scenes">
        <article id="home-chapter-0" className="home-journey-scene home-journey-intro" aria-labelledby="home-journey-title">
          <div className="home-journey-heading">
            <h1 id="home-journey-title">Tìm cảm hứng qua ảnh.</h1>
            <p>Khám phá một bức ảnh, xem cả bộ sưu tập hoặc bắt đầu buổi chụp của riêng bạn.</p>
          </div>
        <nav className="home-journey-chapters" aria-label="Các phần hướng dẫn">{chapters.map((name, index) => <a key={name} href={`#home-chapter-${index}`} className={chapter === index ? 'is-current' : ''} aria-current={chapter === index ? 'step' : undefined}>{name}</a>)}</nav>
          <div className="home-moods" role="group" aria-label="Mục đích khám phá">{paths.map((item, index) => {
            const Icon = item.icon;
            return <button type="button" key={item.title} aria-pressed={path === index} data-guide-caption={item.description} onClick={() => setPath(index)}><Icon size={20} aria-hidden="true" /><span>{item.title}</span><ArrowUpRight size={17} aria-hidden="true" /></button>;
          })}</div>
          <p className="home-mood-description" role="status">{paths[path].description}</p>
          {paths[path].href.startsWith('#') ? <a className="home-story-link" href={paths[path].href}>{paths[path].label}<ArrowDown size={17} /></a> : <Link className="home-story-link" to={paths[path].href}>{paths[path].label}<ArrowUpRight size={17} /></Link>}
        </article>
        <article id="home-chapter-1" className="home-journey-scene home-journey-gallery" aria-labelledby="home-frame-title">
          <h2 id="home-frame-title">Dừng lại ở<br /><em>một bức ảnh.</em></h2>
          <p>Hai khung hình từ PhotoCloud. Chọn ảnh để xem câu chuyện và tác giả.</p>
          {photos.length ? <>
            <div className="home-journey-photo-pair">{photos.map(photo => <figure key={photo.id}>
              <button className="home-photo-select" type="button" aria-pressed={selected?.id === photo.id} aria-label={`Xem thông tin: ${photo.title}`} data-guide-caption={photoCaption(photo)} data-guide-action="photo" onClick={() => setSelectedId(photo.id)}><JourneyImage key={photo.image} src={photo.image} title={photo.title} /></button>
              <figcaption>{photo.title}</figcaption>
            </figure>)}</div>
            {selected && <div className="home-photo-details" aria-live="polite" aria-atomic="true" data-guide-auto="true" data-guide-caption={photoCaption(selected)} data-guide-action="photo">
              <h4>{selected.title}</h4>
              {selected.imageData?.description && <p className="home-photo-description" data-guide-step="true" data-guide-action="photo" data-guide-caption={selected.imageData.description}>{selected.imageData.description}</p>}
              <dl>{photoFacts(selected).map(([label, value]) => <div key={label} data-guide-step="true" data-guide-action="photo" data-guide-caption={`${label} của “${selected.title}”: ${value}.`}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
              <Link className="home-story-link" to={`/photos/${generateImageSlug(selected.title, selected.id)}`} data-guide-caption="Mở trang ảnh để xem nội dung và các thông tin chi tiết hiện có.">Mở ảnh này<ArrowUpRight size={17} /></Link>
            </div>}
          </> : <div className="home-journey-photo-placeholder"><Camera size={32} /><p>Chưa có ảnh để xem thử tại đây.</p><Link to="/explore">Đến trang Khám phá</Link></div>}
          <p className="home-photo-source">Ảnh trong thư viện PhotoCloud; không phải ảnh mẫu của gói dịch vụ.</p>
          <div className="home-chapter-next">
            <p>Muốn xem nhiều khung hình cùng một chủ đề?</p>
            <a className="home-story-link" href="#home-chapter-2">Khám phá một bộ sưu tập<ArrowDown size={17} /></a>
            <Link className="home-story-link" to="/explore">Tìm thêm cảm hứng<ArrowUpRight size={17} /></Link>
          </div>
        </article>
        <article id="home-chapter-2" className="home-journey-scene" aria-labelledby="home-story-title">
          <h2 id="home-story-title">Từ một bức ảnh<br /><em>đến cả bộ sưu tập.</em></h2>
          <p>Một vài bộ sưu tập để bạn xem ngay. Mở bộ bạn thích để khám phá những ảnh bên trong.</p>
          <div className="home-collection-preview">
            {collectionState.loading ? <p role="status">Đang tải bộ sưu tập…</p> : collectionState.error ? <p role="status">Chưa tải được bộ sưu tập. <button type="button" className="home-story-link" onClick={collectionState.retry}>Thử tải bộ sưu tập</button></p> : !collectionState.collections.length ? <p>Chưa có bộ sưu tập công khai để xem thử.</p> : <HomeCollectionCards collections={collectionState.collections} />}

          </div>
          <details className="home-collection-help">
            <summary>Cách khám phá một bộ sưu tập</summary>
            <ol className="home-shoot-story">{collectionSteps.map((item, index) => <li key={item.title}><button type="button" className="home-collection-step" aria-pressed={collectionStep === index} data-guide-caption={item.description} onClick={() => setCollectionStep(index)}>{item.title}<ArrowUpRight size={17} /></button></li>)}</ol>
            <p role="status">{collectionSteps[collectionStep].description}</p>
          </details>
          <div className="home-chapter-next">
            <p>Đã có cảm hứng cho bộ ảnh của riêng mình?</p>
            <a className="home-story-link" href="#home-chapter-3">Chuẩn bị buổi chụp của bạn<ArrowDown size={17} /></a>
            <Link className="home-story-link" to="/collections" data-guide-caption="Mở danh sách bộ sưu tập; chọn một bộ để xem các ảnh bên trong.">Xem tất cả bộ sưu tập<ArrowUpRight size={17} /></Link>
          </div>
        </article>
        <article id="home-chapter-3" className="home-journey-scene home-journey-invitation" aria-labelledby="home-ready-title">
          <h2 id="home-ready-title">Muốn có bộ ảnh<br /><em>của riêng bạn?</em></h2>
          <p>Xem các gói ngay bên dưới, hoặc gửi ý tưởng riêng để bắt đầu trao đổi với studio.</p>
          <details className="home-idea-checklist" data-guide-auto="true" data-guide-action="calendar" data-guide-caption="Bạn có thể chuẩn bị ảnh tham khảo, số người, địa điểm và ngày mong muốn trước khi gửi ý tưởng.">
            <summary>Chuẩn bị gì khi gửi ý tưởng?</summary>
            <ul>{[
              { title: 'Phong cách', detail: 'Ảnh tham khảo hoặc cảm giác bạn muốn giữ lại.' },
              { title: 'Người tham gia', detail: 'Bạn chụp một mình, cùng người thương hay gia đình?' },
              { title: 'Địa điểm', detail: 'Nơi bạn thích hoặc muốn studio gợi ý.' },
              { title: 'Thời gian', detail: 'Ngày và khung giờ bạn đang dự tính.' },
            ].map(item => <li key={item.title} data-guide-step="true" data-guide-action="calendar" data-guide-caption={`${item.title}: ${item.detail}`}><strong>{item.title}</strong><span>{item.detail}</span></li>)}</ul>
          </details>
          <div className="home-invitation-actions">
            <a className="studio-cta-primary" href="#home-packages">Xem gói chụp <ArrowDown size={17} /></a>
            <button type="button" className="home-story-link" data-guide-caption="Bạn có thể mô tả ý tưởng trong form báo giá; chỉ gửi khi đã kiểm tra thông tin." onClick={() => openBookingModal({ mode: 'custom-quote' })}>Trao đổi ý tưởng riêng <ArrowUpRight size={17} /></button>
          </div>
          <p className="home-invitation-note">Gửi yêu cầu là bước bắt đầu trao đổi; lịch chụp chỉ được chốt sau khi studio xác nhận.</p>
          <Link className="home-story-link home-invitation-explore" to="/explore">Tiếp tục tìm cảm hứng<ArrowUpRight size={17} /></Link>
        </article>
      </div>
    </div>
  </section>;
}
