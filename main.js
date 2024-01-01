import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RectAreaLightHelper } from 'three/addons/helpers/RectAreaLightHelper.js';
// import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
// import { VertexNormalsHelper } from 'three/addons/helpers/VertexNormalsHelper.js';

THREE.ColorManagement.enabled = true;
let model, scene, renderer, camera, cameraHelper, floor, controls, composer, dirLight;
const container = document.getElementById("scene3d");
const labelContainer = document.getElementById("labels");
var raycaster = new THREE.Raycaster();
var mouse = new THREE.Vector2();
var orbited = false;

const palette = ["rgba(187, 204, 199, 1)", "rgba(182, 167, 146, 1)", "rgba(167, 116, 142, 1)", "rgba(233, 211, 202, 1)", "rgba(189, 102, 96, 1)", "rgba(148, 86, 76, 1)", "rgba(187, 204, 199, 1)"];

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
  scene.fog = new THREE.Fog(0xcfcfd5, 4, 9);

  camera = new THREE.PerspectiveCamera(20, cAspect(), 0.1, 100);
  camera.position.x = -3;
  camera.position.y = 3;
  camera.position.z = 4;
  camera.lookAt(scene.position);

  const light = new THREE.AmbientLight(0xa0a0a0, 4);
  scene.add(light);

  dirLight = new THREE.DirectionalLight(0xc0c0c0, 1);
  dirLight.position.copy(camera.position);
  dirLight.castShadow = true;
  scene.add(dirLight);

  const loader = new GLTFLoader();
  loader.load('public/cg/rig.glb',
    function (gltf) {
      model = gltf.scene;
      model.traverse((o) => makeHighlightable(o));
      setupDefaultScene();
    },
    undefined,
    function (error) {
      if (console) {
        console.error(error);
      }
    }
  );
}

function displayLabels(name, facing) {
  var label = document.createElement('p');
  label.innerHTML = [name, facing].join(' ');
  labelContainer.appendChild(label);
}

function clearLabels() {
  Array.from(labelContainer.getElementsByTagName('p')).forEach((p) => p.remove());
}

function makeHighlightable(obj) {
  obj.isHighlightable = (obj.isMesh && obj.type=="SkinnedMesh");
  obj.highlight = (faces) => {};
  obj.reset = () => {};

  function fullNames() {
    var result = [];
    obj.traverseAncestors((p) => result.push(p.name));
    result.unshift(obj.name);
    return result;
  };
  const ancestorNames = obj.ancestorNames = fullNames();
  obj.hierarchicalName = () => { return obj.name; };

  if (!obj.isHighlightable) return;

  obj.castShadow = true;
  const mat = obj.material = obj.material.clone();
  mat.opacity = 1;
  mat.side = obj.material.side = THREE.FrontSide;
  mat.oldEmissive = mat.emissive.clone();
  mat.oldToneMapped = mat.toneMapped;
  obj.isMuscle = obj.ancestorNames.includes("Muscular001");
  obj.isHighlighted = false;
  if (!obj.isMuscle) return;

  obj.highlight = (facing) => {
    displayLabels(obj.hierarchicalName(), facing);
    mat.emissive.set(0xcc8899 * (Math.random() * (0.5-0.7) + 0.5));
    mat.toneMapped = false;
    obj.isHighlighted = true;
  };
  obj.reset = () => {
    mat.emissive.set(mat.oldEmissive);
    mat.toneMapped = mat.oldToneMapped;
    obj.isHighlighted = false;
  }
  obj.hierarchicalName = () => {
    const slicedNames = ancestorNames.slice(0, ancestorNames.indexOf("Muscular001"));
    return slicedNames.map((e) => e.replace(/(_L001|_R001|001)/, '').replace('_', ' ')).join(" >> ");
  }
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
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.CineonToneMapping;

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
  controls.addEventListener('change', () => orbited ||= true);
  controls.update();
  model.position.x = 0;
  model.position.y = 0;
  model.position.z = 0;
  scene.add(model);
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment()).texture;
  animate();
}

function onWindowResize() {
  camera.aspect = cAspect();
  renderer.setSize(cWidth(), cHeight());
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', onWindowResize);

function onClick(event) {
    event.preventDefault();
    orbited = false;
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ( ( event.clientX - rect.left ) / ( rect.right - rect.left ) ) * 2 - 1;
    mouse.y = - ( ( event.clientY - rect.top ) / ( rect.bottom - rect.top) ) * 2 + 1;
    if (!orbited) {
      model.traverse((o) => {
        if (o.isHighlightable && o.isHighlighted) {
          o.reset();
        }
      });
    }

    const raycasterCam = new THREE.PerspectiveCamera().copy(camera);
    raycasterCam.fov = 20;
    raycasterCam.updateProjectionMatrix();
    raycaster.setFromCamera(mouse, camera);
    var intersects = raycaster.intersectObjects([model]);
    if (intersects.length > 0) {
      clearLabels();
      var allObjects = intersects.map((i) => i.object);
      var uniqueObjects = Array.from(new Set(intersects.map((i) => i.object)));
      var facingBack = uniqueObjects.filter((o) => new IntersectObj(o).faces());
      uniqueObjects.forEach((o) => {
        if (!facingBack.includes(o)) {
          o.highlight("");
        }
      });
      facingBack.forEach((o) => o.highlight("(facing back)"));
    }
}
document.addEventListener('click', onClick, false);

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

class IntersectObj {
  constructor(object) {
    this.geometry = object.geometry;
  }

  faces = () => {
    return camera.getWorldDirection(new THREE.Vector3()).dot(this.geoNormal()) < 0;
  }

  geoNormal = () => {
    let pos = this.geometry.attributes.position;
    let idx = this.geometry.index;
    let tri = new THREE.Triangle();
    let a = new THREE.Vector3(),
        b = new THREE.Vector3(),
        c = new THREE.Vector3();

    for (let f = 0; f < 3; f++) {
        let idxBase = f * 3;
        a.fromBufferAttribute(pos, idx.getX(idxBase + 0));
        b.fromBufferAttribute(pos, idx.getX(idxBase + 1));
        c.fromBufferAttribute(pos, idx.getX(idxBase + 2));
        tri.set(a, b, c);
    }
    return tri.getNormal(new THREE.Vector3());
  }
}
