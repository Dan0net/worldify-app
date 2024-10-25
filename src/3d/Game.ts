import { AmbientLight, BoxGeometry, Clock, DirectionalLight, FogExp2, Mesh, MeshStandardMaterial, NoToneMapping, PCFSoftShadowMap, PerspectiveCamera, Raycaster, Scene, WebGLRenderer } from 'three';
import { Player } from './Player';
import { ChunkCoordinator } from './ChunkCoordinator';
import { Builder } from '../builder/Builder';

export class Game {

  private canvas: HTMLCanvasElement;

  private clock: Clock;
  private scene: Scene;
  private raycaster: Raycaster;
  private renderer: WebGLRenderer;
  private camera: PerspectiveCamera;

  private player: Player;
  private chunkCoordinator: ChunkCoordinator;
  private builder: Builder;

  private cube: Mesh;
  private material: MeshStandardMaterial;
  private geometry: BoxGeometry;

  constructor() {

    // Get the canvas element by its ID
    this.canvas = document.getElementById('canvas') as HTMLCanvasElement;
    if (!this.canvas) {
      console.error('Canvas element not found');
      // return;
    }

    this.clock = new Clock(false);
    this.scene = new Scene();
    this.raycaster = new Raycaster();
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
    this.camera.position.set(0, 1.6, 5); // Adjust as needed

    this.player = new Player(this.scene, this.camera);
    this.chunkCoordinator = new ChunkCoordinator(this.scene);
    this.builder = new Builder(this.scene);

    // Add lights to the scene
    const ambientLight = new AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);
    const directionalLight = new DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 7.5);
    this.scene.add(directionalLight);

    // Add a simple object (e.g., cube) to the scene
    this.geometry = new BoxGeometry(1, 1, 1);
    this.material = new MeshStandardMaterial({ color: 0x0077ff });
    this.cube = new Mesh(this.geometry, this.material);
    this.scene.add(this.cube);

    window.addEventListener('resize', this.onWindowResize);

    this.animate();
  }

  animate() {
    requestAnimationFrame(this.animate.bind(this));

    const delta = this.clock.getDelta();

    // Update objects (e.g., rotate the cube)
    this.cube.rotation.x += 0.01;
    this.cube.rotation.y += 0.01;

    // player.update(delta);
    // chunkCoordinator.updateChunksAroundPlayer(camera.position);
    // builder.update(delta);

    // Render the scene
    this.renderer.render(this.scene, this.camera);
  }

  // Handle window resize
  onWindowResize() {
    // canvas.setSize( window.innerWidth, window.innerHeight );
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
  }

  // Clean up on component unmount
  dispose() {
    window.removeEventListener('resize', this.onWindowResize);

    // Dispose of geometries and materials to free up resources
    this.geometry.dispose();
    this.material.dispose();

    // Dispose renderer and its resources
    this.renderer.dispose();
  };

};