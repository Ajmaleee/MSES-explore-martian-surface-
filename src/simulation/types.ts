/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface RoverTelemetry {
  speedKmh: number;
  speedMs: number;
  motorRpm: number;
  headingDeg: number;
  pitchDeg: number;
  rollDeg: number;
  elevationM: number;
  slopeGradePct: number;
  batteryPct: number;
  isOverturned: boolean;
  inAir: boolean;
  wheelLoads: [number, number, number, number]; // FL, FR, RL, RR
  wheelSlip: [number, number, number, number];
  suspensionCompression: [number, number, number, number];
  sol: number;
  missionTimeSeconds: number;
  odometerMeters: number;
  isBraking: boolean;
  isReversing: boolean;
  armStatus: 'stowed' | 'deploying' | 'deployed' | 'stowing';
  isDrilling: boolean;
  lastSampleName: string | null;
  deployedFromLander: boolean;
  windSpeedMs: number;
  surfaceTempC: number;
  atmospherePressureKPa: number;
}

export interface RoverInputState {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  brake: boolean;
  armDeploy: boolean;
  armStow: boolean;
  drill: boolean;
}

export type CameraViewMode = 'third_person' | 'mast_cam' | 'arm_cam' | 'free_orbit';

export interface SimulationConfig {
  gravity: number; // default -9.81 under the hood
  windSpeed: number; // default 8.5 m/s
  windDirectionAngle: number; // radians
  dustDensity: number; // 0.1 to 2.0
  timeOfDayHours: number; // 0 to 24
  shadowsEnabled: boolean;
  drivePower: number; // engine power multiplier
  cameraMode: CameraViewMode;
}

export interface RockSampleData {
  id: string;
  name: string;
  type: 'Basalt' | 'Hematite' | 'Olivine' | 'Sulfate Clay' | 'Silicate Sandstone' | 'Meteorite Fragment';
  description: string;
  distance: number;
  ironOxidePct: number;
  silicaPct: number;
  waterBoundPct: number;
  scientificallyValuable: boolean;
}
