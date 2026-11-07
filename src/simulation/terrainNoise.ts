/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';

// Fast deterministic permutation table for 2D/3D gradient noise
const P = new Uint8Array(512);
const PERM = [
  151,160,137,91,90,15,131,13,201,95,96,53,194,233,7,225,140,36,103,30,69,142,
  8,99,37,240,21,10,23,190,6,148,247,120,234,75,0,26,197,62,94,252,219,203,117,
  35,11,32,57,177,33,88,237,149,56,87,174,20,125,136,171,168,68,175,74,165,71,
  134,139,48,27,166,77,146,158,231,83,111,229,122,60,211,133,230,220,105,92,41,
  55,46,245,40,244,102,143,54,65,25,63,161,1,216,80,73,209,76,132,187,208,89,
  18,169,200,196,135,130,116,188,159,86,164,100,109,198,173,186,3,64,52,217,226,
  250,124,123,5,202,38,147,118,126,255,82,85,212,207,206,59,227,47,16,58,17,182,
  189,28,42,223,183,170,213,119,248,152,2,44,154,163,70,221,153,101,155,167,43,
  172,9,129,22,39,253,19,98,108,110,79,113,224,232,178,185,112,104,218,246,97,
  228,251,34,242,193,238,210,144,12,191,179,162,241,81,51,145,235,249,14,239,
  107,49,192,214,31,181,199,106,157,184,84,204,176,115,121,50,45,127,4,150,254,
  138,236,205,93,222,114,67,29,24,72,243,141,128,195,78,66,215,61,156,180
];

for (let i = 0; i < 256; i++) {
  P[i] = PERM[i];
  P[256 + i] = PERM[i];
}

function fade(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function lerp(t: number, a: number, b: number): number {
  return a + t * (b - a);
}

function grad2d(hash: number, x: number, y: number): number {
  const h = hash & 7;
  const u = h < 4 ? x : y;
  const v = h < 4 ? y : x;
  return ((h & 1) ? -u : u) + ((h & 2) ? -2.0 * v : 2.0 * v);
}

export function perlin2D(x: number, y: number): number {
  const X = Math.floor(x) & 255;
  const Y = Math.floor(y) & 255;
  const xf = x - Math.floor(x);
  const yf = y - Math.floor(y);

  const u = fade(xf);
  const v = fade(yf);

  const aa = P[P[X] + Y];
  const ab = P[P[X] + Y + 1];
  const ba = P[P[X + 1] + Y];
  const bb = P[P[X + 1] + Y + 1];

  const gaa = grad2d(aa, xf, yf);
  const gba = grad2d(ba, xf - 1, yf);
  const gab = grad2d(ab, xf, yf - 1);
  const gbb = grad2d(bb, xf - 1, yf - 1);

  const x1 = lerp(u, gaa, gba);
  const x2 = lerp(u, gab, gbb);

  return lerp(v, x1, x2) * 0.45;
}

// Craters list with fixed coordinates to ensure reproducible geological features
interface CraterDef {
  x: number;
  z: number;
  radius: number;
  depth: number;
  rimHeight: number;
}

const CRATERS: CraterDef[] = [
  { x: 42, z: 58, radius: 24, depth: 4.8, rimHeight: 2.2 },
  { x: -65, z: 35, radius: 32, depth: 7.2, rimHeight: 3.1 },
  { x: -38, z: -80, radius: 18, depth: 3.6, rimHeight: 1.6 },
  { x: 95, z: -45, radius: 48, depth: 10.5, rimHeight: 4.2 },
  { x: 130, z: 110, radius: 60, depth: 14.0, rimHeight: 5.5 },
  { x: -110, z: -120, radius: 45, depth: 9.8, rimHeight: 3.8 },
  { x: -15, z: 95, radius: 22, depth: 4.2, rimHeight: 1.9 },
  { x: 75, z: -115, radius: 28, depth: 5.5, rimHeight: 2.4 },
];

function sampleCraterOffset(x: number, z: number): number {
  let offset = 0;
  for (let i = 0; i < CRATERS.length; i++) {
    const c = CRATERS[i];
    const dx = x - c.x;
    const dz = z - c.z;
    const distSq = dx * dx + dz * dz;
    const radSq = c.radius * c.radius;
    const rimOuterSq = (c.radius * 1.5) * (c.radius * 1.5);

    if (distSq < radSq) {
      // Inside crater depression: parabolic bowl + flat floor
      const normalizedDist = Math.sqrt(distSq) / c.radius;
      const bowl = Math.cos(normalizedDist * Math.PI * 0.5);
      offset -= c.depth * Math.pow(bowl, 1.8);
    } else if (distSq < rimOuterSq) {
      // Raised rim ejecta ring
      const dist = Math.sqrt(distSq);
      const rimFactor = 1.0 - (dist - c.radius) / (c.radius * 0.5);
      offset += c.rimHeight * Math.sin(rimFactor * Math.PI);
    }
  }
  return offset;
}

/**
 * Computes exact procedural terrain height at coordinate (x, z).
 * Deterministic and continuous across the entire infinite Martian landscape.
 */
export function getTerrainHeight(x: number, z: number): number {
  // Safe leveled platform around landing site (0, 0)
  const distFromLander = Math.sqrt(x * x + z * z);
  let landingFlatten = 1.0;
  if (distFromLander < 28) {
    landingFlatten = Math.max(0.0, (distFromLander - 10) / 18.0);
    landingFlatten = landingFlatten * landingFlatten * (3 - 2 * landingFlatten);
  }

  // Domain warping for natural erosion ridges
  const qx = perlin2D(x * 0.005 + 1.2, z * 0.005 + 3.4);
  const qz = perlin2D(x * 0.005 + 5.2, z * 0.005 + 1.3);

  const wx = x + qx * 35;
  const wz = z + qz * 35;

  // 1. Continental rolling hills / ridges
  const h1 = perlin2D(wx * 0.0035, wz * 0.0035) * 26.0;

  // 2. Medium undulations & dry canyon terraces
  const h2 = perlin2D(wx * 0.012, wz * 0.012) * 8.5;

  // 3. Martian dunes and wind-rippled ridges
  // Ridged noise: abs(perlin) creates sharp geological crests
  const ridge = Math.abs(perlin2D(x * 0.025, z * 0.025)) * 3.8;

  // 4. Fine regolith micro-undulations
  const h4 = perlin2D(x * 0.08, z * 0.08) * 0.75;
  const h5 = perlin2D(x * 0.25, z * 0.25) * 0.18;

  // Craters
  const crater = sampleCraterOffset(x, z);

  const rawHeight = h1 + h2 + ridge + h4 + h5 + crater;

  // Apply landing plateau smoothing
  return rawHeight * landingFlatten;
}

const _vA = new THREE.Vector3();
const _vB = new THREE.Vector3();
const _vC = new THREE.Vector3();
const _norm = new THREE.Vector3();

/**
 * Computes exact surface normal vector at (x, z).
 */
export function getTerrainNormal(x: number, z: number, target: THREE.Vector3): THREE.Vector3 {
  const eps = 0.25;
  const hL = getTerrainHeight(x - eps, z);
  const hR = getTerrainHeight(x + eps, z);
  const hD = getTerrainHeight(x, z - eps);
  const hU = getTerrainHeight(x, z + eps);

  // dx and dz slopes
  const dx = (hR - hL) / (2 * eps);
  const dz = (hU - hD) / (2 * eps);

  target.set(-dx, 1.0, -dz).normalize();
  return target;
}

/**
 * Computes surface slope grade (0 = flat, 1 = 45 degrees, >1 = steep).
 */
export function getTerrainSlope(x: number, z: number): number {
  getTerrainNormal(x, z, _norm);
  // cos theta = normal.y (since up is (0, 1, 0))
  // slope = tan(acos(normal.y)) = sqrt(1 - y^2) / y
  const ny = Math.max(0.001, Math.min(1.0, _norm.y));
  return Math.sqrt(1.0 - ny * ny) / ny;
}
