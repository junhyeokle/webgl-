// js/main.js
// ─────────────────────────────────────────────────────────────
// 모듈 임포트(CDN). 번들러 없이도 동작.
// 필요 시 로컬 복사본으로 바꿀 수 있도록 import 라인은 한 곳에 모아둠.
import * as THREE from 'https://unpkg.com/three@0.165.0/build/three.module.js';
import { OrbitControls } from 'https://unpkg.com/three@0.165.0/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'https://unpkg.com/three@0.165.0/examples/jsm/loaders/GLTFLoader.js';
// (필요해지면 주석 해제)
// import { DRACOLoader } from 'https://unpkg.com/three@0.165.0/examples/jsm/loaders/DRACOLoader.js';
// import { KTX2Loader } from 'https://unpkg.com/three@0.165.0/examples/jsm/loaders/KTX2Loader.js';

const canvas = document.getElementById('app');

// ─────────────────────────────────────────────────────────────
// Renderer
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;

// Scene / Camera / Controls
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0e0f11);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.01, 5000);
camera.position.set(2.5, 1.6, 2.5);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// Lights
scene.add(new THREE.AmbientLight(0xffffff, 0.9));
const dir = new THREE.DirectionalLight(0xffffff, 0.8);
dir.position.set(5, 10, 6);
scene.add(dir);

// 도움: 좌표축 헬퍼(필요 없으면 지워도 됨)
scene.add(new THREE.AxesHelper(0.5));

// 디버그: URL에 ?debug=1 붙이면 머티리얼을 노멀로 강제
const DEBUG_MAT = new URLSearchParams(location.search).get('debug') === '1';

// ─────────────────────────────────────────────────────────────
// 모델 로딩
const loader = new GLTFLoader();

// (Draco/KTX2가 필요해지면 사용)
// const draco = new DRACOLoader();
// draco.setDecoderPath('https://unpkg.com/three@0.165.0/examples/jsm/libs/draco/');
// loader.setDRACOLoader(draco);
// const ktx2 = new KTX2Loader()
//   .setTranscoderPath('https://unpkg.com/three@0.165.0/examples/jsm/libs/basis/')
//   .detectSupport(renderer);
// loader.setKTX2Loader(ktx2);

// GLB 한 파일:
const MODEL_URL = '../models/scene.glb'.replace('..', '.'); // 안전하게 상대경로 유지
// GLTF 세트(선택):
// const MODEL_URL = './models/scene.gltf';
//   ⮕ 이 경우 ./models/scene.bin 과 ./models/textures/* 가 같은 폴더 구조로 있어야 함.

loader.load(
  MODEL_URL + '?v=' + Date.now(), // 캐시 무효화
  (gltf) => {
    const root = gltf.scene;

    // 면 뒤집힘 임시 대응 + 디버그 재질
    root.traverse((o) => {
      if (o.isMesh) {
        if (DEBUG_MAT) {
          o.material = new THREE.MeshNormalMaterial({ side: THREE.DoubleSide });
        } else if (o.material) {
          o.material.side = THREE.DoubleSide;
        }
        o.castShadow = o.receiveShadow = true;
      }
    });

    scene.add(root);
    frameObject(root);
  },
  (xhr) => {
    if (xhr.total) console.log(`loading ${(xhr.loaded / xhr.total * 100).toFixed(1)}%`);
    else console.log('loading bytes:', xhr.loaded);
  },
  (err) => {
    console.error('GLTF/GLB load error:', err);
  }
);

// ─────────────────────────────────────────────────────────────
// 카메라 자동 프레이밍
function frameObject(object) {
  const box = new THREE.Box3().setFromObject(object);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  let maxDim = Math.max(size.x, size.y, size.z);

  // 너무 크거나 너무 작은 모델 자동 스케일
  if (!isFinite(maxDim) || maxDim === 0) maxDim = 1;
  if (maxDim > 1000 || maxDim < 0.001) {
    const scale = 2.5 / maxDim;
    object.scale.setScalar(scale);
    object.updateMatrixWorld(true);
    // 스케일 후 다시 계산
    const box2 = new THREE.Box3().setFromObject(object);
    box2.getSize(size);
    box2.getCenter(center);
    maxDim = Math.max(size.x, size.y, size.z);
  }

  controls.target.copy(center);
  const fov = camera.fov * Math.PI / 180;
  let dist = (maxDim / 2) / Math.tan(fov / 2) * 1.4;
  camera.position.copy(center).add(new THREE.Vector3(dist, dist * 0.35, dist));
  camera.near = Math.max(0.01, maxDim / 100);
  camera.far = Math.max(1000, maxDim * 10);
  camera.updateProjectionMatrix();
  controls.update();

  // 바운딩 박스 외곽선(디버그용)
  const helper = new THREE.Box3Helper(new THREE.Box3().setFromObject(object), 0x00ffff);
  scene.add(helper);
}

// ─────────────────────────────────────────────────────────────
// Resize & Loop
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

(function loop() {
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(loop);
})();
