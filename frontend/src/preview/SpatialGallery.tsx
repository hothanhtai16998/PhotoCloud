import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { STAGE_PHOTOS } from './StudioWorld';

export function SpatialGallery({ active, reduced, onSelect, onOpen }: { active: number; reduced: boolean; onSelect: (index: number) => void; onOpen: (index: number) => void }) {
  const host = useRef<HTMLDivElement>(null);
  const state = useRef({ active, onSelect, onOpen }); state.current = { active, onSelect, onOpen };
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const container = host.current!;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true }); } catch { setFailed(true); return; }
    let alive = true, frame = 0, visible = false;
    const scene = new THREE.Scene(); scene.background = new THREE.Color('#f0efeb');
    const camera = new THREE.PerspectiveCamera(38, 1, .1, 60); camera.position.set(0, .5, 12.8); camera.lookAt(0, 0, 0);
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5)); container.appendChild(renderer.domElement);
    const ring = new THREE.Group(); scene.add(ring);
    const pictures: THREE.Mesh[] = [], reflections: THREE.Mesh[] = [], textures: THREE.Texture[] = [];
    const angleStep = Math.PI * 2 / 9, radius = 4.6, height = 3.65, span = .52;
    const loader = new THREE.TextureLoader(); const resources = new Set<THREE.Material>();
    for (let i = 0; i < 9; i++) {
      const photo = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, 40, 1, true, i * angleStep - span / 2, span), new THREE.MeshBasicMaterial({ color: '#d9ddd5', side: THREE.DoubleSide }));
      photo.userData.index = i % 3; pictures.push(photo); ring.add(photo); resources.add(photo.material as THREE.Material);
      const reflection = new THREE.Mesh(photo.geometry, new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: .075, side: THREE.DoubleSide, depthWrite: false })); reflection.position.y = -height - .13; reflection.scale.y = -1; reflections.push(reflection); ring.add(reflection); resources.add(reflection.material as THREE.Material);
    }
    STAGE_PHOTOS.forEach((src, index) => loader.load(src, texture => {
      if (!alive) { texture.dispose(); return; }
      texture.colorSpace = THREE.SRGBColorSpace;
      const imageAspect = texture.image.width / texture.image.height, panelAspect = radius * span / height;
      if (imageAspect > panelAspect) { texture.repeat.x = panelAspect / imageAspect; texture.offset.x = (1 - texture.repeat.x) / 2; }
      textures.push(texture);
      pictures.forEach((photo, i) => { if (i % 3 !== index) return; const material = photo.material as THREE.MeshBasicMaterial; material.color.set('#ffffff'); material.map = texture; material.needsUpdate = true; const reflected = reflections[i].material as THREE.MeshBasicMaterial; reflected.map = texture; reflected.needsUpdate = true; });
      container.dataset.loaded = String(textures.length);
    }, undefined, () => { container.dataset.failed = 'true'; }));
    const pointer = new THREE.Vector2(), raycaster = new THREE.Raycaster();
    let pointerX = 0, pressed: { x: number; y: number; id: number } | null = null;
    const hit = (event: PointerEvent) => { const r = container.getBoundingClientRect(); pointer.set((event.clientX - r.left) / r.width * 2 - 1, -((event.clientY - r.top) / r.height * 2 - 1)); raycaster.setFromCamera(pointer, camera); return raycaster.intersectObjects(pictures)[0]; };
    const move = (event: PointerEvent) => { const result = hit(event); container.style.cursor = pressed ? 'grabbing' : result ? 'pointer' : 'default'; pointerX = pointer.x; };
    const down = (event: PointerEvent) => { pressed = { x: event.clientX, y: event.clientY, id: event.pointerId }; if (event.pointerType === 'mouse') container.setPointerCapture(event.pointerId); };
    const up = (event: PointerEvent) => {
      if (!pressed) return; const dx = event.clientX - pressed.x, dy = event.clientY - pressed.y;
      if (container.hasPointerCapture(pressed.id)) container.releasePointerCapture(pressed.id);
      if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) state.current.onSelect((state.current.active + (dx < 0 ? 1 : 2)) % 3);
      else if (Math.hypot(dx, dy) < 8) { const result = hit(event); if (result) { const index = result.object.userData.index; if (index === state.current.active) state.current.onOpen(index); else state.current.onSelect(index); } }
      pressed = null;
    };
    const cancel = () => { pressed = null; };
    const leave = () => { pointerX = 0; };
    container.addEventListener('pointermove', move); container.addEventListener('pointerdown', down); container.addEventListener('pointerup', up); container.addEventListener('pointercancel', cancel); container.addEventListener('pointerleave', leave);
    const resize = () => { const r = container.getBoundingClientRect(); if (!r.width || !r.height) return; camera.aspect = r.width / r.height; camera.fov = r.width < 700 ? 44 : 38; camera.position.z = r.width < 700 ? 14.5 : 12.8; camera.updateProjectionMatrix(); renderer.setSize(r.width, r.height); };
    const observer = new ResizeObserver(resize); observer.observe(container); resize();
    const intersection = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; }, { rootMargin: '150px' }); intersection.observe(container);
    const clock = new THREE.Clock();
    const render = () => {
      const delta = Math.min(clock.getDelta(), .05); frame = requestAnimationFrame(render); if (!visible || document.hidden) return;
      const target = -state.current.active * angleStep;
      ring.rotation.y = reduced ? target : THREE.MathUtils.damp(ring.rotation.y, target, 5, delta);
      camera.position.x = reduced ? 0 : THREE.MathUtils.damp(camera.position.x, pointerX * .17, 4, delta); camera.lookAt(0, -.15, 0);
      renderer.render(scene, camera); container.dataset.active = String(state.current.active); container.dataset.rotation = ring.rotation.y.toFixed(3);
    };
    render();
    return () => {
      alive = false; cancelAnimationFrame(frame); observer.disconnect(); intersection.disconnect();
      container.removeEventListener('pointermove', move); container.removeEventListener('pointerdown', down); container.removeEventListener('pointerup', up); container.removeEventListener('pointercancel', cancel); container.removeEventListener('pointerleave', leave);
      pictures.forEach(p => p.geometry.dispose()); resources.forEach(m => m.dispose()); textures.forEach(t => t.dispose()); renderer.dispose(); renderer.domElement.remove();
    };
  }, [reduced]);
  return <div ref={host} className="sp-spatial-gallery" role="img" aria-label="Vòng triển lãm ảnh 3D: chân dung, couple và gia đình">{failed && <img src={STAGE_PHOTOS[active]} alt="Bộ ảnh được chọn" />}</div>;
}
