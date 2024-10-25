// material/TerrainMaterial.ts

import { DataArrayTexture, MeshStandardMaterial } from "three";

export class TerrainMaterial extends MeshStandardMaterial {

    private static instance: TerrainMaterial | null = null;
  constructor(textureArray: DataArrayTexture) {
    super({
    //   uniforms: {
    //     textureArray: { value: textureArray },
    //   },
    //   vertexShader: /* glsl */ `
    //     // Vertex shader code
    //   `,
    //   fragmentShader: /* glsl */ `
    //     // Fragment shader code
    //   `,
    });
  }

  public static getInstance(textureArray?: DataArrayTexture): TerrainMaterial {
    if (!TerrainMaterial.instance) {
      if (!textureArray) {
        throw new Error('Texture array must be provided for the first initialization.');
      }
      TerrainMaterial.instance = new TerrainMaterial(textureArray);
    }
    return TerrainMaterial.instance;
  }
}