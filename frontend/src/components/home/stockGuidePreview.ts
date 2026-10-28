import * as T from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

const canvas = document.querySelector<HTMLCanvasElement>('canvas');
const status = document.querySelector<HTMLElement>('#status');
const buttons = [...document.querySelectorAll<HTMLButtonElement>('[data-clip]')];
const preference = matchMedia('(prefers-reduced-motion: reduce)');
let disposed = false;
let cleanup: (() => void) | undefined;

async function start(element: HTMLCanvasElement): Promise<void> {
  const renderer = new T.WebGLRenderer({ canvas: element, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.toneMapping = T.ACESFilmicToneMapping;
  const scene = new T.Scene();
  const camera = new T.PerspectiveCamera(35, 1, .1, 100);
  camera.position.set(4, 2.8, 7.5); camera.lookAt(0, 1.55, 0);
  const room = new RoomEnvironment();
  const generator = new T.PMREMGenerator(renderer);
  const environment = generator.fromScene(room, .04);
  scene.environment = environment.texture; scene.environmentIntensity = .75;
  room.dispose(); generator.dispose();
  const key = new T.DirectionalLight(0xfff2db, 2); key.position.set(-3, 5, 4); scene.add(key);
  const mixer = new T.AnimationMixer(scene);
  let active: T.AnimationAction | undefined;
  const actions = new Map<string, T.AnimationAction>();
  let frame = 0, previous = 0;
  function render(time: number): void {
    frame = 0;
    if (disposed || document.hidden) return;
    if (!preference.matches) mixer?.update(previous ? Math.min(.05, (time - previous) / 1000) : 0);
    previous = time;
    renderer.render(scene, camera);
    if (!preference.matches) frame = requestAnimationFrame(render);
  }
  function draw(): void { if (!frame && !disposed) frame = requestAnimationFrame(render); }
  function select(name: string): void {
    const next = actions.get(name);
    if (!next) return;
    if (preference.matches) { mixer?.stopAllAction(); next.reset().play(); mixer?.update(.65); }
    else if (active !== next) { active?.fadeOut(.25); next.reset().fadeIn(.25).play(); }
    active = next;
    buttons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.clip === name)));
    if (status) status.textContent = preference.matches ? 'Tư thế tĩnh — đang giảm chuyển động.' : `Đang chạy: ${buttons.find(button => button.dataset.clip === name)?.textContent ?? name}`;
    draw();
  }
  const listeners = buttons.map(button => {
    const click = (): void => select(button.dataset.clip ?? 'Idle');
    button.addEventListener('click', click); return () => button.removeEventListener('click', click);
  });
  const resize = new ResizeObserver(() => {
    const rect = element.getBoundingClientRect();
    renderer.setSize(rect.width, rect.height, false);
    camera.aspect = rect.width / Math.max(1, rect.height);
    camera.position.z = 7.5 * Math.max(1, .85 / camera.aspect);
    camera.updateProjectionMatrix(); draw();
  });
  resize.observe(element);
  const visibility = (): void => { previous = 0; draw(); };
  const motion = (): void => select(active?.getClip().name ?? 'Idle');
  document.addEventListener('visibilitychange', visibility);
  preference.addEventListener('change', motion);
  const disposeModel = (root: T.Object3D): void => root.traverse(node => {
    if (node instanceof T.Mesh) {
      node.geometry.dispose();
      (Array.isArray(node.material) ? node.material : [node.material]).forEach(material => material.dispose());
    }
  });
  cleanup = () => {
    cancelAnimationFrame(frame); resize.disconnect(); listeners.forEach(remove => remove());
    document.removeEventListener('visibilitychange', visibility); preference.removeEventListener('change', motion);
    mixer?.stopAllAction(); if (mixer) mixer.uncacheRoot(mixer.getRoot());
    disposeModel(scene); environment.dispose(); renderer.dispose(); renderer.forceContextLoss();
  };
  const gltf = await new GLTFLoader().loadAsync('/models/photocloud-guide/RobotExpressive.glb');
  if (disposed) { disposeModel(gltf.scene); return; }
  const bounds = new T.Box3().setFromObject(gltf.scene);
  const scale = 3 / bounds.getSize(new T.Vector3()).y;
  const root = new T.Group(); root.scale.setScalar(scale); root.position.y = -bounds.min.y * scale;
  root.add(gltf.scene); scene.add(root);
  gltf.animations.forEach(clip => actions.set(clip.name, mixer.clipAction(clip, gltf.scene)));
  buttons.forEach(button => { button.disabled = false; }); select('Idle');
}
const stop = (): void => { disposed = true; cleanup?.(); };
window.addEventListener('pagehide', stop, { once: true });
if (import.meta.hot) import.meta.hot.dispose(stop);
if (canvas) void start(canvas).catch(() => { stop(); if (status) status.textContent = 'Không tải được model hoặc WebGL. Hãy tải lại trang để thử lại.'; });
