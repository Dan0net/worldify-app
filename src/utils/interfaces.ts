export interface UserData {
  token: string;
  user: {
    id: string;
    email: string;
  }
}

export interface ChunkData {
  id: string, 
  x: number, 
  y: number, 
  z: number,
  grid: string,
  heights?: string,
  owner?: string;
}

export interface ChunkCoord {
  x: number,
  y: number,
  z: number
}