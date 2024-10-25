import React, { useEffect } from 'react';
import { AmbientLight, BoxGeometry, Clock, DirectionalLight, FogExp2, Mesh, MeshStandardMaterial, NoToneMapping, PCFSoftShadowMap, PerspectiveCamera, Raycaster, Scene, WebGLRenderer } from 'three';
import { Player } from './Player';
import { ChunkCoordinator } from './ChunkCoordinator';
import { Builder } from '../builder/Builder';

const Game: React.FC = () => {


  useEffect(() => {
    // Get the canvas element by its ID
    const canvas = document.getElementById('canvas') as HTMLCanvasElement | null;
    if (!canvas) {
      console.error('Canvas element not found');
      return;
    }

    const clock = new Clock(false);
    const scene = new Scene();
    const raycaster = new Raycaster();
    const renderer = new WebGLRenderer({
      canvas,
      antialias: true,
      logarithmicDepthBuffer: true,
    });
    renderer.toneMapping = NoToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = PCFSoftShadowMap;
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    // renderer.setClearColor( 'rgb(48, 48, 48)' );

    const camera = new PerspectiveCamera(
      75, // Field of view
      window.innerWidth / window.innerHeight, // Aspect ratio
      0.1, // Near clipping plane
      1000 // Far clipping plane
    );
    camera.position.set(0, 1.6, 5); // Adjust as needed

    const player = new Player(scene, camera);
    const chunkCoordinator = new ChunkCoordinator(scene);
    const builder = new Builder(scene);

    // Add lights to the scene
    const ambientLight = new AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    const directionalLight = new DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 7.5);
    scene.add(directionalLight);

    // Add a simple object (e.g., cube) to the scene
    const geometry = new BoxGeometry(1, 1, 1);
    const material = new MeshStandardMaterial({ color: 0x0077ff });
    const cube = new Mesh(geometry, material);
    scene.add(cube);

    // Handle window resize
    const onWindowResize = () => {
      // canvas.setSize( window.innerWidth, window.innerHeight );
      renderer.setSize(window.innerWidth, window.innerHeight);
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', onWindowResize);

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);

      // Update objects (e.g., rotate the cube)
      cube.rotation.x += 0.01;
      cube.rotation.y += 0.01;

      // Render the scene
      renderer.render(scene, camera);
    };
    animate();

    // Clean up on component unmount
    return () => {
      window.removeEventListener('resize', onWindowResize);

      // Dispose of geometries and materials to free up resources
      geometry.dispose();
      material.dispose();

      // Dispose renderer and its resources
      renderer.dispose();
    };
  }, []);

  return <canvas id="canvas" />;
};

export default Game;