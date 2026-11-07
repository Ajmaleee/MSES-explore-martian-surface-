/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';

interface WheelPuffParticle {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  size: number;
  maxSize: number;
  life: number;
  maxLife: number;
  opacity: number;
}

export class DustSystem {
  public group: THREE.Group;

  // 1. Ambient atmospheric dust
  private ambientPoints: THREE.Points;
  private ambientPositions: Float32Array;
  private ambientCount = 800;
  private ambientBoxSize = 120;

  // 2. Wheel contact dust particle pool
  private puffPool: WheelPuffParticle[] = [];
  private puffCount = 200;
  private puffMesh: THREE.InstancedMesh;
  private puffDummy = new THREE.Object3D();

  // Wind settings
  public windDirection = new THREE.Vector2(0.85, 0.35).normalize();
  public windSpeed = 8.0; // m/s

  constructor(scene: THREE.Scene) {
    this.group = new THREE.Group();
    this.group.name = 'DustSystemGroup';

    // Build ambient wind dust
    const ambientGeo = new THREE.BufferGeometry();
    this.ambientPositions = new Float32Array(this.ambientCount * 3);
    for (let i = 0; i < this.ambientCount; i++) {
      this.ambientPositions[i * 3] = (Math.random() - 0.5) * this.ambientBoxSize;
      this.ambientPositions[i * 3 + 1] = Math.random() * 22;
      this.ambientPositions[i * 3 + 2] = (Math.random() - 0.5) * this.ambientBoxSize;
    }
    ambientGeo.setAttribute('position', new THREE.BufferAttribute(this.ambientPositions, 3));

    const ambientMat = new THREE.PointsMaterial({
      color: 0xd98652,
      size: 0.22,
      transparent: true,
      opacity: 0.35,
      blending: THREE.NormalBlending,
      depthWrite: false,
    });

    this.ambientPoints = new THREE.Points(ambientGeo, ambientMat);
    this.group.add(this.ambientPoints);

    // Build wheel contact puff pool using an InstancedMesh with soft circular puff geometry
    const puffGeo = new THREE.CircleGeometry(0.5, 8);
    const puffMat = new THREE.MeshBasicMaterial({
      color: 0xc97340,
      transparent: true,
      opacity: 0.4,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    this.puffMesh = new THREE.InstancedMesh(puffGeo, puffMat, this.puffCount);
    this.puffMesh.frustumCulled = false;

    // Initialize pool
    for (let i = 0; i < this.puffCount; i++) {
      this.puffPool.push({
        active: false,
        x: 0,
        y: 0,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        size: 0.1,
        maxSize: 0.8,
        life: 0,
        maxLife: 1.0,
        opacity: 0,
      });

      // Hide offscreen
      this.puffDummy.position.set(0, -9999, 0);
      this.puffDummy.scale.set(0, 0, 0);
      this.puffDummy.updateMatrix();
      this.puffMesh.setMatrixAt(i, this.puffDummy.matrix);
    }
    this.puffMesh.instanceMatrix.needsUpdate = true;

    this.group.add(this.puffMesh);
    scene.add(this.group);
  }

  public emitWheelPuff(
    originX: number,
    originY: number,
    originZ: number,
    wheelSpeedMs: number,
    surfaceFactor: number = 1.0
  ) {
    if (Math.abs(wheelSpeedMs) < 0.25) return;

    // Find inactive particle
    let p = this.puffPool.find(particle => !particle.active);
    if (!p) {
      // Steal oldest
      p = this.puffPool[0];
    }

    const intensity = Math.min(1.5, Math.abs(wheelSpeedMs) / 2.5) * surfaceFactor;
    p.active = true;
    p.x = originX + (Math.random() - 0.5) * 0.2;
    p.y = originY + 0.08;
    p.z = originZ + (Math.random() - 0.5) * 0.2;

    // Velocity kicked up and in wind/wheel direction
    const spread = 0.3;
    p.vx = (Math.random() - 0.5) * spread + this.windDirection.x * this.windSpeed * 0.2;
    p.vy = 0.4 + Math.random() * 0.8 * intensity;
    p.vz = (Math.random() - 0.5) * spread + this.windDirection.y * this.windSpeed * 0.2;

    p.size = 0.18;
    p.maxSize = 0.6 + intensity * 0.7;
    p.life = 0;
    p.maxLife = 0.8 + Math.random() * 0.8;
    p.opacity = 0.45 * Math.min(1.0, intensity);
  }

  public update(dt: number, roverPos: THREE.Vector3, camera: THREE.Camera) {
    // 1. Update ambient atmospheric dust drifting around the rover
    const halfBox = this.ambientBoxSize * 0.5;
    const windDx = this.windDirection.x * this.windSpeed * dt;
    const windDz = this.windDirection.y * this.windSpeed * dt;

    const posAttr = this.ambientPoints.geometry.attributes.position;
    const posArr = posAttr.array as Float32Array;

    for (let i = 0; i < this.ambientCount; i++) {
      const idx = i * 3;
      let x = posArr[idx] + windDx;
      let y = posArr[idx + 1] - 0.2 * dt; // gentle settle
      let z = posArr[idx + 2] + windDz;

      // Wrap around rover center
      const relX = x - roverPos.x;
      const relZ = z - roverPos.z;

      if (relX > halfBox) x -= this.ambientBoxSize;
      if (relX < -halfBox) x += this.ambientBoxSize;
      if (relZ > halfBox) z -= this.ambientBoxSize;
      if (relZ < -halfBox) z += this.ambientBoxSize;
      if (y < roverPos.y - 4) y = roverPos.y + 18 + Math.random() * 4;

      posArr[idx] = x;
      posArr[idx + 1] = y;
      posArr[idx + 2] = z;
    }
    posAttr.needsUpdate = true;

    // 2. Update wheel puffs
    let anyActive = false;
    for (let i = 0; i < this.puffCount; i++) {
      const p = this.puffPool[i];
      if (!p.active) continue;

      anyActive = true;
      p.life += dt;
      if (p.life >= p.maxLife) {
        p.active = false;
        this.puffDummy.position.set(0, -9999, 0);
        this.puffDummy.scale.set(0, 0, 0);
        this.puffDummy.updateMatrix();
        this.puffMesh.setMatrixAt(i, this.puffDummy.matrix);
        continue;
      }

      const progress = p.life / p.maxLife;

      // Drag and wind drift
      p.vx += (this.windDirection.x * this.windSpeed - p.vx) * 0.8 * dt;
      p.vz += (this.windDirection.y * this.windSpeed - p.vz) * 0.8 * dt;
      p.vy -= 1.8 * dt; // Mars gravity on dust

      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;

      // Expand and billboard towards camera
      const currentScale = p.size + (p.maxSize - p.size) * progress;

      this.puffDummy.position.set(p.x, p.y, p.z);
      this.puffDummy.quaternion.copy(camera.quaternion);
      this.puffDummy.scale.set(currentScale, currentScale, currentScale);
      this.puffDummy.updateMatrix();

      this.puffMesh.setMatrixAt(i, this.puffDummy.matrix);
    }

    if (anyActive) {
      this.puffMesh.instanceMatrix.needsUpdate = true;
    }
  }

  public dispose() {
    this.ambientPoints.geometry.dispose();
    (this.ambientPoints.material as THREE.Material).dispose();
    this.puffMesh.geometry.dispose();
    (this.puffMesh.material as THREE.Material).dispose();
  }
}
