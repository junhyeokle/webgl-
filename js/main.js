// js/main.js
import * as THREE from 'https://unpkg.com/three@0.165.0/build/three.module.js';
import { OrbitControls } from 'https://unpkg.com/three@0.165.0/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'https://unpkg.com/three@0.165.0/examples/jsm/loaders/GLTFLoader.js';

const canvas = document.getElementById('app');

// 렌더러/씬/카메라/컨트롤
const renderer = new THREE.WebGLRenderer({ canvas, antialias:true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0e0f11);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth/window.innerHeight, 0.01, 5000);
camera.position.set(2.5, 1.6, 2.5);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

scene.add(new THREE.AmbientLight(0xffffff, 0.9));
const dir = new THREE.DirectionalLight(0xffffff, 0.8);
dir.position.set(5, 10, 6);
scene.add(dir);

// ── GLTF 로드 ───────────────────────────────────────
const loader = new GLTFLoader();

// dino 폴더를 로더의 기준 경로로 지정하고, 파일명만 넘긴다.
loader.setPath('./models/dino/'); // ※ main.js가 /js/ 폴더에 있다면 '../models/dino/'가 아님! (index.html 기준)

loader.load('scene.gltf?v=' + Date.now(), (gltf) => {
  const root = gltf.scene;

  // 뒤집힌 면 임시대응
  root.traverse(o => { if (o.isMesh && o.material) o.material.side = THREE.DoubleSide; });

  scene.add(root);

  // 카메라 프레이밍
  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z) || 1;

  controls.target.copy(center);
  const fov = camera.fov * Math.PI/180;
  let dist = (maxDim/2) / Math.tan(fov/2) * 1.4;
  camera.position.copy(center).add(new THREE.Vector3(dist, dist*0.35, dist));
  camera.near = Math.max(0.01, maxDim/100);
  camera.far  = Math.max(1000,  maxDim*10);
  camera.updateProjectionMatrix();
  controls.update();
}, undefined, (err) => console.error('GLTF load error:', err));

// 리사이즈/루프
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
(function loop(){ controls.update(); renderer.render(scene, camera); requestAnimationFrame(loop); })();

