import type { GuideAction } from './createPhotographer';

export type Choice = { label: string; target: string | HTMLElement; click?: boolean };
export type Dialogue = { caption: string; action: GuideAction; choices: Choice[] };
type Stop = Dialogue & { selector: string };
const explore: Choice = { label: 'Khám phá ảnh', target: '/explore' };
const collections: Choice = { label: 'Bộ sưu tập', target: '/collections' };
const packages: Choice = { label: 'Xem gói chụp', target: '#home-packages' };
const contact: Choice = { label: 'Liên hệ studio', target: '/contact' };
const booking: Choice = { label: 'Mở form đặt lịch', target: 'booking' };
export const stops: Stop[] = [
  { selector: '.travel-stage', action: 'wave', caption: 'Chào bạn! Bạn muốn bắt đầu từ đâu?', choices: [explore, collections, packages] },
  { selector: '.home-wayfinding', action: 'point', caption: 'Bạn muốn xem ảnh, bộ sưu tập hay tìm dịch vụ chụp?', choices: [explore, collections, packages] },
  { selector: '.hero-section', action: 'album', caption: 'Bạn thích bộ ảnh này? Tôi có thể dẫn bạn xem thêm.', choices: [collections, { label: 'Tiếp tục khám phá', target: '.home-journey' }] },
  { selector: '.home-journey', action: 'point', caption: 'Bạn muốn tìm một góc nhìn mới hay chuẩn bị buổi chụp của riêng mình?', choices: [explore, collections, packages] },
  { selector: '.home-journey-gallery', action: 'photo', caption: 'Chọn một ảnh để xem thông tin. Bạn cũng có thể mở trang ảnh thật.', choices: [{ label: 'Mở ảnh đang chọn', target: '.home-photo-details a', click: true }, explore] },
  { selector: '#home-chapter-2', action: 'album', caption: 'Một bộ sưu tập gom các bức ảnh theo một chủ đề. Cùng khám phá nhé.', choices: [collections, { label: 'Tìm dịch vụ chụp', target: '.home-journey-invitation' }] },
  { selector: '.home-journey-invitation', action: 'calendar', caption: 'Bạn muốn có một buổi chụp của riêng mình?', choices: [packages, { label: 'Trao đổi ý tưởng', target: '.home-journey-invitation button', click: true }] },
  { selector: '#home-packages', action: 'point', caption: 'Cùng xem thời lượng, giá và nội dung từng gói trước khi chọn nhé.', choices: [{ label: 'Xem các gói', target: '#home-packages' }, { label: 'Xem quy trình', target: '.home-booking-flow' }, contact] },
  { selector: '.home-booking-flow', action: 'calendar', caption: 'Cùng xem các bước gửi yêu cầu và xác nhận lịch chụp.', choices: [booking, packages] },
  { selector: '.testimonials-carousel', action: 'album', caption: 'Phần câu chuyện này đang dùng nội dung minh họa.', choices: [{ label: 'Xem câu hỏi thường gặp', target: '.home-booking-faq' }, contact] },
  { selector: '.home-booking-faq', action: 'listen', caption: 'Bạn đang băn khoăn điều gì? Mở một câu hỏi nhé.', choices: [{ label: 'Xem câu hỏi', target: '.home-booking-faq' }, contact] },
  { selector: '.home-bottom-cta', action: 'calendar', caption: 'Bạn muốn tiếp tục theo hướng nào?', choices: [explore, collections, booking] },
];

// These states belong to the existing content. Retry delegates to its own button.
export function contentState(index: number): Dialogue | null {
  if (index === 0 || index === 4 && document.querySelector('.home-journey-photo-placeholder')) {
    const empty = document.querySelector('.visual-art-slider .travel-empty');
    const retry = empty?.querySelector<HTMLButtonElement>('.slider-retry');
    if (retry) return { action: 'listen', caption: 'Chưa tải được ảnh nổi bật. Bạn có thể thử lại hoặc khám phá ảnh khác.', choices: [{ label: 'Thử tải ảnh', target: retry, click: true }, explore] };
    if (empty?.querySelector('[role="status"]') && !empty.textContent?.includes('Chưa có ảnh')) return { action: 'listen', caption: 'Đang tải ảnh nổi bật. Bạn vẫn có thể khám phá các phần khác.', choices: [explore, packages] };
  }
  if (index === 4 && document.querySelector('.home-journey-photo-placeholder')) return {
    action: 'listen', caption: 'Chưa có ảnh để xem ở đây. Bạn muốn khám phá ảnh khác?', choices: [explore, collections],
  };
  const selector = index === 5 ? '#home-chapter-2' : stops[index].selector;
  const sectionNode = document.querySelector<HTMLElement>(selector);
  if (index === 5) {
    const retry = sectionNode?.querySelector<HTMLButtonElement>('[role="status"] button');
    if (retry) return { action: 'listen', caption: 'Chưa tải được bộ sưu tập. Bạn có thể thử lại.', choices: [{ label: 'Thử tải bộ sưu tập', target: retry, click: true }, collections] };
    if (sectionNode?.querySelector('.home-collection-preview > [role="status"]')) return { action: 'listen', caption: 'Đang tải bộ sưu tập. Bạn chờ một chút nhé.', choices: [explore] };
    if (!sectionNode?.querySelector('.home-collection-story')) return { action: 'listen', caption: 'Chưa có bộ sưu tập công khai để xem thử. Bạn có thể khám phá ảnh trước.', choices: [explore, collections] };
  }
  if (index !== 7) {
    const auto = sectionNode?.matches('[data-guide-auto="true"]') ? sectionNode : index === 3 ? null : sectionNode?.querySelector<HTMLElement>('[data-guide-auto="true"]');
    if (!auto?.dataset.guideCaption) return null;
    let detail = auto;
    for (const node of auto.querySelectorAll<HTMLElement>('[data-guide-step][data-guide-caption]')) {
      const rect = node.getBoundingClientRect();
      if (rect.top <= Math.min(innerHeight * .42, 350) && rect.bottom >= 80) detail = node;
    }
    const action = detail.dataset.guideAction;
    const target = auto.dataset.guideTarget;
    const choices = target ? [{ label: index === 0 ? 'Mở ảnh đang xem' : 'Mở bộ sưu tập này', target }, ...(index === 0 ? [explore, packages] : [collections])]
      : stops[index].choices;
    return { action: action === 'photo' || action === 'album' || action === 'calendar' ? action : stops[index].action, caption: detail.dataset.guideCaption || auto.dataset.guideCaption, choices };
  }
  const section = document.querySelector('#home-packages');
  const retry = section?.querySelector<HTMLButtonElement>('[role="status"] button');
  if (retry) return { action: 'listen', caption: 'Chưa tải được gói chụp hiện tại. Bạn có thể thử lại.', choices: [{ label: retry.disabled ? 'Đang thử lại…' : 'Thử lại', target: retry, click: true }, contact] };
  if (section?.textContent?.includes('Đang tải gói chụp')) return { action: 'listen', caption: 'Đang tải gói chụp. Bạn chờ một chút nhé.', choices: [explore] };
  if (section && !section.querySelector('.home-package-card')) return { action: 'listen', caption: 'Studio chưa công bố gói chụp. Bạn có thể trao đổi ý tưởng riêng.', choices: [contact, explore] };
  const cards = [...(section?.querySelectorAll<HTMLElement>('.home-package-card') || [])];
  const card = cards.filter(node => !node.closest('[hidden]') && node.getBoundingClientRect().top < Math.min(innerHeight * .42, 350)).at(-1);
  if (!card?.dataset.guideCaption) return null;
  const button = card.querySelector<HTMLButtonElement>('button:not(:disabled)');
  const summary = card.querySelector<HTMLElement>('summary');
  const details = card.querySelector<HTMLDetailsElement>('details[open]');
  return { action: details ? 'calendar' : 'point', caption: details?.dataset.guideCaption || card.dataset.guideCaption, choices: [...(summary ? [{ label: 'Xem gồm những gì', target: summary, click: true }] : []), ...(button ? [{ label: 'Chọn gói này', target: button, click: true }] : [contact])] };
}

