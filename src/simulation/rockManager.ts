/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { getTerrainHeight, getTerrainNormal } from './terrainNoise';
import { RockSampleData } from './types';

export class RockManager {
  public group: THREE.Group;
  public boulderInstances: THREE.InstancedMesh;
  public mediumInstances: THREE.InstancedMesh;
  public pebbleInstances: THREE.InstancedMesh;

  public sampleTargets: RockSampleData[] = [];
  public physicsBodies: CANNON.Body[] = [];

  constructor(scene: THREE.Scene, world: CANNON.World) {
    this.group = new THREE.Group();
    this.group.name = 'RockGroup';

    // 1. Organic, wind-carved Martian ventifact geometries (smooth subdivision, NO flat-shaded boxes)
    const boulderGeo = this.createErodedVentifactGeometry(1.2, 3);
    const mediumGeo = this.createErodedVentifactGeometry(0.55, 2);
    const pebbleGeo = this.createErodedVentifactGeometry(0.22, 1);

    // 2. High fidelity PBR rock materials (GTA V / Starfield game texture quality)
    const rockDiffuse = this.createProceduralRockTexture();

    const boulderMat = new THREE.MeshStandardMaterial({
      color: 0x8a422b,
      map: rockDiffuse,
      roughness: 0.82,
      metalness: 0.15,
      flatShading: false, // Smooth realistic shading, zero boxy look
    });

    const mediumMat = new THREE.MeshStandardMaterial({
      color: 0x733420,
      map: rockDiffuse,
      roughness: 0.85,
      metalness: 0.12,
      flatShading: false,
    });

    const pebbleMat = new THREE.MeshStandardMaterial({
      color: 0x9c4e32,
      roughness: 0.9,
      metalness: 0.08,
      flatShading: false,
    });

    // 3. Setup instanced meshes
    const boulderCount = 120;
    const mediumCount = 420;
    const pebbleCount = 1400;

    this.boulderInstances = new THREE.InstancedMesh(boulderGeo, boulderMat, boulderCount);
    this.boulderInstances.castShadow = true;
    this.boulderInstances.receiveShadow = true;

    this.mediumInstances = new THREE.InstancedMesh(mediumGeo, mediumMat, mediumCount);
    this.mediumInstances.castShadow = true;
    this.mediumInstances.receiveShadow = true;

    this.pebbleInstances = new THREE.InstancedMesh(pebbleGeo, pebbleMat, pebbleCount);
    this.pebbleInstances.receiveShadow = true;

    this.populateBoulders(boulderCount, world);
    this.populateMediumRocks(mediumCount);
    this.populatePebbles(pebbleCount);

    this.group.add(this.boulderInstances);
    this.group.add(this.mediumInstances);
    this.group.add(this.pebbleInstances);

    scene.add(this.group);
  }

  private createProceduralRockTexture(): THREE.CanvasTexture {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // Base weathered rock gradient
    const grad = ctx.createLinearGradient(0, 0, size, size);
    grad.addColorStop(0, '#5f2b1d');
    grad.addColorStop(0.35, '#7d3824');
    grad.addColorStop(0.7, '#672d1f');
    grad.addColorStop(1, '#843d28');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    // Weathered horizontal sedimentary strata bands
    ctx.fillStyle = 'rgba(180, 95, 60, 0.25)';
    for (let y = 15; y < size; y += 38) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(size * 0.3, y + Math.sin(y) * 12, size * 0.7, y - Math.cos(y) * 12, size, y);
      ctx.lineTo(size, y + 16);
      ctx.lineTo(0, y + 16);
      ctx.fill();
    }

    // Porous basalt mineral speckles
    const imgData = ctx.getImageData(0, 0, size, size);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      if (Math.random() < 0.18) {
        const noise = (Math.random() - 0.5) * 45;
        data[i] = Math.min(255, Math.max(0, data[i] + noise));
        data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise * 0.7));
        data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise * 0.4));
      }
    }
    ctx.putImageData(imgData, 0, 0);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  /**
   * Generates organic, wind-eroded Martian ventifact boulder geometry with smooth curvature.
   * Completely avoids cube or squarish box shapes.
   */
  private createErodedVentifactGeometry(baseRadius: number, detail: number): THREE.BufferGeometry {
    const geo = new THREE.IcosahedronGeometry(baseRadius, detail);
    const pos = geo.attributes.position;
    const v = new THREE.Vector3();

    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      const len = v.length();
      const nx = v.x / len;
      const ny = v.y / len;
      const nz = v.z / len;

      // Smooth multi-frequency aerodynamic erosion (wind-abraded Martian ventifact)
      const windErosion =
        Math.sin(nx * 3.5 + ny * 2.1) * 0.22 +
        Math.cos(ny * 4.2 + nz * 2.8) * 0.16 +
        Math.sin(nz * 5.1 + nx * 4.3) * 0.1;

      // Geological horizontal stratification (strata ridges)
      const strata = Math.sin(ny * 12.0) * 0.05;

      const totalScale = 1.0 + windErosion + strata;
      v.multiplyScalar(totalScale);

      // Naturally flattened resting base (bottom sits flush and grounded in sand)
      if (v.y < 0) {
        v.y *= 0.65;
      }

      pos.setXYZ(i, v.x, v.y, v.z);
    }

    geo.computeVertexNormals();
    return geo;
  }

  private populateBoulders(count: number, world: CANNON.World) {
    const dummy = new THREE.Object3D();
    const _norm = new THREE.Vector3();
    const up = new THREE.Vector3(0, 1, 0);
    const quat = new THREE.Quaternion();
    const color = new THREE.Color();

    const minerals: Array<{ name: string; type: RockSampleData['type']; desc: string; fe: number; si: number; h2o: number; valuable: boolean }> = [
      { name: 'Gale Outcrop Alpha', type: 'Hematite', desc: 'Specular iron oxide indicative of past hydrothermal or groundwater activity.', fe: 68, si: 14, h2o: 3.2, valuable: true },
      { name: 'Jezero Ridge Basalt', type: 'Basalt', desc: 'Dense volcanic igneous formation rich in pyroxene and plagioclase feldspar.', fe: 42, si: 48, h2o: 0.8, valuable: false },
      { name: 'Chryse Olivine Knob', type: 'Olivine', desc: 'Magnesium iron silicate crystalline mineral preserved from early Noachian epoch.', fe: 35, si: 44, h2o: 1.1, valuable: true },
      { name: 'Nili Phyllosilicate', type: 'Sulfate Clay', desc: 'Hydrated smectite clay layered deposit formed in ancient neutral aqueous basin.', fe: 22, si: 54, h2o: 8.5, valuable: true },
      { name: 'Aeolis Eolian Sandstone', type: 'Silicate Sandstone', desc: 'Cross-bedded lithified dune sandstone cemented by calcium sulfates.', fe: 18, si: 72, h2o: 2.0, valuable: false },
      { name: 'Aero-Iron Fragment', type: 'Meteorite Fragment', desc: 'Nickel-iron planetary impactite fragment with classic regmaglypt surface indentations.', fe: 88, si: 4, h2o: 0.1, valuable: true },
    ];

    let idx = 0;
    let placed = 0;
    while (placed < count && idx < count * 3) {
      idx++;
      const angle = (idx * 137.5 * Math.PI) / 180;
      const radius = 14 + Math.sqrt((placed + 1) / count) * 115;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;

      // Keep clearance around lander platform
      if (Math.sqrt(x * x + z * z) < 11.0) continue;

      const y = getTerrainHeight(x, z);
      getTerrainNormal(x, z, _norm);

      // Organic smooth scale (elongated aerodynamic shape along wind)
      const sX = 0.9 + Math.random() * 1.6;
      const sY = 0.7 + Math.random() * 1.1;
      const sZ = 1.0 + Math.random() * 1.8;

      dummy.position.set(x, y - sY * 0.28, z);
      quat.setFromUnitVectors(up, _norm);
      dummy.quaternion.copy(quat);
      dummy.rotateY(Math.random() * Math.PI * 2);
      dummy.scale.set(sX, sY, sZ);
      dummy.updateMatrix();

      this.boulderInstances.setMatrixAt(placed, dummy.matrix);

      // Rich Martian rock color variety
      const cChoice = Math.random();
      if (cChoice < 0.3) {
        color.setHex(0x50261a); // Dark volcanic basalt
      } else if (cChoice < 0.65) {
        color.setHex(0x7c3823); // Weathered hematite red
      } else if (cChoice < 0.88) {
        color.setHex(0x9a4a2e); // Sandstone ochre
      } else {
        color.setHex(0x3e1c14); // Deep iron impactite
      }
      this.boulderInstances.setColorAt(placed, color);

      // Physics collision shape for large boulders
      if (radius < 75 && (sX + sZ) * 0.5 > 1.1) {
        const avgRad = (sX + sZ) * 0.5 * 0.9;
        const boulderBody = new CANNON.Body({
          mass: 0,
          position: new CANNON.Vec3(x, y + avgRad * 0.5, z),
          shape: new CANNON.Sphere(avgRad),
        });
        world.addBody(boulderBody);
        this.physicsBodies.push(boulderBody);
      }

      if (placed < 12) {
        const m = minerals[placed % minerals.length];
        this.sampleTargets.push({
          id: `target-${placed}`,
          name: `${m.name} [Sector ${(placed + 1).toString().padStart(2, '0')}]`,
          type: m.type,
          description: m.desc,
          distance: 0,
          ironOxidePct: m.fe,
          silicaPct: m.si,
          waterBoundPct: m.h2o,
          scientificallyValuable: m.valuable,
        });
      }

      placed++;
    }

    this.boulderInstances.instanceMatrix.needsUpdate = true;
    if (this.boulderInstances.instanceColor) {
      this.boulderInstances.instanceColor.needsUpdate = true;
    }
  }

  private populateMediumRocks(count: number) {
    const dummy = new THREE.Object3D();
    const _norm = new THREE.Vector3();
    const up = new THREE.Vector3(0, 1, 0);
    const quat = new THREE.Quaternion();
    const color = new THREE.Color();

    for (let i = 0; i < count; i++) {
      const angle = i * 2.39996;
      const radius = 8 + Math.sqrt((i + 1) / count) * 125;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;

      const y = getTerrainHeight(x, z);
      getTerrainNormal(x, z, _norm);

      const s = 0.45 + Math.random() * 0.75;
      dummy.position.set(x, y - s * 0.2, z);
      quat.setFromUnitVectors(up, _norm);
      dummy.quaternion.copy(quat);
      dummy.rotateY(Math.random() * Math.PI * 2);
      dummy.scale.set(s * (0.8 + Math.random() * 0.4), s * 0.7, s * (0.8 + Math.random() * 0.4));
      dummy.updateMatrix();

      this.mediumInstances.setMatrixAt(i, dummy.matrix);

      color.setHex(Math.random() > 0.5 ? 0x6e311f : 0x8a3f28);
      this.mediumInstances.setColorAt(i, color);
    }

    this.mediumInstances.instanceMatrix.needsUpdate = true;
    if (this.mediumInstances.instanceColor) {
      this.mediumInstances.instanceColor.needsUpdate = true;
    }
  }

  private populatePebbles(count: number) {
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 4 + Math.sqrt(Math.random()) * 135;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const y = getTerrainHeight(x, z);

      const s = 0.15 + Math.random() * 0.28;
      dummy.position.set(x, y + s * 0.1, z);
      dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      dummy.scale.set(s, s * 0.65, s * 0.85);
      dummy.updateMatrix();

      this.pebbleInstances.setMatrixAt(i, dummy.matrix);

      color.setHex(Math.random() > 0.4 ? 0x823b24 : 0xab5433);
      this.pebbleInstances.setColorAt(i, color);
    }

    this.pebbleInstances.instanceMatrix.needsUpdate = true;
    if (this.pebbleInstances.instanceColor) {
      this.pebbleInstances.instanceColor.needsUpdate = true;
    }
  }

  public dispose(world: CANNON.World) {
    this.physicsBodies.forEach(b => world.removeBody(b));
    this.boulderInstances.geometry.dispose();
    (this.boulderInstances.material as THREE.Material).dispose();
    this.mediumInstances.geometry.dispose();
    (this.mediumInstances.material as THREE.Material).dispose();
    this.pebbleInstances.geometry.dispose();
    (this.pebbleInstances.material as THREE.Material).dispose();
  }
}
