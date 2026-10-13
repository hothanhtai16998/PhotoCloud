import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

export const STAGE_PHOTOS = ['/preview-assets/portrait.jpg', '/preview-assets/couple.jpg', '/preview-assets/family.jpg'];
type StageProps = { progress: React.RefObject<number>; reduced: boolean; selected: number | null; running: boolean; onSelect: (index: number) => void };

export function PhotoStage({ progress, reduced, selected, running, onSelect }: StageProps) {
  const host = useRef<HTMLDivElement>(null);
  const current = useRef({ selected, running, onSelect });
  current.current = { selected, running, onSelect };
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(0);
  useEffect(() => {
    const container = host.current!;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' }); }
    catch { setFailed(true); return; }
    let alive = true;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#f0efeb'); scene.fog = new THREE.Fog('#f0efeb', 30, 60);
    const camera = new THREE.PerspectiveCamera(37, 1, .1, 90);
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5)); renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
    container.appendChild(renderer.domElement);
    const geometries = new Set<THREE.BufferGeometry>(); const materials = new Set<THREE.Material>(); const textures: THREE.Texture[] = [];
    const pmrem = new THREE.PMREMGenerator(renderer); const room = new RoomEnvironment(); const environment = pmrem.fromScene(room, .04);
    scene.environment = environment.texture; room.dispose(); pmrem.dispose();
    const mat = (color: string, roughness = .5, metalness = 0) => { const result = new THREE.MeshStandardMaterial({ color, roughness, metalness }); materials.add(result); return result; };
    const white = mat('#f1f0ec', .62), red = mat('#e52e48', .28, .25), black = mat('#202723', .32), steel = mat('#adb7b6', .22, .9), green = mat('#bcc9bb', .52), accent = mat('#eacfb7', .48);
    function mesh(geometry: THREE.BufferGeometry, material: THREE.Material, parent: THREE.Object3D = scene) {
      geometries.add(geometry); materials.add(material); const result = new THREE.Mesh(geometry, material); result.castShadow = true; result.receiveShadow = true; parent.add(result); return result;
    }
    function box(w: number, h: number, d: number, x: number, y: number, z: number, material: THREE.Material, parent: THREE.Object3D = scene) { const result = mesh(new THREE.BoxGeometry(w, h, d), material, parent); result.position.set(x, y, z); return result; }
    function cylinder(radius: number, height: number, x: number, y: number, z: number, material: THREE.Material, parent: THREE.Object3D = scene, segments = 64) { const result = mesh(new THREE.CylinderGeometry(radius, radius, height, segments), material, parent); result.position.set(x, y, z); return result; }
    function beam(a: THREE.Vector3, b: THREE.Vector3, radius: number, material: THREE.Material, parent: THREE.Object3D) {
      const result = mesh(new THREE.CylinderGeometry(radius, radius, a.distanceTo(b), 12), material, parent); result.position.copy(a).add(b).multiplyScalar(.5);
      result.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize()); return result;
    }
    function label(text: string, w: number, h: number, ink: string, background: string) {
      const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 256;
      const ctx = canvas.getContext('2d')!; ctx.fillStyle = background; ctx.fillRect(0, 0, 1024, 256); ctx.fillStyle = ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '600 110px Arial'; ctx.fillText(text, 512, 128);
      const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; textures.push(texture);
      return mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: texture }));
    }
    scene.add(new THREE.HemisphereLight('#fffaf2', '#b9c8ba', 1.8));
    const key = new THREE.DirectionalLight('#fff8ef', 3.2); key.position.set(-6, 14, 8); key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048); Object.assign(key.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12, far: 40 }); key.shadow.normalBias = .035; scene.add(key);
    const fill = new THREE.DirectionalLight('#dbeaff', 1.1); fill.position.set(10, 5, -5); scene.add(fill);
    const floor = mesh(new THREE.PlaneGeometry(150, 150), white); floor.rotation.x = -Math.PI / 2;
    const grid = new THREE.GridHelper(60, 60, '#deddd6', '#e5e4de'); grid.position.y = .002; scene.add(grid);
    const stage = new THREE.Group(); stage.position.x = 2.4; scene.add(stage);
    cylinder(5.2, .32, 0, .16, 0, white, stage); cylinder(5.03, .06, 0, .35, 0, red, stage); cylinder(4.9, .08, 0, .41, 0, white, stage);
    const inlay = mesh(new THREE.TorusGeometry(4.55, .018, 8, 140), steel, stage); inlay.rotation.x = Math.PI / 2; inlay.position.y = .46;
    // Repeated portals expose depth as the camera passes around the studio.
    for (let i = 0; i < 3; i++) {
      const shape = new THREE.Shape();
      shape.moveTo(-3.6, .45); shape.lineTo(-3.6, 5.15); shape.quadraticCurveTo(-3.6, 6.05, -2.7, 6.05); shape.lineTo(2.7, 6.05); shape.quadraticCurveTo(3.6, 6.05, 3.6, 5.15); shape.lineTo(3.6, .45);
      shape.lineTo(3.32, .45); shape.lineTo(3.32, 5.12); shape.quadraticCurveTo(3.32, 5.76, 2.68, 5.76); shape.lineTo(-2.68, 5.76); shape.quadraticCurveTo(-3.32, 5.76, -3.32, 5.12); shape.lineTo(-3.32, .45); shape.closePath();
      const portal = mesh(new THREE.ExtrudeGeometry(shape, { depth: .28, bevelEnabled: true, bevelSize: .025, bevelThickness: .025, bevelSegments: 3, steps: 1, curveSegments: 16 }), i === 1 ? green : red, stage); portal.position.set(0, 0, 1.7 - i * 1.7);
    }
    box(4.15, .8, .13, 2.4, 6.37, 1.8, red);
    const sign = label('PHOTOCLOUD', 3.9, .7, '#ffffff', '#da2a43'); sign.position.set(2.4, 6.37, 1.92);
    const badge = label('YOUR OWN STORY / 01', 2.9, .42, '#30382f', '#f1f0ec'); badge.position.set(2.4, .25, 5.205);
    for (let i = 0; i < 7; i++) box(.035, .03, 2.8, -1 + i * .62, .5, -.35, steel, stage);
    const panels: THREE.Group[] = [], pictures: THREE.Mesh[] = [];
    const positions = [[2.4, 2.7, .2, -.12], [5.65, 2.4, -.65, -.52], [-.7, 2.4, -1.05, .42]];
    const loader = new THREE.TextureLoader();
    STAGE_PHOTOS.forEach((src, i) => {
      const group = new THREE.Group(); const [x, y, z, ry] = positions[i]; group.position.set(x, y, z); group.rotation.y = ry; scene.add(group); panels.push(group);
      const w = i === 0 ? 2.55 : 2.1, h = i === 0 ? 3.9 : 3.05;
      box(w + .2, h + .2, .12, 0, 0, 0, black, group); box(w + .13, h + .13, .025, 0, 0, .073, white, group);
      const picture = mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: '#dce0d8' }), group); picture.position.z = .092; picture.userData.photoIndex = i; pictures.push(picture);
      loader.load(src, texture => {
        if (!alive) { texture.dispose(); return; }
        texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8);
        const aspect = texture.image.width / texture.image.height, frameAspect = w / h;
        if (aspect > frameAspect) { texture.repeat.x = frameAspect / aspect; texture.offset.x = (1 - texture.repeat.x) / 2; }
        else { texture.repeat.y = aspect / frameAspect; texture.offset.y = (1 - texture.repeat.y) / 2; }
        textures.push(texture); const surface = picture.material as THREE.MeshBasicMaterial; surface.map = texture; surface.color.set('#ffffff'); surface.needsUpdate = true;
        const ready = pictures.filter(p => (p.material as THREE.MeshBasicMaterial).map).length; container.dataset.loaded = String(ready); setLoaded(ready);
      }, undefined, () => { container.dataset.failed = 'true'; });
      box(.06, .7, .06, -w * .4, -h / 2 - .35, 0, steel, group); box(.06, .7, .06, w * .4, -h / 2 - .35, 0, steel, group); box(w + .4, .1, .9, 0, -h / 2 - .65, 0, white, group);
    });
    const rig = new THREE.Group(); rig.position.set(-1.45, 1.8, 2.75); rig.rotation.y = .5; scene.add(rig);
    box(1.05, .67, .43, 0, 0, 0, black, rig); box(.25, .4, .5, .47, -.04, .06, black, rig); box(.35, .19, .35, -.1, .42, 0, black, rig); box(.45, .3, .018, 0, 0, -.229, green, rig);
    for (let i = 0; i < 3; i++) cylinder(.065, .035, .25 + i * .12, .35, -.09, steel, rig, 20);
    const lens = cylinder(.29, .7, 0, 0, .52, black, rig); lens.rotation.x = Math.PI / 2;
    for (let i = 0; i < 4; i++) { const ridge = mesh(new THREE.TorusGeometry(.29 + (i === 3 ? .02 : 0), .016, 10, 48), i === 3 ? red : steel, rig); ridge.position.z = .25 + i * .19; }
    const glass = cylinder(.24, .013, 0, 0, .887, new THREE.MeshPhysicalMaterial({ color: '#2c6b71', metalness: .4, roughness: .08, clearcoat: 1 }), rig); glass.rotation.x = Math.PI / 2;
    for (let i = 0; i < 3; i++) { const angle = i * Math.PI * 2 / 3; beam(new THREE.Vector3(0, -.32, 0), new THREE.Vector3(Math.sin(angle) * .7, -1.35, Math.cos(angle) * .7), .025, steel, rig); }
    function softbox(x: number, z: number, angle: number) {
      const lightRig = new THREE.Group(); lightRig.position.set(x, .48, z); lightRig.rotation.y = angle; scene.add(lightRig); cylinder(.026, 2.55, 0, 1.275, 0, steel, lightRig, 12);
      for (let i = 0; i < 3; i++) { const a = i * Math.PI * 2 / 3; beam(new THREE.Vector3(0, .35, 0), new THREE.Vector3(Math.sin(a) * .55, 0, Math.cos(a) * .55), .025, black, lightRig); }
      const hood = mesh(new THREE.CylinderGeometry(.62, .25, .46, 8), black, lightRig); hood.rotation.x = Math.PI / 2; hood.position.set(0, 2.8, .1);
      const diffuser = mesh(new THREE.CircleGeometry(.59, 8), new THREE.MeshStandardMaterial({ color: '#fff9ec', emissive: '#fff7d7', emissiveIntensity: .55, side: THREE.DoubleSide }), lightRig); diffuser.position.set(0, 2.8, .34);
    }
    softbox(7.6, .9, -.65); softbox(5.2, -3.2, .65);
    const bench = new THREE.Group(); bench.position.set(5.7, .45, 2.6); bench.rotation.y = -.45; scene.add(bench); box(1.8, .25, .8, 0, .75, 0, accent, bench); box(1.8, .65, .14, 0, 1.1, -.32, accent, bench);
    for (const x of [-.65, .65]) for (const z of [-.23, .23]) box(.045, .7, .045, x, .35, z, steel, bench);
    for (let i = 0; i < 9; i++) { const angle = -.55 + i * .19; const sheet = box(.65, .015, .9, 2.4 + Math.sin(angle) * 6, .09, Math.cos(angle) * 6, i % 2 ? red : black); sheet.rotation.y = angle; }
    const cameraPath = new THREE.CatmullRomCurve3([new THREE.Vector3(12, 8, 16), new THREE.Vector3(8.5, 5.3, 12), new THREE.Vector3(2.2, 3.1, 9.6), new THREE.Vector3(-5.5, 4.5, 11), new THREE.Vector3(8.5, 6.8, 12.8)]);
    const targetPath = new THREE.CatmullRomCurve3([new THREE.Vector3(2.4, 2.6, 0), new THREE.Vector3(2.4, 2.5, 0), new THREE.Vector3(2.4, 2.7, 0), new THREE.Vector3(2.4, 2.5, -.2), new THREE.Vector3(2.4, 2.4, 0)]);
    const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2(9, 9);
    let pointerX = 0, pointerY = 0, hover = -1; let pressed: THREE.Vector2 | null = null;
    function locate(event: PointerEvent) { const rect = container.getBoundingClientRect(); pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -((event.clientY - rect.top) / rect.height * 2 - 1)); pointerX = pointer.x * .5; pointerY = pointer.y * .5; }
    const move = (event: PointerEvent) => { locate(event); raycaster.setFromCamera(pointer, camera); const hit = raycaster.intersectObjects(pictures)[0]; hover = hit ? hit.object.userData.photoIndex : -1; container.style.cursor = hover < 0 ? 'default' : 'pointer'; };
    const leave = () => { hover = -1; pointerX = 0; pointerY = 0; };
    const down = (event: PointerEvent) => { pressed = new THREE.Vector2(event.clientX, event.clientY); };
    const up = (event: PointerEvent) => { if (!pressed || pressed.distanceTo(new THREE.Vector2(event.clientX, event.clientY)) > 8) return; locate(event); raycaster.setFromCamera(pointer, camera); const hit = raycaster.intersectObjects(pictures)[0]; if (hit) current.current.onSelect(hit.object.userData.photoIndex); pressed = null; };
    container.addEventListener('pointermove', move); container.addEventListener('pointerleave', leave); container.addEventListener('pointerdown', down); container.addEventListener('pointerup', up);
    let mobile = false, visible = true, frame = 0, viewWidth = 0, viewHeight = 0, viewRatio = 1.45;
    const resize = () => { const { width, height } = container.getBoundingClientRect(); if (!width || !height) return; viewWidth = width; viewHeight = height; mobile = width < 700; renderer.setSize(width, height); camera.aspect = width / height; camera.fov = mobile ? 43 : 37; if (mobile) camera.clearViewOffset(); else camera.setViewOffset(width * viewRatio, height, 0, 0, width, height); camera.updateProjectionMatrix(); };
    const sizeObserver = new ResizeObserver(resize); sizeObserver.observe(container); resize();
    const visibility = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; }, { rootMargin: '100px' }); visibility.observe(container);
    const target = new THREE.Vector3(), look = new THREE.Vector3(), focus = new THREE.Vector3(2.4, 2.6, 0), clock = new THREE.Clock(), scaleTarget = new THREE.Vector3(), panelTarget = new THREE.Vector3();
    let time = 0, smoothProgress = 0; camera.position.copy(cameraPath.getPoint(0));
    const render = () => {
      const delta = Math.min(clock.getDelta(), .05); frame = requestAnimationFrame(render); if (!visible || document.hidden) return;
      const state = current.current; if (state.running && !reduced) time += delta;
      smoothProgress = THREE.MathUtils.damp(smoothProgress, reduced ? 0 : progress.current, 4, delta); cameraPath.getPoint(smoothProgress, target); targetPath.getPoint(smoothProgress, look);
      if (mobile) { look.set(2.3, 2.8, 0); target.multiplyScalar(.84); }
      if (state.selected !== null) { const [x, y, z, ry] = positions[0], distance = mobile ? 10.2 : 15.2; target.set(x + Math.sin(ry) * distance, y + 1.2, z + Math.cos(ry) * distance); look.set(x, y, z); }
      if (!reduced && state.running) { target.x += pointerX * .55; target.y += pointerY * .3; }
      if (!mobile) { viewRatio = THREE.MathUtils.damp(viewRatio, state.selected === null ? 1.45 : 1.6, 5, delta); camera.setViewOffset(viewWidth * viewRatio, viewHeight, 0, 0, viewWidth, viewHeight); }
      const damping = 1 - Math.exp(-5 * delta); camera.position.lerp(target, damping); focus.lerp(look, damping); camera.lookAt(focus);
      panels.forEach((panel, i) => {
        const slot = state.selected === null ? i : state.selected === i ? 0 : i < state.selected ? i + 1 : i;
        panelTarget.set(positions[slot][0], positions[slot][1], positions[slot][2]); panel.position.lerp(panelTarget, damping);
        scaleTarget.setScalar(state.selected === i ? (i === 0 ? 1.04 : 1.18) : hover === i ? 1.04 : 1); panel.scale.lerp(scaleTarget, damping);
        panel.rotation.y = THREE.MathUtils.damp(panel.rotation.y, positions[slot][3] + (reduced ? 0 : Math.sin(time * .45 + i) * .018), 5, delta);
      });
      renderer.render(scene, camera); container.dataset.progress = smoothProgress.toFixed(3);
    };
    render();
    return () => {
      alive = false; cancelAnimationFrame(frame); sizeObserver.disconnect(); visibility.disconnect(); container.removeEventListener('pointermove', move); container.removeEventListener('pointerleave', leave); container.removeEventListener('pointerdown', down); container.removeEventListener('pointerup', up);
      geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); textures.forEach(t => t.dispose()); grid.geometry.dispose(); (grid.material as THREE.Material).dispose(); environment.dispose(); key.shadow.dispose(); renderer.dispose(); renderer.domElement.remove();
    };
  }, [progress, reduced]);
  return <div ref={host} className="sp-photo-stage" role="img" aria-label="Studio 3D tương tác với ba bộ ảnh và thiết bị chụp hình">{failed && <img src={STAGE_PHOTOS[0]} alt="Ảnh chân dung minh họa" />}{!failed && loaded < 3 && <span className="sp-scene-loading" role="status">Đang mở studio · {loaded}/3</span>}</div>;
}
