// material/TerrainMaterial.ts

import {
  Color,
  DataArrayTexture,
  LinearFilter,
  LinearMipMapLinearFilter,
  MeshStandardMaterial,
  ObjectSpaceNormalMap,
  RedFormat,
  RepeatWrapping,
  RGBAFormat,
  RGBFormat,
  ShaderMaterial,
  SRGBColorSpace,
  Texture,
  TextureLoader,
  UnsignedByteType,
  Vector2,
} from "three";
import { MatterialPallet } from "./MaterialPallet";
const apiUrl = import.meta.env.VITE_API_URL;

export class TerrainMaterial extends MeshStandardMaterial {
  private static instance: TerrainMaterial | null = null;
  private _shader;

  // constructor(textureArray: DataArrayTexture) {
  constructor() {
    super({
      map: new Texture(),
      normalMap: new Texture(),
      normalMapType: ObjectSpaceNormalMap,
      normalScale: new Vector2(-1, -1),
      aoMap: new Texture(),
      roughnessMap: new Texture(),
      // metalnessMap: new Texture(),
      // roughness: 0.5,
      metalness: 0.25,
      color: new Color(1, 0, 0),
      toneMapped: false,
      defines: {
        // 'USE_MAP': '',
        // 'USE_UV': '',
        USE_SHADOWMAP: "",
      },
    });

    this.needsUpdate = true;

    this.onBeforeCompile = (shader) => {
      this._shader = shader;

      shader.uniforms.mapArray = {
        value: dummyDataArrayTexture(),
      };
      shader.uniforms.normalArray = {
        value: dummyDataArrayTexture(),
      };
      shader.uniforms.aoArray = {
        value: dummyDataArrayTexture(),
      };
      shader.uniforms.roughnessArray = {
        value: dummyDataArrayTexture(),
      };
      // shader.uniforms.metalnessArray = {
      //   value: dummyDataArrayTexture(),
      // };
      shader.uniforms.repeatScale = { value: 1.0 / 4.0 };

      shader.vertexShader =
        `
          attribute vec3 adjusted;
          attribute vec3 bary;
          attribute float light;
          flat out vec3 vAdjusted;
          varying vec3 vBary;
          varying vec3 ambientLightColor;
          varying vec3 vPos;
          varying vec3 vNormal2;

          uniform float repeatScale;
      ` +
        shader.vertexShader.replace(
          "#include <worldpos_vertex>",
          `
              #include <worldpos_vertex>
              vPos = vec3( worldPosition );
              vNormal2 = normal;
              vAdjusted = adjusted;
              vBary = bary;
              float lightPow = pow(light, 0.6);
              ambientLightColor = vec3(lightPow, lightPow, lightPow);
              `
        );

      shader.fragmentShader =
        `
          uniform sampler2DArray mapArray;
          uniform sampler2DArray normalArray;
          uniform sampler2DArray aoArray;
          uniform sampler2DArray roughnessArray;
          uniform sampler2DArray metalnessArray;
          uniform float repeatScale;
          varying vec3 vPos;
          varying vec3 vNormal2;
          flat in vec3 vAdjusted;
          varying vec3 vBary;
      ` +
        shader.fragmentShader.replace(
          "#include <map_pars_fragment>",
          `
              uniform sampler2D map;
              
              vec3 getTriPlanarBlend(vec3 _wNorm){
                  vec3 blending = vec3( _wNorm );                
                  blending = pow(abs(blending), vec3(8.0, 8.0, 8.0));

                  blending = normalize(max(blending, 0.00001)); // Force weights to sum to 1.0
                  float b = blending.x + blending.y + blending.z;
                  blending /= vec3(b, b, b);
                  return blending;
                  // return pow(blending, vec3(4.0, 4.0, 4.0));
              }

              
              vec3 getPos() {
                  float pixelSize = 1.0 / 64.0;
                  // return floor(vPos / pixelSize) * pixelSize;
                  return vPos;
              }

              vec3 getSmoothBary() {
                  vec3 t = clamp(vBary, 0.0, 1.0);
                  return normalize(t * t * (3.0 - 2.0 * t));
              }

              vec3 getTriAxisSmoothBlend(sampler2DArray tex, vec2 pos, vec3 bary){
                  return vec3(
                      texture( tex, vec3(pos * repeatScale, int(vAdjusted.x)) ).rgb * bary.x +
                      texture( tex, vec3(pos * repeatScale, int(vAdjusted.y)) ).rgb * bary.y +
                      texture( tex, vec3(pos * repeatScale, int(vAdjusted.z)) ).rgb * bary.z
                  );
              }

              vec4 getTriPlanarSmoothBlend(sampler2DArray tex) {
                  vec3 pos = getPos();

                  vec3 blending = getTriPlanarBlend( vNormal2 );

                  // vec3 smoothBary = getSmoothBary();
                  vec3 smoothBary = vBary;
                  
                  vec3 xaxis = getTriAxisSmoothBlend(tex, pos.zy, smoothBary);

                  vec3 zaxis = getTriAxisSmoothBlend(tex, pos.xy, smoothBary);

                  vec3 yaxis = getTriAxisSmoothBlend(tex, pos.xz, smoothBary);

                  return vec4( xaxis * blending.x + yaxis * blending.y + zaxis * blending.z, 1.0 );
              
              }

              vec4 getTriTextureBasic(sampler2DArray tex){
                  vec3 pos = getPos();
                                      
                  vec3 blending = getTriPlanarBlend( vNormal2 );

                  if (blending.x >= blending.y && blending.x >= blending.z) {
                      return vec4(
                          texture( tex, vec3(pos.zy * repeatScale, int(vAdjusted.x)) ).rgb * vBary.x +
                          texture( tex, vec3(pos.zy * repeatScale, int(vAdjusted.y)) ).rgb * vBary.y +
                          texture( tex, vec3(pos.zy * repeatScale, int(vAdjusted.z)) ).rgb * vBary.z
                      , 1.0);
                  } else if (blending.y >= blending.x && blending.y >= blending.z) {
                      return vec4(
                          texture( tex, vec3(pos.xz * repeatScale, int(vAdjusted.x)) ).rgb * vBary.x +
                          texture( tex, vec3(pos.xz * repeatScale, int(vAdjusted.y)) ).rgb * vBary.y +
                          texture( tex, vec3(pos.xz * repeatScale, int(vAdjusted.z)) ).rgb * vBary.z
                      , 1.0);
                  }
                  return vec4(
                      texture( tex, vec3(pos.xy * repeatScale, int(vAdjusted.x)) ).rgb * vBary.x +
                      texture( tex, vec3(pos.xy * repeatScale, int(vAdjusted.y)) ).rgb * vBary.y +
                      texture( tex, vec3(pos.xy * repeatScale, int(vAdjusted.z)) ).rgb * vBary.z
                  , 1.0);
              }

              vec4 getTriTextureBlend(sampler2D tex){
                  vec3 pos = getPos();
                                      
                  vec3 blending = getTriPlanarBlend( vNormal2 );

                  vec3 xaxis = 
                      texture( tex, vec2(pos.zy * repeatScale ) ).rgb;

                  vec3 zaxis = 
                      texture( tex, vec2(pos.xy * repeatScale ) ).rgb;

                  vec3 yaxis = 
                      texture( tex, vec2(pos.xz * repeatScale ) ).rgb;
                  

                  return vec4( xaxis * blending.x + yaxis * blending.y + zaxis * blending.z, 1.0 );
              
              }

              vec4 getTriPlanarTexture(sampler2DArray tex) {
                  // return getTriTextureBasic(tex);
                  return getTriPlanarSmoothBlend(tex);
              }
              `
        );

      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <map_fragment>",
        ``
      );

      shader.fragmentShader = shader.fragmentShader.replace(
        "vec4 diffuseColor = vec4( diffuse, opacity );",
        `
          vec4 diffuseColor =  vec4( getTriPlanarTexture(mapArray).rgb, opacity );
          // vec4 diffuseColor =  vec4(.5,.5,.5, 1.0);
          // vec4 diffuseColor = vec4(texture(map, vPos.xz * repeatScale).rgb, 1.0);
          // vec4 diffuseColor = vec4(texture(mapArray, vec3(vPos.xz * repeatScale, 1)).rgb , 1.0);
          `
      );

      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <normal_fragment_maps>",
        `
        #ifdef USE_NORMALMAP
              vec3 texelNormal = normalize(getTriPlanarTexture( normalArray ).xyz) * 2.0 - 1.0;
              texelNormal.xy *= normalScale;

              vec3 q0 = dFdx( - vViewPosition.xyz );
              vec3 q1 = dFdy( - vViewPosition.xyz );
              vec2 st0 = dFdx( vec2(0,0) );
              vec2 st1 = dFdy( vec2(0,0) );

              vec3 N = normalize( vNormal ); // normalized

              vec3 q1perp = cross( q1, N );
              vec3 q0perp = cross( N, q0 );

              // vec3 T = q1perp * st0.x + q0perp * st1.x;
              vec3 T = q1perp;
              // vec3 B = q1perp * st0.y + q0perp * st1.y;
              vec3 B = q0perp;

              float det = max( dot( T, T ), dot( B, B ) );
              float scale = ( det == 0.0 ) ? 0.0 : inversesqrt( det );

              mat3 tbn = mat3( T * scale, B * scale, N );

              normal = normalize( tbn * texelNormal );
              // normal = normalize( tbn * vec3(1,1,1) );
              // diffuseColor = vec4(normal, 1.0);
              // normal = normalize( vNormal );
      #endif
          `
      );

      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <aomap_fragment>",
        `
          #ifdef USE_AOMAP

              // reads channel R, compatible with a combined OcclusionRoughnessMetallic (RGB) texture
              float ambientOcclusion = ( getTriPlanarTexture( aoArray ).r - 1.0 ) * aoMapIntensity + 1.0;

              reflectedLight.indirectDiffuse *= ambientOcclusion;

              #if defined( USE_CLEARCOAT ) 
                  clearcoatSpecularIndirect *= ambientOcclusion;
              #endif

              #if defined( USE_SHEEN ) 
                  sheenSpecularIndirect *= ambientOcclusion;
              #endif

              #if defined( USE_ENVMAP ) && defined( STANDARD )

                  float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );

                  reflectedLight.indirectSpecular *= computeSpecularOcclusion( dotNV, ambientOcclusion, material.roughness );

              #endif

          #endif
          `
      );

      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <roughnessmap_fragment>",
        `
          float roughnessFactor = roughness;

          #ifdef USE_ROUGHNESSMAP

              vec3 texelRoughness = getTriPlanarTexture( roughnessArray ).rgb;

              // reads channel G, compatible with a combined OcclusionRoughnessMetallic (RGB) texture
              roughnessFactor *= texelRoughness.r;

          #endif
          `
      );

      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <metalnessmap_fragment>",
        `
          float metalnessFactor = metalness;

          // #ifdef USE_METALNESSMAP

          //   vec4 texelMetalness = getTriPlanarTexture( metalnessArray ).rgba;

          //   // reads channel B, compatible with a combined OcclusionRoughnessMetallic (RGB) texture
          //   metalnessFactor *= texelMetalness.r;

          // #endif
          `
      );
    };
  }

  public setTextures(textures) {
    this._shader.uniforms.mapArray = {
      value: textures["albedo"]
    };
    this._shader.uniforms.normalArray = {
      value: textures["normal"],
    };
    this._shader.uniforms.aoArray = {
      value: textures["ao"],
    };
    this._shader.uniforms.roughnessArray = {
      value: textures["roughness"],
    };
    // this._shader.uniforms.metalnessArray = {
    //   // value: textures["ao"],
    //   // value: textures["metalness"],
    // };

    this.needsUpdate = true;
  }

  public static getInstance(textureArray?: DataArrayTexture): TerrainMaterial {
    if (!TerrainMaterial.instance) {
      // if (!textureArray) {
      //   throw new Error('Texture array must be provided for the first initialization.');
      // }

      const material = new TerrainMaterial();
      // const material = new MeshStandardMaterial();

      TerrainMaterial.instance = material;

      this.loadDataArrayTextures().then(
        ({ textures, metadata, materialIndices }) => {
          material.setTextures(textures);
          // material.needsUpdate = true;
        }
      );
    }
    return TerrainMaterial.instance;
  }

  static async loadDataArrayTextures() {
    const mapTypes = ["albedo", "normal", "ao", "roughness"];
    // const mapTypes = ["albedo", "normal", "ao", "roughness", "metalness"];

    const textures = {};
    const metadata = {};

    // Load material indices
    const materialIndices = await MatterialPallet.getPallet();
    const resolution = "low";

    // Fetch and create textures for each map type
    for (const mapType of mapTypes) {
      const { width, height, channels, layers } =
        materialIndices.maps[resolution][mapType];
      const channelSize = channels.length;
      // console.log(mapType, width, height, channelSize, layers)
      // Fetch binary data
      const dataResponse = await fetch(
        `materials/${resolution}/${mapType}.bin.gz`,
        {
          headers: {
            "Content-Type": "application/octet-stream",
            "Content-Encoding": "gzip",
            "Content-Disposition": `attachment; filename="${mapType}.bin"`,
          },
        }
      );
      const arrayBuffer = await dataResponse.arrayBuffer();

      // Create the typed array from the ArrayBuffer
      let data = new Uint8Array(arrayBuffer);
      // console.log(width* height* layers*channelSize, data.length);

      // Determine the texture format
      let format;
      if (channelSize === 4) {
        format = RGBAFormat;
      }
      if (channelSize === 3) {
        format = RGBFormat;
      } else if (channelSize === 1) {
        format = RedFormat;
      }
      console.log(mapType, channelSize, format)

      // Create the DataArrayTexture
      const texture = new DataArrayTexture(data, width, height, layers);

      // Set texture properties
      texture.format = format;
      texture.type = UnsignedByteType;
      texture.minFilter = LinearMipMapLinearFilter;
      texture.magFilter = LinearFilter;
      texture.wrapT = RepeatWrapping;
      texture.wrapS = RepeatWrapping;
      // texture.colorSpace = SRGBColorSpace;
      texture.generateMipmaps = true;
      texture.anisotropy = 8;
      texture.needsUpdate = true;

      textures[mapType] = texture;
    }

    // return { 'textures': {'albedo': dummyDataArrayTexture()}, metadata, materialIndices };
    return { textures, metadata, materialIndices };
  }
}

function dummyDataArrayTexture() {
  // Define texture dimensions
  const width = 256;
  const height = 256;
  const layers = 1; // Number of layers in the texture array
  const channels = 4;

  // Create an array to hold pixel data for all layers
  const size = width * height;
  const data = new Uint8Array(size * channels * layers); // Assuming RGBA format

  // Fill each layer with a different color for testing
  for (let layer = 0; layer < layers; layer++) {
    const color = new Color("grey");
    // if (layer === 0) color.set("red");
    // else if (layer === 1) color.set("green");
    // else if (layer === 2) color.set("blue");

    const r = Math.floor(color.r * 255);
    const g = Math.floor(color.g * 255);
    const b = Math.floor(color.b * 255);
    const a = 255;

    for (let i = 0; i < size; i++) {
      const index = layer * size * channels + i * channels;
      data[index] = r;
      data[index + 1] = g;
      data[index + 2] = b;
      data[index + 3] = a;
    }
  }

  // Create the DataArrayTexture
  const texture = new DataArrayTexture(data, width, height, layers);
  texture.format = RGBAFormat;
  texture.type = UnsignedByteType;
  texture.wrapT = RepeatWrapping;
  texture.wrapS = RepeatWrapping;
  texture.generateMipmaps = true;
  texture.anisotropy = 8;
  texture.needsUpdate = true;

  // Set texture parameters as needed
  // texture.minFilter = LinearFilter;
  // texture.magFilter = LinearFilter;

  return texture;
}
