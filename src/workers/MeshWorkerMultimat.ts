import { Q_rsqrt } from "../utils/functions";
import { SurfaceNets } from "./SurfaceNets";

const surfaceNetEngine = new SurfaceNets();

// oooo d8b oooo  oooo  ooo. .oo.
// `888""8P `888  `888  `888P"Y88b
//  888      888   888   888   888
//  888      888   888   888   888
// d888b     `V88V"V8P' o888o o888o

// self.onmessage = ( { data } ) => {

// 	if ( data.grid ) generateMeshWorker( data );

// };

export function generateMeshWorker(
  grid: Float32Array,
  gridSize: { x: number; y: number; z: number },
  // terrainHeights,
  materials: Float32Array,
  materialRange: [number, number],
  lightIncidents: Float32Array,
  lightIndices: Float32Array,
  regenerateLights = true,
  generateSun = false
) {
  const generatedSurface = surfaceNetEngine.createSurface(
    grid,
    [gridSize.x, gridSize.y, gridSize.z],
    materials,
    materialRange
  );

  // TODO don't initialise new arrays, resize an exisiting buffer

  // const topvertmap = {};
  // console.log(generatedSurface)
  const indices = new Uint16Array(generatedSurface.faces.length * 3); //2 faces per generated face, 3 vertices
  const vertices = new Float32Array(generatedSurface.faces.length * 3 * 3); //2 faces per generated face, 3 vertices, 3 xyz coords
  const bary = new Float32Array(generatedSurface.faces.length * 3 * 3); //2 faces per generated face, 3 vertices, 3 uxw coords
  const adjusted = new Int8Array(generatedSurface.faces.length * 3 * 3); //2 faces per generated face, 3 vertices, 3 material inds
  const light = new Float32Array(generatedSurface.faces.length * 3); //2 faces per generated face, 3 vertices, 1 light value
  const vertexNormalAccumulator = new Float32Array(
    generatedSurface.vertices.length * 3
  ); //1 vertex, 3 normal axis
  const normal = new Float32Array(generatedSurface.faces.length * 3 * 3); //2 faces per generated face, 3 vertices, 3 normal axis

  const stack: [number, number, number, number, boolean][] = [];
  const gridXY = gridSize.x * gridSize.y; // Precompute grid size for efficiency
  const gridZ = gridSize.z;
  const decayFactor = 0.04;

  if (regenerateLights) {
    lightIndices.fill(0.0);

    function lightStackPush(x, y, z, intensity, sun = false) {
      const newIntensity = intensity - decayFactor;

      // Push neighboring voxels onto the stack
      stack.push([x + 1, y, z, newIntensity, false]); // Right
      stack.push([x - 1, y, z, newIntensity, false]); // Left
      if (!sun) stack.push([x, y + 1, z, newIntensity, false]); // Up if not sun
      if (!sun) stack.push([x, y - 1, z, newIntensity, false]); // Down if not sun
      stack.push([x, y, z + 1, newIntensity, false]); // Forward
      stack.push([x, y, z - 1, newIntensity, false]); // Backward
    }
    let acc5 = 0;
    // Loop through the light indices
    for (let i = 0; i < lightIncidents.length; i++) {
      if (grid[i] > 0) continue;

      const intensity = lightIncidents[i];
      if (intensity > 0) {
        const z = Math.floor(i / gridXY); // Precompute z index
        const y = Math.floor((i - z * gridXY) / gridZ); // Precompute y index
        const x = i - z * gridXY - y * gridZ; // Precompute x index
        lightIndices[i] = 1.0; // set cell to full light
        acc5++;
        lightStackPush(x, y, z, intensity, false); // Push to stack as array to reduce memory overhead
      }
    }
    // console.log(acc5)
    let acc0 = 0;
    if (generateSun) {
      const y = gridSize.y;
      for (let x = 0; x < gridSize.x; x++) {
        for (let z = 0; z < gridSize.z; z++) {
          for (let y = gridSize.y - 1; y >= 0; y--) {
            const p = z * gridXY + y * gridZ + x;

            if (grid[p] > 0) {
              // check cell is full
              acc0++;
              lightStackPush(x, y + 1, z, 1.0, true); // add cell above as light
              break; //stop looping this column
            }

            lightIndices[p] = 1.0; //otherwise add cell as full light
          }
        }
      }
    }

    // console.log('sun acc', acc0)

    function lightFill3D() {
      let acc = 0;
      let acc1 = 0;
      let acc2 = 0;
      let acc4 = 0;

      while (stack.length > 0) {
        const [x, y, z, intensity, sun]: any = stack.shift();
        // console.log(x,y,z,intensity)

        // Combined boundary checks for performance
        if (
          x < 0 ||
          x >= gridSize.x ||
          y < 0 ||
          y >= gridSize.y ||
          z < 0 ||
          z >= gridSize.z
        ) {
          acc2++;
          continue;
        }

        const p = z * gridXY + y * gridZ + x;

        if (lightIndices[p] >= intensity) {
          acc++;
          continue;
        }

        lightIndices[p] = intensity;

        // TODO fix light not propigating when on some 0-0.5 grid cells
        if (grid[p] > 0) {
          acc1++;
          continue;
        }
        acc4++;
        lightStackPush(x, y, z, intensity, sun);
      }
      // console.log('light acc', acc, acc1, acc2, acc4)
    }

    lightFill3D();
  } else {
    lightIndices.fill(1.0);
  }

  const getMaterialLightValue = (v, mv) => {
    const x = Math.round(v[0]);
    const y = v[1];
    const z = Math.round(v[2]);
    // const terrainHeight = terrainHeights[ z * gridSize.x + x ];

    const p = z * (gridSize.x * gridSize.y) + Math.round(y) * gridSize.z + x;
    const l = lightIndices[p] ** 4;

    const m = materials[mv];
    return [m, l];
  };

  // const generateFaceNormal = (v0, v1, v2) => {
  // 	const [e0x, e0y, e0z] = [v0[0] - v1[0], v0[1] - v1[1], v0[2] - v1[2]];

  // 	// Set edge2 as C - A
  // 	const [e1x, e1y, e1z] = [v2[0] - v0[0], v2[1] - v0[1], v2[2] - v0[2]];

  // 	const [nX, nY, nZ] = [
  // 		e0y * e1z - e0z * e1y,
  // 		e0z * e1x - e0x * e1z,
  // 		e0x * e1y - e0y * e1x
  // 	];

  // 	const l = Q_rsqrt(nX * nX + nY * nY + nZ * nZ);

  // 	return [nX * l, nY * l, nZ * l];
  // }

  const generateVertexInfo = (i, j, v, m) => {
    vertices[i + 0] = v[0];
    vertices[i + 1] = v[1];
    vertices[i + 2] = v[2];

    bary[i + 0] = j === 0 ? 1 : 0;
    bary[i + 1] = j === 1 ? 1 : 0;
    bary[i + 2] = j === 2 ? 1 : 0;

    adjusted[i + 0] = m[0];
    adjusted[i + 1] = m[1];
    adjusted[i + 2] = m[2];
  };

  const accumulateVertexNormal = (i, n) => {
    vertexNormalAccumulator[i + 0] += n[0];
    vertexNormalAccumulator[i + 1] += n[1];
    vertexNormalAccumulator[i + 2] += n[2];
  };

  const generateFaceInfo = (i, o) => {
    const f = generatedSurface.faces[i];

    const v0 = generatedSurface.vertices[f[0]];
    const v1 = generatedSurface.vertices[f[1]];
    const v2 = generatedSurface.vertices[f[2]];

    const mv0 = generatedSurface.indicies[f[0]];
    const mv1 = generatedSurface.indicies[f[1]];
    const mv2 = generatedSurface.indicies[f[2]];

    const i0 = i * 3 + o + 0;
    const i1 = i * 3 + o + 1;
    const i2 = i * 3 + o + 2;

    // const n = generateFaceNormal(v0, v1, v2);
    const n = generatedSurface.normals[i];
    accumulateVertexNormal(f[0] * 3, n);
    accumulateVertexNormal(f[1] * 3, n);
    accumulateVertexNormal(f[2] * 3, n);

    const [m0, l0] = getMaterialLightValue(v0, mv0);
    const [m1, l1] = getMaterialLightValue(v1, mv1);
    const [m2, l2] = getMaterialLightValue(v2, mv2);

    generateVertexInfo(i0 * 3, 0, v0, [m0, m1, m2]);
    generateVertexInfo(i1 * 3, 1, v1, [m0, m1, m2]);
    generateVertexInfo(i2 * 3, 2, v2, [m0, m1, m2]);

    indices[i0] = i0;
    indices[i1] = i1;
    indices[i2] = i2;

    light[i0] = l0;
    light[i1] = l1;
    light[i2] = l2;
  };

  const normaliseVertexNormals = (i, o) => {
    const i0 = i * 3 + o + 0;
    const i1 = i * 3 + o + 1;
    const i2 = i * 3 + o + 2;

    const f = generatedSurface.faces[i];

    generateVertexNormal(i0 * 3, f[0] * 3);
    generateVertexNormal(i1 * 3, f[1] * 3);
    generateVertexNormal(i2 * 3, f[2] * 3);

    // generateVertexNormal(i0 * 3, f[ 0 ]);
    // generateVertexNormal(i1 * 3, f[ 1 ]);
    // generateVertexNormal(i2 * 3, f[ 2 ]);
  };

  const generateVertexNormal = (i, j) => {
    const nX = vertexNormalAccumulator[j + 0];
    const nY = vertexNormalAccumulator[j + 1];
    const nZ = vertexNormalAccumulator[j + 2];
    // const nX = generatedSurface.normal_accum[ j ][0];
    // const nY = generatedSurface.normal_accum[ j ][1];
    // const nZ = generatedSurface.normal_accum[ j ][2];

    const l = Q_rsqrt(nX * nX + nY * nY + nZ * nZ);

    normal[i + 0] = -nX * l;
    normal[i + 1] = -nY * l;
    normal[i + 2] = -nZ * l;
  };

  for (let i = 0; i < generatedSurface.faces.length; i++) {
    generateFaceInfo(i, 0);
    // generateFaceInfo(i, 3, [3, 2, 0]);
  }

  for (let i = 0; i < generatedSurface.faces.length; i++) {
    normaliseVertexNormals(i, 0);
    // normaliseVertexNormals(i, 3, [3, 2, 0]);
  }

  // console.log(indices)

  return {
    indices,
    vertices,
    // underground,
    // topindices,
    // topvertices,
    adjusted,
    bary,
    light,
    lightIndices,
    normal,
  };

  // self.postMessage(
  // 	{
  // 		indices,
  // 		vertices,
  // 		// underground,
  // 		// topindices,
  // 		// topvertices,
  // 		adjusted,
  // 		bary,
  // 		light,
  // 		lightIndices,
  // 		normal
  // 	},
  // 	[
  // 		indices.buffer,
  // 		vertices.buffer,
  // 		// underground.buffer,
  // 		// topindices.buffer,
  // 		// topvertices.buffer,
  // 		adjusted.buffer,
  // 		bary.buffer,
  // 		light.buffer,
  // 		lightIndices.buffer,
  // 		normal.buffer
  // 	]
  // );
}
