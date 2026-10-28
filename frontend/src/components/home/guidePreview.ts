import { createPhotographer, type GuideAction, type PhotographerController } from './createPhotographer';

let controllers: PhotographerController[] = [];
let moving = false;
const preference = matchMedia('(prefers-reduced-motion: reduce)');
const status = document.querySelector<HTMLElement>('#status');
const button = document.querySelector<HTMLButtonElement>('#motion');
function clear(): void { controllers.forEach(controller => controller.dispose()); controllers = []; }
function mount(): void {
  clear();
  try {
    for (const action of ['wave', 'photo', 'album'] satisfies GuideAction[]) {
      const previous = document.querySelector<HTMLCanvasElement>(`#${action}`);
      if (!previous) continue;
      // Context loss is asynchronous; a fresh canvas avoids reusing a disposed WebGL context.
      const canvas = previous.cloneNode(false) as HTMLCanvasElement;
      previous.replaceWith(canvas);
      const controller = createPhotographer(canvas, !moving || preference.matches);
      controllers.push(controller);
      controller.setAction(action);
    }
    if (status) status.textContent = preference.matches ? 'Đang tôn trọng tùy chọn giảm chuyển động của thiết bị.' : moving ? 'Đang xem chuyển động thử.' : 'Ba tư thế tĩnh để kiểm tra tạo hình.';
  } catch {
    clear();
    if (status) status.textContent = 'Không dựng được nhân vật 3D. Hãy thử tải lại trang bằng trình duyệt hỗ trợ WebGL.';
  }
}
button?.addEventListener('click', () => {
  moving = !moving;
  button.setAttribute('aria-pressed', String(moving));
  button.textContent = moving ? 'Dừng chuyển động thử' : 'Bật chuyển động thử';
  mount();
});
preference.addEventListener('change', mount);
window.addEventListener('pagehide', clear);
if (import.meta.hot) import.meta.hot.dispose(() => { clear(); preference.removeEventListener('change', mount); window.removeEventListener('pagehide', clear); });
mount();
