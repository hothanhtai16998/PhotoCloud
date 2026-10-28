import * as T from 'three';
import { createGuideModel } from './createGuideModel';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

export type GuideAction = 'wave' | 'point' | 'photo' | 'album' | 'listen' | 'calendar';
export interface PhotographerController {
  setAction: (action: GuideAction) => void;
  setTravel: (amount: number) => void;
  greet: () => void;
  dispose: () => void;
}

/** A single articulated camera companion; the page owns its itinerary. */
export function createPhotographer(canvas: HTMLCanvasElement, reducedMotion: boolean): PhotographerController {
  const renderer = new T.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  const scene = new T.Scene();
  const room = new RoomEnvironment();
  const pmrem = new T.PMREMGenerator(renderer);
  const environment = pmrem.fromScene(room, .04);
  scene.environment = environment.texture;
  scene.environmentIntensity = .55;
  room.dispose(); pmrem.dispose();
  const camera = new T.PerspectiveCamera(32, 1, .1, 30);
  camera.position.set(0, 1.5, 5.9); camera.lookAt(0, 1.3, 0);
  scene.add(new T.HemisphereLight(0xf3f8ff, 0x59685e, .8));
  const light = new T.DirectionalLight(0xfff2df, 3); light.position.set(-3, 5, 5); scene.add(light);
  const rim = new T.DirectionalLight(0xc6e9e3, 2); rim.position.set(4, 2, -2); scene.add(rim);
  const { figure, body, head, arms, eyes, smile, photoCamera, album, calendar, strap } = createGuideModel();
  scene.add(figure);
  let action: GuideAction = 'wave', travel = 0, greeting = -10, pointer = 0, gaze = 0;
  let actionStarted = performance.now() / 1000;
  let visible = true, disposed = false, frame = 0;
  const joints = [figure, body, head, photoCamera, ...arms.flatMap(a => [a.shoulder, a.elbow])];
  let previousTime = 0;
  const render = (time: number): void => {
    frame = 0;
    if (disposed || !visible || document.hidden || getComputedStyle(canvas).visibility === 'hidden' || !canvas.getClientRects().length) return;
    const blend = reducedMotion || !previousTime ? 1 : 1 - Math.exp(-Math.min(64, time - previousTime) / 100);
    previousTime = time;
    const previousRotations = joints.map(joint => joint.quaternion.clone());
    const t = time / 1000, moving = reducedMotion ? 0 : travel;
    const age = t - Math.max(actionStarted, greeting);
    const waving = reducedMotion ? action === 'wave' : (action === 'wave' || t - greeting < 2.6) && age < 2.6;
    const breath = reducedMotion ? 0 : Math.sin(t * 1.65);
    gaze += (pointer - gaze) * blend;
    const reading = action === 'album' || action === 'calendar';
    const takingPhoto = action === 'photo' && !waving;
    figure.rotation.y = action === 'point' ? -.28 : .2;
    figure.rotation.z = reducedMotion ? 0 : -moving * .08 + breath * .012;
    figure.position.y = breath * .014;
    body.rotation.set(0, 0, 0);
    head.rotation.set(reading ? .13 : takingPhoto ? -.06 : breath * .015, gaze * .16, action === 'listen' ? -.14 : waving ? -.07 : breath * .018);
    arms.forEach(({ shoulder, elbow }, i) => {
      const side = i === 0 ? -1 : 1;
      shoulder.rotation.set(reading ? -1.05 : takingPhoto ? -1.95 : -.08, 0, takingPhoto || reading ? side * -.27 : side * .12);
      elbow.rotation.set(reading || takingPhoto ? -.45 : -.1, 0, 0);
    });
    if (waving) {
      arms[1].shoulder.rotation.set(-.12, 0, 2.05);
      arms[1].elbow.rotation.z = reducedMotion ? .15 : .15 + Math.sin(age * 7) * .22;
    } else if (action === 'point') {
      arms[0].shoulder.rotation.set(-.2, 0, -1.25);
      arms[0].elbow.rotation.z = -.15;
    }
    album.visible = action === 'album' && !waving;
    calendar.visible = action === 'calendar' && !waving;
    photoCamera.visible = !reading || waving;
    strap.visible = photoCamera.visible;
    photoCamera.position.y += ((takingPhoto ? 1.48 : 1.03) - photoCamera.position.y) * blend;
    photoCamera.rotation.x = takingPhoto ? -.1 : 0;
    const blinkPhase = t % 4.7;
    const blink = reducedMotion ? 1 : 1 - .9 * Math.max(0, 1 - Math.abs(blinkPhase - .14) / .12);
    eyes.forEach((eye, index) => {
      eye.scale.y = (action === 'listen' ? .16 : .155) * blink;
      eye.position.x = (index === 0 ? -.23 : .23) + gaze * .025;
    });
    smile.visible = !takingPhoto;
    joints.forEach((joint, index) => { const target = joint.quaternion.clone(); joint.quaternion.copy(previousRotations[index]).slerp(target, blend); });
    renderer.render(scene, camera);
    if (!reducedMotion) frame = requestAnimationFrame(render);
  };
  const draw = (): void => { if (!frame && !disposed) frame = requestAnimationFrame(render); };
  const resize = (): void => { const rect = canvas.getBoundingClientRect(); renderer.setSize(Math.max(1, rect.width), Math.max(1, rect.height), false); camera.aspect = rect.width / Math.max(1, rect.height); camera.position.z = 5.9 * Math.max(1, 1.05 / camera.aspect); camera.updateProjectionMatrix(); draw(); };
  const sizing = new ResizeObserver(resize); sizing.observe(canvas);
  const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; draw(); }); observer.observe(canvas);
  const visibility = (): void => { if (!document.hidden) draw(); }; document.addEventListener('visibilitychange', visibility);
  const move = (event: PointerEvent): void => { const rect = canvas.getBoundingClientRect(); pointer = (event.clientX - rect.left) / rect.width * 2 - 1; draw(); }; canvas.addEventListener('pointermove', move);
  resize();
  return {
    setAction(value) { if (action !== value) actionStarted = performance.now() / 1000; action = value; draw(); },
    setTravel(value) { travel = Math.min(1, Math.max(0, value)); draw(); },
    greet() { greeting = performance.now() / 1000; draw(); },
    dispose() {
      disposed = true; cancelAnimationFrame(frame); sizing.disconnect(); observer.disconnect();
      document.removeEventListener('visibilitychange', visibility); canvas.removeEventListener('pointermove', move);
      const geometries = new Set<T.BufferGeometry>(), materials = new Set<T.Material>();
      scene.traverse(node => { if (node instanceof T.Mesh) { geometries.add(node.geometry); (Array.isArray(node.material) ? node.material : [node.material]).forEach(mat => materials.add(mat)); } });
      geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); environment.dispose(); renderer.dispose(); renderer.forceContextLoss();
    },
  };
}

