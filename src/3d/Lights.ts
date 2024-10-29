import { AmbientLight, CameraHelper, DirectionalLight, EquirectangularReflectionMapping, HemisphereLight, Object3D, Scene, SRGBColorSpace, TextureLoader, Vector3 } from "three";

export class Lights extends Object3D {
    private shadowLightOffset = new Vector3(-75, 100, 75);
    private shadowLight: DirectionalLight;

    constructor(private scene: Scene) {
        super();
        
        //lights
        const skyColor = 0xB1E1FF;  // light blue
        const groundColor = 0xB97A20;  // brownish orange
        const Hintensity = 0.0;
        const Hlight = new HemisphereLight(skyColor, groundColor, Hintensity);
        this.add(Hlight);

        const Dcolor = 0xFFFFFF;
        const Dintensity = 2.0;
        
        this.shadowLight = new DirectionalLight(Dcolor, Dintensity);
        this.shadowLight.position.copy(this.shadowLightOffset);
        this.shadowLight.target.position.set(0, 20, 0);
        this.shadowLight.castShadow = true;
        this.shadowLight.shadow.mapSize.width = 2048;
        this.shadowLight.shadow.mapSize.height = 2048;
        this.shadowLight.shadow.camera.zoom = 1;
        this.shadowLight.shadow.camera.left = -60
        this.shadowLight.shadow.camera.right = 60;
        this.shadowLight.shadow.camera.top = 60;
        this.shadowLight.shadow.camera.bottom = -60;
        // TODO fix bias with normal maps
        this.shadowLight.shadow.bias = 0.001;
        this.shadowLight.shadow.normalBias = 0.5;
        this.add(this.shadowLight);
        // app.scene.add(this.shadowLight.target);

        const cameraHelper = new CameraHelper(this.shadowLight.shadow.camera);
        this.add(cameraHelper);

        const loader = new TextureLoader();
		const skyBoxTexture = loader.load(
			// '/images/NightSkyHDRI008_2K-TONEMAPPED.jpg',
			'/images/EveningSkyHDRI017B_2K-TONEMAPPED.jpg',
			() => {
			skyBoxTexture.mapping = EquirectangularReflectionMapping;
			skyBoxTexture.colorSpace = SRGBColorSpace;
			this.scene.background = skyBoxTexture;
			// this.scene.environment = skyBoxTexture;
		});
    }
}