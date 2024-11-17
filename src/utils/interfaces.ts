export interface UserData {
  token: string;
  user: {
    id: string;
    email: string;
  };
}

export interface HeightData {
  x: number;
  z: number;
  heights: string;
}

export interface ChunkData {
  id: string;
  x: number;
  y: number;
  z: number;
  grid: string;
  owner?: string;
}

export interface ChunkAPIResponse {
  chunks: ChunkData[];
  heights: HeightData[];
}

export interface ChunkCoord {
  x: number;
  y: number;
  z: number;
}

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}
