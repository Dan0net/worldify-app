import { Vector3 } from "three";

export const _PI_2 = Math.PI / 2;

export const UP_VECTOR3 = new Vector3( 0, 1, 0 );

export const PLAYER_SPEED = 10;
export const PLAYER_RUN_SPEED = 20;
export const PLAYER_GRAVITY = -40;
export const PLAYER_CAMERA_ANGLE_MAX = Math.PI;
export const PLAYER_CAMERA_ANGLE_MIN = 0;

export const PHYSICS_STEPS = 5;
export const INPUT_LIMIT_THROTTLE_MS = 16;

export const TERRAIN_SCALE = 0.5;
export const TERRAIN_GRID_SIZE = 30;
export const TERRAIN_SIZE = TERRAIN_SCALE * TERRAIN_GRID_SIZE;

export const VIEW_DISTANCE_MAX = 4;
export const VIEW_DISTANCE_MIN = 1;

export const BUILD_DISTANCE_MAX = 15;
export const BUILD_ROTATION_STEP = Math.PI / 8;
export const BUILD_SNAP_SIZE = 0.5;