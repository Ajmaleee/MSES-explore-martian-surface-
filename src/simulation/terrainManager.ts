/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { getTerrainHeight, getTerrainNormal } from './terrainNoise';

export class TerrainManager {
  public group: THREE.Group;
  public mainMesh: THREE.Mesh;
  public distantMesh: THREE.Mesh;
  public material: THREE.MeshStandardMaterial;

  private regolithTexture: THREE.CanvasTexture;
  private regolithNormalMap: THREE.CanvasTexture;

  constructor(scene: THREE.Scene, renderer: THREE.WebGLRenderer) {
    this.group = new THREE.Group();
    this.group.name = 'TerrainGroup';

    // 1. Generate procedural procedural textures for regolith & micro-bump
    const { diffuse, normal } = this.generateProceduralRegolithTextures(renderer);
    this.regolithTexture = diffuse;
    this.regolithNormalMap = normal;

    // 2. High fidelity PBR terrain material
    this.material = new THREE.MeshStandardMaterial({
      roughness: 0.92,
      metalness: 0.08,
      map: this.regolithTexture,
      normalMap: this.regolithNormalMap,
      normalScale: new THREE.Vector2(0.65, 0.65),
      vertexColors: true,
      flatShading: false,
    });

    // 3. Build core high-detail terrain mesh (280m x 280m, 160x160 segments)
    const coreSize = 280;
    const coreSegments = 140;
    const coreGeo = new THREE.PlaneGeometry(coreSize, coreSize, coreSegments, coreSegments);
    coreGeo.rotateX(-Math.PI / 2);

    this.applyHeightsAndColors(coreGeo, 0, 0);

    this.mainMesh = new THREE.Mesh(coreGeo, this.material);
    this.mainMesh.receiveShadow = true;
    this.mainMesh.castShadow = false;
    this.group.add(this.mainMesh);

    // 4. Build distant terrain ring (extends from 280m to 1400m) with lower resolution
    const distantGeo = new THREE.RingGeometry(130, 850, 48, 24);
    distantGeo.rotateX(-Math.PI / 2);
    this.applyRingHeightsAndColors(distantGeo);

    const distantMat = new THREE.MeshStandardMaterial({
      roughness: 0.95,
      metalness: 0.05,
      vertexColors: true,
      flatShading: true,
    });

    this.distantMesh = new THREE.Mesh(distantGeo, distantMat);
    this.distantMesh.receiveShadow = false;
    this.group.add(this.distantMesh);

    scene.add(this.group);
  }

  private generateProceduralRegolithTextures(renderer: THREE.WebGLRenderer) {
    const size = 512;
    // Diffuse canvas
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // Base Martian rust gradient
    const grad = ctx.createLinearGradient(0, 0, size, size);
    grad.addColorStop(0, '#a64b2a');
    grad.addColorStop(0.3, '#bf5934');
    grad.addColorStop(0.7, '#8f381f');
    grad.addColorStop(1, '#a14526');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    // Fine mineral speckles and grain
    const imgData = ctx.getImageData(0, 0, size, size);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 36;
      data[i] = Math.min(255, Math.max(0, data[i] + noise));
      data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise * 0.7));
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise * 0.5));
    }
    ctx.putImageData(imgData, 0, 0);

    // Wind ripple bands
    ctx.fillStyle = 'rgba(215, 128, 77, 0.12)';
    for (let y = 0; y < size; y += 12) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(size * 0.3, y + Math.sin(y) * 8, size * 0.7, y - Math.cos(y) * 8, size, y);
      ctx.lineTo(size, y + 6);
      ctx.lineTo(0, y + 6);
      ctx.fill();
    }

    const diffuseTexture = new THREE.CanvasTexture(canvas);
    diffuseTexture.wrapS = THREE.RepeatWrapping;
    diffuseTexture.wrapT = THREE.RepeatWrapping;
    diffuseTexture.repeat.set(28, 28);
    diffuseTexture.colorSpace = THREE.SRGBColorSpace;
    diffuseTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();

    // Normal map canvas
    const normCanvas = document.createElement('canvas');
    normCanvas.width = 256;
    normCanvas.height = 256;
    const nCtx = normCanvas.getContext('2d')!;
    const nImgData = nCtx.createImageData(256, 256);
    const nData = nImgData.data;

    for (let i = 0; i < nData.length; i += 4) {
      // Perturb normal around (128, 128, 255)
      const nx = 128 + Math.floor((Math.random() - 0.5) * 30);
      const ny = 128 + Math.floor((Math.random() - 0.5) * 30);
      nData[i] = nx;
      nData[i + 1] = ny;
      nData[i + 2] = 255;
      nData[i + 3] = 255;
    }
    nCtx.putImageData(nImgData, 0, 0);

    const normalTexture = new THREE.CanvasTexture(normCanvas);
    normalTexture.wrapS = THREE.RepeatWrapping;
    normalTexture.wrapT = THREE.RepeatWrapping;
    normalTexture.repeat.set(28, 28);

    return { diffuse: diffuseTexture, normal: normalTexture };
  }

  private applyHeightsAndColors(geo: THREE.BufferGeometry, offsetX: number, offsetZ: number) {
    const pos = geo.attributes.position;
    const vertexCount = pos.count;
    const colors = new Float32Array(vertexCount * 3);

    const _norm = new THREE.Vector3();
    const cBasalt = new THREE.Color(0x3a1d17); // Dark basalt rock for steep slopes
    const cRust = new THREE.Color(0xa14425);   // Typical Martian surface
    const cOchre = new THREE.Color(0xd47a46);  // Fine windblown dust
    const cSandstone = new THREE.Color(0xbd6539); // Sandstone sedimentary layer
    const tempColor = new THREE.Color();

    for (let i = 0; i < vertexCount; i++) {
      const vx = pos.getX(i) + offsetX;
      const vz = pos.getZ(i) + offsetZ;
      const vy = getTerrainHeight(vx, vz);
      pos.setY(i, vy);

      getTerrainNormal(vx, vz, _norm);
      const slope = 1.0 - _norm.y; // 0 on flat, ~0.7 on 45 deg

      if (slope > 0.28) {
        // Steep slope: exposed dark rock/basalt
        const t = Math.min(1.0, (slope - 0.28) / 0.35);
        tempColor.copy(cRust).lerp(cBasalt, t);
      } else if (vy > 6.0) {
        // Ridge heights: weathered sandstone
        const t = Math.min(1.0, (vy - 6.0) / 12.0);
        tempColor.copy(cRust).lerp(cSandstone, t);
      } else if (vy < -2.0) {
        // Depressions and craters: windblown ochre dust drifts
        const t = Math.min(1.0, (-vy - 2.0) / 6.0);
        tempColor.copy(cRust).lerp(cOchre, t);
      } else {
        // Mid-plane with subtle variation
        const noiseVar = ((vx * 13 + vz * 37) % 100) / 500;
        tempColor.copy(cRust).offsetHSL(noiseVar, 0.02, (noiseVar - 0.1) * 0.1);
      }

      colors[i * 3] = tempColor.r;
      colors[i * 3 + 1] = tempColor.g;
      colors[i * 3 + 2] = tempColor.b;
    }

    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    pos.needsUpdate = true;
  }

  private applyRingHeightsAndColors(geo: THREE.BufferGeometry) {
    const pos = geo.attributes.position;
    const vertexCount = pos.count;
    const colors = new Float32Array(vertexCount * 3);
    const cDistant = new THREE.Color(0x8a3921);
    const cRidge = new THREE.Color(0x6e2c1a);
    const tempColor = new THREE.Color();

    for (let i = 0; i < vertexCount; i++) {
      const vx = pos.getX(i);
      const vz = pos.getZ(i);
      const vy = getTerrainHeight(vx, vz);
      pos.setY(i, vy);

      const t = Math.min(1.0, Math.max(0.0, vy / 18.0));
      tempColor.copy(cDistant).lerp(cRidge, t);
      colors[i * 3] = tempColor.r;
      colors[i * 3 + 1] = tempColor.g;
      colors[i * 3 + 2] = tempColor.b;
    }

    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
  }

  public dispose() {
    this.mainMesh.geometry.dispose();
    this.distantMesh.geometry.dispose();
    this.regolithTexture.dispose();
    this.regolithNormalMap.dispose();
    this.material.dispose();
  }
}
