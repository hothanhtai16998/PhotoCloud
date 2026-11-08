import type { GuideAction, PhotographerController } from './createPhotographer';

const cells: Record<GuideAction, number> = { wave: 0, point: 1, photo: 2, album: 3, listen: 4, calendar: 5 };

/** One opaque paper pose per frame. Position motion belongs to HomeTourGuide. */
export async function createPaperGuide(canvas: HTMLCanvasElement, signal?: AbortSignal): Promise<PhotographerController> {
  const atlas = new Image();
  await new Promise<void>((resolve, reject) => {
    const cleanup = (): void => {
      window.clearTimeout(timeout);
      signal?.removeEventListener('abort', abort);
      atlas.onload = null;
      atlas.onerror = null;
    };
    const fail = (message: string): void => { cleanup(); atlas.src = ''; reject(new Error(message)); };
    const abort = (): void => fail('Paper guide loading cancelled');
    const timeout = window.setTimeout(() => fail('Paper guide loading timed out'), 8000);
    atlas.onload = () => { cleanup(); resolve(); };
    atlas.onerror = () => fail('Paper guide image unavailable');
    signal?.addEventListener('abort', abort, { once: true });
    if (signal?.aborted) { abort(); return; }
    atlas.src = '/images/home-guide/paper-guide-poses.png';
  });
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas 2D unavailable');
  let action: GuideAction = 'wave';
  let disposed = false, greetingTimer = 0;
  const cellWidth = atlas.naturalWidth / 3, cellHeight = atlas.naturalHeight / 2;
  function paint(pose: GuideAction): void {
    if (!context) return;
    const cell = cells[pose];
    context.globalAlpha = 1;
    const size = Math.min(canvas.width, canvas.height);
    context.drawImage(atlas, (cell % 3) * cellWidth, Math.floor(cell / 3) * cellHeight, cellWidth, cellHeight,
      (canvas.width - size) / 2, (canvas.height - size) / 2, size, size);
  }
  function draw(): void {
    if (disposed) return;
    context!.clearRect(0, 0, canvas.width, canvas.height);
    // Distinct atlas silhouettes cannot be blended without duplicate limbs/props.
    // Clear and draw synchronously so neither a ghost pose nor a blank frame is shown.
    paint(action);
  }
  function select(value: GuideAction): void {
    if (disposed || action === value) return;
    action = value; draw();
    canvas.dataset.pose = value;
  }
  const resize = new ResizeObserver(() => {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(devicePixelRatio, 2);
    const width = Math.max(1, Math.round(rect.width * dpr));
    const height = Math.max(1, Math.round(rect.height * dpr));
    if (canvas.width === width && canvas.height === height) return;
    canvas.width = width;
    canvas.height = height;
    draw();
  });
  resize.observe(canvas); canvas.dataset.pose = action;
  return {
    setAction(value) { window.clearTimeout(greetingTimer); select(value); },
    setTravel() { /* Position follows the scene; paper figures do not walk in place. */ },
    greet() {
      window.clearTimeout(greetingTimer);
      const restore = action;
      select('wave');
      greetingTimer = window.setTimeout(() => select(restore), 1800);
    },
    dispose() { disposed = true; resize.disconnect(); window.clearTimeout(greetingTimer); },
  };
}
