import {
  AmbientLight,
  BoxGeometry,
  BufferGeometry,
  Clock,
  DirectionalLight,
  FogExp2,
  Mesh,
  MeshStandardMaterial,
  NoToneMapping,
  PCFSoftShadowMap,
  PerspectiveCamera,
  Raycaster,
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
import { BatchedMesh } from "three/src/Three.js";
import Stats from "three/examples/jsm/libs/stats.module.js";
import { Lights } from "./Lights";
import { InputController } from "../input/InputController";

export class Worldify {
  private canvas: HTMLCanvasElement;

  private clock: Clock;
  private scene: Scene;
  private renderer: WebGLRenderer;
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
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    // renderer.setClearColor( 'rgb(48, 48, 48)' );

    this.camera = new PerspectiveCamera(
      75, // Field of view
      window.innerWidth / window.innerHeight, // Aspect ratio
      0.1, // Near clipping plane
      1000 // Far clipping plane
    );

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
    this.renderer.render(this.scene, this.camera);

    this.stats.end();

    requestAnimationFrame(this.animate.bind(this));
  }

  // Handle window resize
  onWindowResize = () => {
    // canvas.setSize( window.innerWidth, window.innerHeight );
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.camera.aspect = window.innerWidth / window.innerHeight;
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
