// 3d/Chunk.ts
import { BufferAttribute, BufferGeometry, Float32BufferAttribute, Mesh, MeshStandardMaterial, PlaneGeometry, Scene } from 'three';
import { ChunkData } from '../utils/interfaces';
import { base64ToUint8Array, decompressUint8ToFloat32 } from '../utils/functions';
import { generateMeshWorker } from '../workers/MeshWorkerMultimat';
import { TerrainMaterial } from '../material/TerrainMaterial';

export class ChunkMesh extends Mesh {

  constructor(chunkData: ChunkData) {
	super(
		new BufferGeometry(),
		TerrainMaterial.getInstance()
	);

	this.scale.set( 0.5, 0.5, 0.5 );

	this.position.x = chunkData.x;
	this.position.y = chunkData.y;
	this.position.z = chunkData.z;

	this.castShadow = true;
	this.receiveShadow = true;

	this.updateWorldMatrix(false, false);
	this.matrixAutoUpdate = false;

	this.setChunkData(chunkData)

    // console.log(gridFloat32);

    // const geometry = new PlaneGeometry(4, 4, 4);
    // const material = new MeshStandardMaterial({ color: 0x0077ff });
    // this.mesh = new Mesh(geometry, material);
    // scene.add(this.mesh);
  }

  async setChunkData(chunkData: ChunkData) {
	const gridUint8 = base64ToUint8Array(chunkData.grid);
    const gridFloat32 = decompressUint8ToFloat32(gridUint8);

	const data = generateMeshWorker(
        gridFloat32,
        {x: 32, y: 32, z: 32},
        new Float32Array(gridFloat32).fill(0),
        new Float32Array(),
        new Float32Array(gridFloat32).fill(0),
      )
	//   console.log(data)

    const geoBuffer = this.generateMesh(
		data
    );

	this.geometry.dispose();
	this.geometry = geoBuffer;
  }

  generateMesh( data: any ): BufferGeometry {

	// console.log(data)
	// console.log('aaa')

		const {
			indices,
			vertices,
			adjusted,
			bary,
			light,
			lightIndices,
			normal
		} = data;

		// return new PlaneGeometry(32,32,32);

		// if ( indices.length === 0 ) return;

		//create new geometry
		const buffer = new BufferGeometry();

		const indexBufferAttribute = new BufferAttribute( indices, 1 )
		buffer.setIndex( indexBufferAttribute );
		indexBufferAttribute.needsUpdate = true;

		const positionBufferAttribute = new Float32BufferAttribute( vertices, 3 )
		buffer.setAttribute( 'position', positionBufferAttribute );
		positionBufferAttribute.needsUpdate = true;
		
		const adjustedBufferAttribute = new BufferAttribute( adjusted, 3 )
		buffer.setAttribute( 'adjusted', adjustedBufferAttribute );
		adjustedBufferAttribute.needsUpdate = true;

		const baryBufferAttribute = new BufferAttribute( bary, 3 )
		buffer.setAttribute( 'bary', baryBufferAttribute );
		baryBufferAttribute.needsUpdate = true;

		const lightBufferAttribute = new BufferAttribute( light, 1 )
		buffer.setAttribute( 'light', lightBufferAttribute );
		lightBufferAttribute.needsUpdate = true;

		// this.lightIndices = lightIndices;

		const normalBufferAttribute = new BufferAttribute( normal, 3 )
		buffer.setAttribute( 'normal', normalBufferAttribute );
		normalBufferAttribute.needsUpdate = true;
		// buffer.computeVertexNormals();
		
		// meshObjs.indices.set(indices)

		// meshObjs.vertices.set(vertices)

		// meshObjs.adjusted.set(adjusted)

		buffer.computeBoundsTree();

		return buffer;
	}
}