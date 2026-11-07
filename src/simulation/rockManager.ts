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

    // 1. Generate irregular deformed rock geometries
    const boulderGeo = this.createIrregularRockGeometry(1.0, 0.35, 1);
    const mediumGeo = this.createIrregularRockGeometry(0.5, 0.4, 1);
    const pebbleGeo = this.createIrregularRockGeometry(0.2, 0.45, 0);

    // 2. High quality PBR rock materials
    const boulderMat = new THREE.MeshStandardMaterial({
      color: 0x6e3522,
      roughness: 0.88,
      metalness: 0.12,
      flatShading: true,
    });

    const mediumMat = new THREE.MeshStandardMaterial({
      color: 0x58291a,
      roughness: 0.9,
      metalness: 0.1,
      flatShading: true,
    });

    const pebbleMat = new THREE.MeshStandardMaterial({
      color: 0x823e27,
      roughness: 0.95,
      metalness: 0.05,
      flatShading: true,
    });

    // 3. Setup instanced meshes
    const boulderCount = 140;
    const mediumCount = 500;
    const pebbleCount = 1800;

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

  private createIrregularRockGeometry(baseRadius: number, deformFactor: number, detail: number): THREE.BufferGeometry {
    const geo = new THREE.DodecahedronGeometry(baseRadius, detail);
    const pos = geo.attributes.position;
    const v = new THREE.Vector3();

    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      // Deterministic deformation based on coordinate hashes
      const noise =
        Math.sin(v.x * 4.3 + v.y * 7.1) * 0.5 +
        Math.cos(v.y * 5.2 + v.z * 3.7) * 0.3 +
        Math.sin(v.z * 6.1 + v.x * 2.9) * 0.2;
      const scale = 1.0 + noise * deformFactor;
      v.multiplyScalar(scale);

      // Flatten the bottom slightly so it rests naturally
      if (v.y < 0) {
        v.y *= 0.75;
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
      // Distribute in a ring around lander: radius 12m to 125m
      const angle = (idx * 137.5 * Math.PI) / 180;
      const radius = 12 + Math.sqrt((placed + 1) / count) * 115;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;

      // Keep clearance around lander platform (center 0,0)
      if (Math.sqrt(x * x + z * z) < 9.0) continue;

      const y = getTerrainHeight(x, z);
      getTerrainNormal(x, z, _norm);

      // Random non-uniform scale
      const sX = 0.8 + Math.random() * 1.5;
      const sY = 0.6 + Math.random() * 1.2;
      const sZ = 0.8 + Math.random() * 1.5;

      dummy.position.set(x, y - sY * 0.25, z);
      quat.setFromUnitVectors(up, _norm);
      dummy.quaternion.copy(quat);
      dummy.rotateY(Math.random() * Math.PI * 2);
      dummy.rotateZ((Math.random() - 0.5) * 0.2);
      dummy.scale.set(sX, sY, sZ);
      dummy.updateMatrix();

      this.boulderInstances.setMatrixAt(placed, dummy.matrix);

      // Color variation
      const cChoice = Math.random();
      if (cChoice < 0.25) {
        color.setHex(0x351b14); // Dark basalt
      } else if (cChoice < 0.6) {
        color.setHex(0x5a2b1d); // Iron rust boulder
      } else if (cChoice < 0.85) {
        color.setHex(0x7a3923); // Ochre-tinted rock
      } else {
        color.setHex(0x2d1712); // Deep iron meteorite
      }
      this.boulderInstances.setColorAt(placed, color);

      // Add Cannon-es collision body for large boulders within 70m
      if (radius < 70 && (sX + sZ) * 0.5 > 1.0) {
        const avgRad = (sX + sZ) * 0.5 * 0.85;
        const boulderBody = new CANNON.Body({
          mass: 0, // static obstacle
          position: new CANNON.Vec3(x, y + avgRad * 0.6, z),
          shape: new CANNON.Sphere(avgRad),
        });
        world.addBody(boulderBody);
        this.physicsBodies.push(boulderBody);
      }

      // First 12 boulders become scientific sample targets
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
      const angle = (i * 2.39996);
      const radius = 6 + Math.sqrt((i + 1) / count) * 120;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;

      const y = getTerrainHeight(x, z);
      getTerrainNormal(x, z, _norm);

      const s = 0.4 + Math.random() * 0.8;
      dummy.position.set(x, y - s * 0.15, z);
      quat.setFromUnitVectors(up, _norm);
      dummy.quaternion.copy(quat);
      dummy.rotateY(Math.random() * Math.PI * 2);
      dummy.scale.set(s, s * (0.6 + Math.random() * 0.5), s);
      dummy.updateMatrix();

      this.mediumInstances.setMatrixAt(i, dummy.matrix);

      color.setHex(Math.random() > 0.5 ? 0x5a2a1c : 0x753724);
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
      const radius = 3 + Math.sqrt(Math.random()) * 130;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const y = getTerrainHeight(x, z);

      const s = 0.12 + Math.random() * 0.28;
      dummy.position.set(x, y + s * 0.1, z);
      dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      dummy.scale.set(s, s * 0.7, s);
      dummy.updateMatrix();

      this.pebbleInstances.setMatrixAt(i, dummy.matrix);

      color.setHex(Math.random() > 0.4 ? 0x7c3a25 : 0x9e4c2f);
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
