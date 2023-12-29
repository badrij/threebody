import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

THREE.ColorManagement.enabled = true;
let model, scene, renderer, camera, cameraHelper, floor, controls, composer;
const objects = [];
const container = document.getElementById("scene3d");
var raycaster = new THREE.Raycaster();
var mouse = new THREE.Vector2();

console.log('hello');

function cWidth() {
  return container.getBoundingClientRect().width;
}

function cHeight() {
  return container.getBoundingClientRect().height;
}

function cAspect() {
  return cWidth()/cHeight();
}

init();
function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xb0b0b0);

  camera = new THREE.PerspectiveCamera(20, cAspect(), 0.1, 100);
  camera.position.x = -3;
  camera.position.y = 3;
  camera.position.z = 4;
  camera.lookAt(scene.position);

  const light = new THREE.AmbientLight(0xa0a0a0, 4); // soft white light
  scene.add(light);

  const dirLight = new THREE.DirectionalLight(0xc0c0c0, 6);
  dirLight.position.set(-5, 5, 5);
  dirLight.castShadow = true;
  scene.add(dirLight);
  scene.add(new THREE.CameraHelper(dirLight.shadow.camera));

  const loader = new GLTFLoader();
  loader.load('public/cg/rig.glb',
    function (gltf) {
      model = gltf.scene;
      model.traverse(function (object) {
        if (object.isMesh && object.type=="SkinnedMesh") {
            object.castShadow = true;
            object.material.opacity = 0.7;
        }
      });
      setupDefaultScene();
    },
    undefined,
    function (error) {
      console.error(error);
    }
  );
}

function setupDefaultScene() {
  floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.MeshPhongMaterial({color: 0xcbcbcb, depthWrite: false}));
  floor.rotation.x = - Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  renderer = new THREE.WebGLRenderer( { antialias: true } );
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(cWidth(), cHeight());
  renderer.shadowMap.enabled = true;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.style.background = 'linear-gradient( 180deg, rgba( 0,0,0,1 ) 0%, rgba( 128,128,255,1 ) 100% )';
  container.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.minDistance = 4;
  controls.maxDistance = 6;
  controls.minAzimuthAngle = -Math.PI;
  controls.maxAzimuthAngle = Math.PI/4;
  controls.minPolarAngle = 1.33;
  controls.maxPolarAngle = 1.33;
  controls.screenSpacePanning = true;
  controls.target.set(0, 1, 0);
  controls.update();

  new RGBELoader().load('public/cg/venice_sunset_1k.hdr', function (hdrEquirect) {
    hdrEquirect.mapping = THREE.EquirectangularReflectionMapping;
    scene.environment = hdrEquirect;
  });

  model.position.x = 0;
  model.position.y = 0;
  model.position.z = 0;
  scene.add(model);

  objects.push(model);
  animate();
}

function onWindowResize() {
  camera.aspect = cAspect();
  renderer.setSize(cWidth(), cHeight());
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', onWindowResize);

function onDocumentMouseDown(event) {
    event.preventDefault();

    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ( ( event.clientX - rect.left ) / ( rect.right - rect.left ) ) * 2 - 1;
    mouse.y = - ( ( event.clientY - rect.top ) / ( rect.bottom - rect.top) ) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    var intersects = raycaster.intersectObjects([model], true);
    if ( intersects.length > 0 ) {
        intersects = intersects.map((i) => hierarchicalName(i, i.object)).filter((e) => !!e);
        console.log(new Set(intersects));
    }
}

function hierarchicalName(i, o) {
  const parents = [];
  o.traverseAncestors((p) => parents.push(p.name));
  if (!parents.includes("Muscular001")) {
    return;
  }
  const hierarchy = parents.slice(0, parents.indexOf("Muscular001"));
  hierarchy.unshift(o.name);
  const pattern = /(_L001|_R001|001)/;
  return hierarchy.map((e) => e.replace(pattern, '').replace('_', ' ')).join(" >> ");
}

document.addEventListener('click', onDocumentMouseDown, false);

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
