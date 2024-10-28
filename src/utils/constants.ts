import { Vector3 } from "three";

export const _PI_2 = Math.PI / 2;

export const UP_VECTOR3 = new Vector3( 0, 1, 0 );

export const PLAYER_SPEED = 10;
export const PLAYER_GRAVITY = -30;
export const PLAYER_CAMERA_ANGLE_MAX = Math.PI;
export const PLAYER_CAMERA_ANGLE_MIN = 0;

export const PHYSICS_STEPS = 5;

export const TERRAIN_SCALE = 0.5;
export const TERRAIN_GRID_SIZE = 30;
export const TERRAIN_SIZE = TERRAIN_SCALE * TERRAIN_GRID_SIZE;

export const VIEW_DISTANCE_MAX = 4;
export const VIEW_DISTANCE_MIN = 1;