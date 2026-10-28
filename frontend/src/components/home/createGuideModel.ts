import * as T from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

/** Original procedural companion, with separate face, arms and photographic props. */
export function createGuideModel(): {
  figure: T.Group; body: T.Group; head: T.Group;
  arms: { shoulder: T.Group; elbow: T.Group }[];
  eyes: T.Mesh[]; smile: T.Mesh; photoCamera: T.Group;
  album: T.Group; calendar: T.Group; strap: T.Group;
} {
  const pearl = new T.MeshPhysicalMaterial({ color: 0xf0f1eb, roughness: .34, clearcoat: .35, clearcoatRoughness: .22 });
  const mint = new T.MeshStandardMaterial({ color: 0x71aaa5, roughness: .5 });
  const ink = new T.MeshPhysicalMaterial({ color: 0x07161c, roughness: .19, clearcoat: .8, clearcoatRoughness: .14 });
  const paper = new T.MeshStandardMaterial({ color: 0xfff9e9, roughness: .8 });
  const eyesMaterial = new T.MeshBasicMaterial({ color: 0x8de4e4 });
  const figure = new T.Group();
  const add = (geometry: T.BufferGeometry, material: T.Material, parent: T.Object3D, x = 0, y = 0, z = 0): T.Mesh => {
    const node = new T.Mesh(geometry, material);
    node.position.set(x, y, z); parent.add(node); return node;
  };
  const box = (w: number, h: number, d: number, radius = .08): RoundedBoxGeometry => new RoundedBoxGeometry(w, h, d, 4, radius);
  const display = (w: number, h: number, radius: number): T.ExtrudeGeometry => {
    const x = -w / 2, y = -h / 2, r = radius;
    const shape = new T.Shape();
    shape.moveTo(x + r, y); shape.lineTo(x + w - r, y);
    shape.quadraticCurveTo(x + w, y, x + w, y + r);
    shape.lineTo(x + w, y + h - r); shape.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    shape.lineTo(x + r, y + h); shape.quadraticCurveTo(x, y + h, x, y + h - r);
    shape.lineTo(x, y + r); shape.quadraticCurveTo(x, y, x + r, y);
    return new T.ExtrudeGeometry(shape, { depth: .025, bevelEnabled: true, bevelThickness: .012, bevelSize: .012, bevelSegments: 3, curveSegments: 20 });
  };
  const oval = (parent: T.Object3D, material: T.Material, x: number, y: number, z: number, sx: number, sy: number, sz: number): T.Mesh => {
    const node = add(new T.SphereGeometry(1, 40, 28), material, parent, x, y, z);
    node.scale.set(sx, sy, sz); return node;
  };
  const body = new T.Group(); figure.add(body);
  oval(body, pearl, 0, .87, 0, .52, .6, .43);
  oval(body, mint, 0, 1.25, .28, .14, .2, .085);
  const head = new T.Group(); head.position.set(0, 1.84, 0); body.add(head);
  oval(head, pearl, 0, 0, 0, .7, .57, .52);
  // Inset dark display and a raised lip leave a visible ceramic shell around the face.
  add(display(1.12, .86, .29), pearl, head, 0, -.015, .44);
  add(display(1.04, .78, .27), ink, head, 0, -.015, .49);
  const eyes = [-1, 1].map(side => oval(head, eyesMaterial, side * .23, .015, .56, .105, .155, .025));
  const smile = add(new T.TorusGeometry(.075, .012, 8, 24, Math.PI), eyesMaterial, head, 0, -.16, .567);
  smile.rotation.z = Math.PI;
  [-1, 1].forEach(side => oval(head, mint, side * .65, -.05, -.02, .035, .18, .19));
  const arms = [-1, 1].map(side => {
    const shoulder = new T.Group(); shoulder.position.set(side * .47, 1.18, .015); body.add(shoulder);
    oval(shoulder, pearl, 0, -.02, 0, .145, .16, .15);
    add(new T.CapsuleGeometry(.125, .18, 10, 24), pearl, shoulder, side * .015, -.18);
    const elbow = new T.Group(); elbow.position.set(side * .04, -.36, 0); shoulder.add(elbow);
    add(new T.CapsuleGeometry(.12, .15, 10, 24), pearl, elbow, 0, -.12, .015);
    oval(elbow, pearl, 0, -.25, .045, .13, .145, .14);
    oval(elbow, pearl, -side * .085, -.22, .12, .055, .08, .06);
    return { shoulder, elbow };
  });
  const photoCamera = new T.Group(); photoCamera.position.set(0, 1.03, .55); body.add(photoCamera);
  add(box(.61, .38, .25, .07), ink, photoCamera);
  add(box(.2, .09, .18, .025), mint, photoCamera, -.12, .23, 0);
  const lens = add(new T.CylinderGeometry(.15, .17, .17, 40), mint, photoCamera, .07, 0, .19);
  lens.rotation.x = Math.PI / 2;
  oval(photoCamera, ink, .07, 0, .29, .12, .12, .025);
  oval(photoCamera, eyesMaterial, .035, .04, .315, .03, .035, .008);
  add(box(.07, .025, .07, .01), pearl, photoCamera, .21, .205, 0);
  // A paired open book; no stock images are misrepresented as customer work.
  const album = new T.Group(); album.position.set(0, .91, .66); album.rotation.x = -.2; body.add(album);
  [-1, 1].forEach(side => {
    const leaf = new T.Group(); leaf.position.x = side * .01; leaf.rotation.y = side * -.22; album.add(leaf);
    add(box(.43, .49, .055, .025), mint, leaf, side * .22);
    add(box(.38, .43, .025, .015), paper, leaf, side * .22, 0, .04);
    add(box(.28, .21, .015, .01), ink, leaf, side * .22, .05, .063);
    add(box(.2, .018, .01, .005), mint, leaf, side * .22, -.12, .065);
  });
  const calendar = new T.Group(); calendar.position.set(0, 1.01, .66); body.add(calendar);
  add(box(.6, .52, .06, .04), paper, calendar);
  add(box(.6, .1, .07, .025), mint, calendar, 0, .21, .02);
  for (const x of [-.16, 0, .16]) for (const y of [-.12, .02]) add(box(.065, .06, .015, .01), ink, calendar, x, y, .045);
  const strap = new T.Group(); body.add(strap);
  [-1, 1].forEach(side => {
    const band = add(box(.035, .47, .03, .012), ink, strap, side * .28, 1.17, .39);
    band.rotation.z = side * -.24;
  });
  return { figure, body, head, arms, eyes, smile, photoCamera, album, calendar, strap };
}
