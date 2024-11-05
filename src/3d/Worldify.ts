import {
  BoxGeometry,
  BufferGeometry,
  Clock,
  Mesh,
  MeshStandardMaterial,
  NoToneMapping,
  PCFSoftShadowMap,
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
} from "three";
import { Player } from "./Player";
import { ChunkCoordinator } from "./ChunkCoordinator";
import { Builder } from "../builder/Builder";

import {
  computeBoundsTree,
  disposeBoundsTree,
  computeBatchedBoundsTree,
  disposeBatchedBoundsTree,
  acceleratedRaycast,
} from "three-mesh-bvh";
import { BatchedMesh, Vector2 } from "three/src/Three.js";
import Stats from "three/examples/jsm/libs/stats.module.js";
import { Lights } from "./Lights";
import { InputController } from "../input/InputController";
import { MatterialPallet } from "../material/MaterialPallet";
import {
  BokehPass,
  EffectComposer,
  OutputPass,
  RenderPass,
  SSAOPass,
  UnrealBloomPass,
} from "three/examples/jsm/Addons.js";
import GUI from "three/examples/jsm/libs/lil-gui.module.min.js";
import { getGUI } from "../utils/gui";

export class Worldify {
  private canvas: HTMLCanvasElement;
  private width: number;
  private height: number;

  private clock: Clock;
  private scene: Scene;
  private renderer: WebGLRenderer;
  private composer: EffectComposer;
  private camera: PerspectiveCamera;

  private inputController: InputController;
  private lights: Lights;
  private player: Player;
  private chunkCoordinator: ChunkCoordinator;
  private builder: Builder;

  private stats: Stats;

  private cube: Mesh;
  private material: MeshStandardMaterial;
  private geometry: BoxGeometry;

  constructor() {
    // Get the canvas element by its ID
    this.canvas = document.getElementById("canvas") as HTMLCanvasElement;
    if (!this.canvas) {
      console.error("Canvas element not found");
      // return;
    }

    this.width = window.innerWidth;
    this.height = window.innerHeight;

    this.clock = new Clock(true);
    this.scene = new Scene();
    this.renderer = new WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      logarithmicDepthBuffer: true,
    });

    this.renderer.toneMapping = NoToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = PCFSoftShadowMap;
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    // renderer.setClearColor( 'rgb(48, 48, 48)' );

    // camera

    this.camera = new PerspectiveCamera(
      90, // Field of view
      this.width / this.height, // Aspect ratio
      0.1, // Near clipping plane
      1000 // Far clipping plane
    );

    // effects

    this.composer = new EffectComposer(this.renderer);

    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);

    const ssaoPass = new SSAOPass(
      this.scene,
      this.camera,
      this.width,
      this.height
    );
    ssaoPass.minDistance = 0.002;
    ssaoPass.kernelRadius = 12;
    this.composer.addPass(ssaoPass);

    const bloomPass = new UnrealBloomPass(
      new Vector2(this.width, this.height),
      0.3,
      0.4,
      0.85
    );
    this.composer.addPass(bloomPass);

    // const bokehPass = new BokehPass(this.scene, this.camera, {
    //   focus: 5.0,
    //   aperture: 0.025,
    //   maxblur: 0.01,
    // });
    // this.composer.addPass(bokehPass);

    const outputPass = new OutputPass();
    this.composer.addPass(outputPass);

    // Init gui
    const gui = getGUI();

    const params = {
      exposure: 1,
      focus: 3,
    };

    // const dofFolder = gui.addFolder("depth of field");
    // dofFolder.add(params, "focus").min(0).max(50).onChange(function (value) {
    //   bokehPass.materialDepth = value;
    // });
    // dofFolder.add(bokehPass, "aperture").min(0).max(50);

    const ssaoFolder = gui.addFolder("ssao");
    ssaoFolder
      .add(ssaoPass, "output", {
        Default: SSAOPass.OUTPUT.Default,
        "SSAO Only": SSAOPass.OUTPUT.SSAO,
        "SSAO Only + Blur": SSAOPass.OUTPUT.Blur,
        Depth: SSAOPass.OUTPUT.Depth,
        Normal: SSAOPass.OUTPUT.Normal,
      })
      .onChange(function (value) {
        ssaoPass.output = value;
      });
    ssaoFolder.add(ssaoPass, "kernelRadius").min(0).max(32);
    ssaoFolder.add(ssaoPass, "minDistance").min(0.001).max(0.02);
    ssaoFolder.add(ssaoPass, "maxDistance").min(0.01).max(0.3);
    ssaoFolder.add(ssaoPass, "enabled");

    const bloomFolder = gui.addFolder("bloom");
    bloomFolder.add(bloomPass, "threshold").min(0).max(1);
    bloomFolder.add(bloomPass, "strength").min(0).max(3);
    bloomFolder.add(bloomPass, "radius").min(0).max(1).step(0.01);

    const _this = this;
    const toneMappingFolder = gui.addFolder("tone mapping");
    toneMappingFolder
      .add(params, "exposure", 0.1, 2)
      .onChange(function (value) {
        _this.renderer.toneMappingExposure = Math.pow(value, 4.0);
      });
    this.scene.environmentIntensity = 0.1;
    toneMappingFolder.add(this.scene, "environmentIntensity").min(0).max(1);

    // toneMappingFolder
    //   .add(this.renderer, "exposure", 0.1, 2)
    //   .onChange(function (value) {
    //     this.renderer.toneMappingExposure = Math.pow(value, 4.0);
    //   });

    //BVH

    // Add the extension functions
    BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
    BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;
    Mesh.prototype.raycast = acceleratedRaycast;

    BatchedMesh.prototype.computeBoundsTree = computeBatchedBoundsTree;
    BatchedMesh.prototype.disposeBoundsTree = disposeBatchedBoundsTree;
    BatchedMesh.prototype.raycast = acceleratedRaycast;
    ///

    this.inputController = new InputController(this.canvas);
    // MatterialPallet.getPallet(); //warm up

    ///

    this.lights = new Lights(this.scene);
    this.scene.add(this.lights);

    this.chunkCoordinator = new ChunkCoordinator(this.inputController);
    this.scene.add(this.chunkCoordinator);

    this.player = new Player(
      this.inputController,
      this.camera,
      this.chunkCoordinator
    );
    this.scene.add(this.player);

    this.builder = new Builder(
      this.inputController,
      this.camera,
      this.chunkCoordinator
    );
    this.scene.add(this.builder);

    this.stats = new Stats();
    document.body.appendChild(this.stats.dom);
    this.stats.dom.id = "stats";

    // Add a simple object (e.g., cube) to the scene
    this.geometry = new BoxGeometry(1, 1, 1);
    this.material = new MeshStandardMaterial({ color: 0x0077ff });
    this.cube = new Mesh(this.geometry, this.material);
    this.scene.add(this.cube);

    window.addEventListener("resize", this.onWindowResize);

    this.animate();
  }

  animate() {
    this.stats.begin();

    const delta = this.clock.getDelta();

    // Update objects (e.g., rotate the cube)
    this.cube.rotation.x += 0.01;
    this.cube.rotation.y += 0.01;

    this.inputController.update(delta);
    this.player.update(delta);
    // chunkCoordinator.updateChunksAroundPlayer(camera.position);
    this.builder.update(delta);

    // Render the scene
    // this.renderer.render(this.scene, this.camera);
    this.composer.render();

    this.stats.end();

    requestAnimationFrame(this.animate.bind(this));
  }

  // Handle window resize
  onWindowResize = () => {
    this.width = window.innerWidth;
    this.height = window.innerHeight;

    this.renderer.setSize(this.width, this.height);
    this.composer.setSize(this.width, this.height);

    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
  };

  // Clean up on component unmount
  dispose() {
    window.removeEventListener("resize", this.onWindowResize);

    // Dispose of geometries and materials to free up resources
    this.geometry.dispose();
    this.material.dispose();

    // Dispose renderer and its resources
    this.renderer.dispose();
  }
}
