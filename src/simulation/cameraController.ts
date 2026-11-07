/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { CameraViewMode } from './types';
import { getTerrainHeight } from './terrainNoise';
import { RoverModel } from './roverModel';

export class CameraController {
  public camera: THREE.PerspectiveCamera;
  public mode: CameraViewMode = 'third_person';

  // Orbit controls state
  public azimuth = 0; // horizontal angle relative to rover heading
  public elevation = 0.26; // radians above horizon
  public distance = 7.5; // meters
  public targetDistance = 7.5;

  private isDragging = false;
  private prevMouseX = 0;
  private prevMouseY = 0;

  // Smoothed camera transform targets
  private currentPos = new THREE.Vector3(0, 5, -8);
  private currentLookAt = new THREE.Vector3(0, 1, 0);

  // Scratch objects (zero GC)
  private _targetPos = new THREE.Vector3();
  private _roverForward = new THREE.Vector3();
  private _chassisPos = new THREE.Vector3();
  private _mastCamWorld = new THREE.Vector3();
  private _armCamWorld = new THREE.Vector3();

  constructor(camera: THREE.PerspectiveCamera, domElement: HTMLElement) {
    this.camera = camera;

    // Attach pointer event listeners for smooth orbit & zoom
    domElement.addEventListener('pointerdown', this.onPointerDown);
    window.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);
    domElement.addEventListener('wheel', this.onWheel, { passive: false });
  }

  private onPointerDown = (e: PointerEvent) => {
    // Only drag with primary or right button
    if (e.button === 0 || e.button === 2) {
      this.isDragging = true;
      this.prevMouseX = e.clientX;
      this.prevMouseY = e.clientY;
    }
  };

  private onPointerMove = (e: PointerEvent) => {
    if (!this.isDragging) return;
    const dx = e.clientX - this.prevMouseX;
    const dy = e.clientY - this.prevMouseY;
    this.prevMouseX = e.clientX;
    this.prevMouseY = e.clientY;

    const sens = 0.005;
    this.azimuth -= dx * sens;
    this.elevation += dy * sens;

    // Clamp elevation angle (-10 deg to 80 deg)
    this.elevation = Math.max(-0.15, Math.min(1.35, this.elevation));
  };

  private onPointerUp = () => {
    this.isDragging = false;
  };

  private onWheel = (e: WheelEvent) => {
    e.preventDefault();
    this.targetDistance += e.deltaY * 0.005;
    this.targetDistance = Math.max(3.2, Math.min(18.0, this.targetDistance));
  };

  public setMode(mode: CameraViewMode) {
    this.mode = mode;
  }

  public cycleMode(): CameraViewMode {
    const modes: CameraViewMode[] = ['third_person', 'mast_cam', 'arm_cam', 'free_orbit'];
    const nextIdx = (modes.indexOf(this.mode) + 1) % modes.length;
    this.mode = modes[nextIdx];
    return this.mode;
  }

  public update(dt: number, roverPos: THREE.Vector3, roverQuat: THREE.Quaternion, roverModel: RoverModel) {
    // Smooth zoom damping
    this.distance += (this.targetDistance - this.distance) * (1 - Math.exp(-8 * dt));

    this._chassisPos.copy(roverPos);

    if (this.mode === 'third_person') {
      // 1. Third-person follow camera
      this._roverForward.set(0, 0, 1).applyQuaternion(roverQuat);
      const roverHeading = Math.atan2(this._roverForward.x, this._roverForward.z);

      const totalAzimuth = roverHeading + this.azimuth + Math.PI; // default behind rover

      const cosElev = Math.cos(this.elevation);
      const sinElev = Math.sin(this.elevation);

      const offsetX = Math.sin(totalAzimuth) * this.distance * cosElev;
      const offsetZ = Math.cos(totalAzimuth) * this.distance * cosElev;
      const offsetY = this.distance * sinElev + 1.2;

      this._targetPos.set(
        roverPos.x + offsetX,
        roverPos.y + offsetY,
        roverPos.z + offsetZ
      );

      // Ground collision clamping (prevent dipping under Martian landscape)
      const terrainFloor = getTerrainHeight(this._targetPos.x, this._targetPos.z) + 0.75;
      if (this._targetPos.y < terrainFloor) {
        this._targetPos.y = terrainFloor;
      }

      // Smooth exponential damping
      const lambda = 7.0;
      this.currentPos.lerp(this._targetPos, 1 - Math.exp(-lambda * dt));

      const lookTarget = roverPos.clone().add(new THREE.Vector3(0, 0.9, 0));
      this.currentLookAt.lerp(lookTarget, 1 - Math.exp(-lambda * dt));

      this.camera.position.copy(this.currentPos);
      this.camera.lookAt(this.currentLookAt);

    } else if (this.mode === 'mast_cam') {
      // 2. First-Person MastCam mounted on top of camera mast
      roverModel.mastCamMount.getWorldPosition(this._mastCamWorld);
      this.camera.position.copy(this._mastCamWorld);

      this._roverForward.set(0, 0, 1).applyQuaternion(roverQuat);
      const lookTarget = this._mastCamWorld.clone().add(this._roverForward.clone().multiplyScalar(15)).add(new THREE.Vector3(0, -1.2, 0));
      this.camera.lookAt(lookTarget);

    } else if (this.mode === 'arm_cam') {
      // 3. Robotic Arm Inspection Camera
      roverModel.drillBit.getWorldPosition(this._armCamWorld);
      const camOffset = new THREE.Vector3(0.3, 0.4, 0.4).applyQuaternion(roverQuat);
      this.camera.position.copy(this._armCamWorld).add(camOffset);
      this.camera.lookAt(this._armCamWorld);

    } else if (this.mode === 'free_orbit') {
      // 4. Free Orbit Drone
      const cosElev = Math.cos(this.elevation);
      const sinElev = Math.sin(this.elevation);

      const offsetX = Math.sin(this.azimuth) * (this.distance * 1.5) * cosElev;
      const offsetZ = Math.cos(this.azimuth) * (this.distance * 1.5) * cosElev;
      const offsetY = (this.distance * 1.5) * sinElev + 2.0;

      this.camera.position.set(roverPos.x + offsetX, roverPos.y + offsetY, roverPos.z + offsetZ);
      this.camera.lookAt(roverPos.x, roverPos.y + 0.8, roverPos.z);
    }
  }

  public dispose(domElement: HTMLElement) {
    domElement.removeEventListener('pointerdown', this.onPointerDown);
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
    domElement.removeEventListener('wheel', this.onWheel);
  }
}
