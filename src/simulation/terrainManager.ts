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
  private roughnessMap: THREE.CanvasTexture;

  constructor(scene: THREE.Scene, renderer: THREE.WebGLRenderer) {
    this.group = new THREE.Group();
    this.group.name = 'TerrainGroup';

    // 1. Generate AAA game-quality procedural textures (GTA V / Starfield fidelity)
    const { diffuse, normal, roughness } = this.generateSurrealMartianTextures(renderer);
    this.regolithTexture = diffuse;
    this.regolithNormalMap = normal;
    this.roughnessMap = roughness;

    // 2. High fidelity PBR terrain material
    this.material = new THREE.MeshStandardMaterial({
      roughness: 0.88,
      metalness: 0.12,
      map: this.regolithTexture,
      normalMap: this.regolithNormalMap,
      normalScale: new THREE.Vector2(0.85, 0.85),
      roughnessMap: this.roughnessMap,
      vertexColors: true,
      flatShading: false,
    });

    // 3. High-Polygon core Martian terrain mesh (340m x 340m, 220x220 segments)
    const coreSize = 340;
    const coreSegments = 220;
    const coreGeo = new THREE.PlaneGeometry(coreSize, coreSize, coreSegments, coreSegments);
    coreGeo.rotateX(-Math.PI / 2);

    this.applyHeightsAndColors(coreGeo, 0, 0);

    this.mainMesh = new THREE.Mesh(coreGeo, this.material);
    this.mainMesh.receiveShadow = true;
    this.mainMesh.castShadow = false;
    this.group.add(this.mainMesh);

    // 4. High-Polygon distant horizon ring (extends to 1400m)
    const distantGeo = new THREE.RingGeometry(160, 1400, 96, 48);
    distantGeo.rotateX(-Math.PI / 2);
    this.applyRingHeightsAndColors(distantGeo);

    const distantMat = new THREE.MeshStandardMaterial({
      roughness: 0.95,
      metalness: 0.05,
      vertexColors: true,
      flatShading: false,
    });

    this.distantMesh = new THREE.Mesh(distantGeo, distantMat);
    this.distantMesh.receiveShadow = false;
    this.group.add(this.distantMesh);

    scene.add(this.group);
  }

  private generateSurrealMartianTextures(renderer: THREE.WebGLRenderer) {
    const size = 1024; // High resolution 1K procedural texture
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // Rich cinematic Martian rust-red gradient
    const grad = ctx.createLinearGradient(0, 0, size, size);
    grad.addColorStop(0, '#a34827');
    grad.addColorStop(0.25, '#c55d34');
    grad.addColorStop(0.55, '#8c361c');
    grad.addColorStop(0.85, '#b9552f');
    grad.addColorStop(1, '#973e21');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    // Wind-swept dune ripples with illuminated golden crests and deep rust troughs
    for (let y = 0; y < size; y += 14) {
      const waveOffset = Math.sin((y / size) * Math.PI * 8) * 22;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(
        size * 0.25, y + waveOffset,
        size * 0.75, y - waveOffset * 0.8,
        size, y
      );
      ctx.lineTo(size, y + 8);
      ctx.bezierCurveTo(
        size * 0.75, y + 8 - waveOffset * 0.8,
        size * 0.25, y + 8 + waveOffset,
        0, y + 8
      );
      ctx.fillStyle = (y % 28 === 0) ? 'rgba(235, 145, 90, 0.16)' : 'rgba(80, 28, 15, 0.14)';
      ctx.fill();
    }

    // Micro-granules and silica sparkle grains
    const imgData = ctx.getImageData(0, 0, size, size);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const n = (Math.random() - 0.5) * 42;
      data[i] = Math.min(255, Math.max(0, data[i] + n));
      data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + n * 0.65));
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + n * 0.45));
    }
    ctx.putImageData(imgData, 0, 0);

    const diffuseTexture = new THREE.CanvasTexture(canvas);
    diffuseTexture.wrapS = THREE.RepeatWrapping;
    diffuseTexture.wrapT = THREE.RepeatWrapping;
    diffuseTexture.repeat.set(36, 36);
    diffuseTexture.colorSpace = THREE.SRGBColorSpace;
    diffuseTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();

    // High fidelity normal map canvas
    const normCanvas = document.createElement('canvas');
    normCanvas.width = 512;
    normCanvas.height = 512;
    const nCtx = normCanvas.getContext('2d')!;
    const nImgData = nCtx.createImageData(512, 512);
    const nData = nImgData.data;

    for (let i = 0; i < nData.length; i += 4) {
      // Wind wave ripple slope in normal map
      const px = (i / 4) % 512;
      const py = Math.floor((i / 4) / 512);
      const waveSlope = Math.sin((py / 512) * Math.PI * 32) * 25;
      const noiseX = (Math.random() - 0.5) * 22;
      const noiseY = (Math.random() - 0.5) * 22;

      nData[i] = Math.min(255, Math.max(0, 128 + noiseX));
      nData[i + 1] = Math.min(255, Math.max(0, 128 + waveSlope + noiseY));
      nData[i + 2] = 255;
      nData[i + 3] = 255;
    }
    nCtx.putImageData(nImgData, 0, 0);

    const normalTexture = new THREE.CanvasTexture(normCanvas);
    normalTexture.wrapS = THREE.RepeatWrapping;
    normalTexture.wrapT = THREE.RepeatWrapping;
    normalTexture.repeat.set(36, 36);

    // Roughness map
    const roughCanvas = document.createElement('canvas');
    roughCanvas.width = 256;
    roughCanvas.height = 256;
    const rCtx = roughCanvas.getContext('2d')!;
    rCtx.fillStyle = '#d0d0d0'; // Mostly matte regolith
    rCtx.fillRect(0, 0, 256, 256);
    // Darker specular streaks along wind dune crests
    rCtx.fillStyle = '#8a8a8a';
    for (let y = 0; y < 256; y += 16) {
      rCtx.fillRect(0, y, 256, 3);
    }
    const roughnessTexture = new THREE.CanvasTexture(roughCanvas);
    roughnessTexture.wrapS = THREE.RepeatWrapping;
    roughnessTexture.wrapT = THREE.RepeatWrapping;
    roughnessTexture.repeat.set(36, 36);

    return { diffuse: diffuseTexture, normal: normalTexture, roughness: roughnessTexture };
  }

  private applyHeightsAndColors(geo: THREE.BufferGeometry, offsetX: number, offsetZ: number) {
    const pos = geo.attributes.position;
    const vertexCount = pos.count;
    const colors = new Float32Array(vertexCount * 3);

    const _norm = new THREE.Vector3();
    const cBasalt = new THREE.Color(0x321611); // Dark basalt rock for steep slopes
    const cRust = new THREE.Color(0xaa4929);   // Typical Martian surface
    const cOchre = new THREE.Color(0xd9814a);  // Fine windblown dust
    const cSandstone = new THREE.Color(0xc96d3f); // Sandstone sedimentary layer
    const tempColor = new THREE.Color();

    for (let i = 0; i < vertexCount; i++) {
      const vx = pos.getX(i) + offsetX;
      const vz = pos.getZ(i) + offsetZ;
      const vy = getTerrainHeight(vx, vz);
      pos.setY(i, vy);

      getTerrainNormal(vx, vz, _norm);
      const slope = 1.0 - _norm.y;

      if (slope > 0.26) {
        // Steep slope: exposed dark rock/basalt
        const t = Math.min(1.0, (slope - 0.26) / 0.35);
        tempColor.copy(cRust).lerp(cBasalt, t);
      } else if (vy > 6.0) {
        // Ridge heights: weathered sandstone
        const t = Math.min(1.0, (vy - 6.0) / 14.0);
        tempColor.copy(cRust).lerp(cSandstone, t);
      } else if (vy < -2.0) {
        // Depressions and craters: windblown ochre dust drifts
        const t = Math.min(1.0, (-vy - 2.0) / 7.0);
        tempColor.copy(cRust).lerp(cOchre, t);
      } else {
        const noiseVar = ((vx * 17 + vz * 43) % 100) / 450;
        tempColor.copy(cRust).offsetHSL(noiseVar, 0.03, (noiseVar - 0.1) * 0.08);
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
    const cDistant = new THREE.Color(0x943d23);
    const cRidge = new THREE.Color(0x692716);
    const tempColor = new THREE.Color();

    for (let i = 0; i < vertexCount; i++) {
      const vx = pos.getX(i);
      const vz = pos.getZ(i);
      const vy = getTerrainHeight(vx, vz);
      pos.setY(i, vy);

      const t = Math.min(1.0, Math.max(0.0, vy / 22.0));
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
    this.roughnessMap.dispose();
    this.material.dispose();
  }
}
