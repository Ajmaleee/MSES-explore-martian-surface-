/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { RoverInputState, RoverTelemetry } from './types';
import { getTerrainHeight, getTerrainNormal } from './terrainNoise';

export class RoverPhysics {
  public world: CANNON.World;
  public chassisBody: CANNON.Body;
  public vehicle: CANNON.RaycastVehicle;

  // Wheel indices
  public static readonly WHEEL_FL = 0;
  public static readonly WHEEL_FR = 1;
  public static readonly WHEEL_RL = 2;
  public static readonly WHEEL_RR = 3;

  private engineForce = 0;
  private currentSteering = 0;
  private brakeForce = 0;

  // Maximum speeds and forces for authentic exploration vehicle
  private readonly MAX_STEER = 0.48; // ~27.5 degrees
  private readonly MAX_ENGINE_FORCE = 1200; // Newtons
  private readonly MAX_BRAKE_FORCE = 1800;

  // Odometer & time
  private odometer = 0;
  private lastPosition = new THREE.Vector3();
  private missionSeconds = 0;

  // Scratch math objects (zero GC)
  private _chassisPos = new THREE.Vector3();
  private _chassisQuat = new THREE.Quaternion();
  private _upVector = new THREE.Vector3(0, 1, 0);
  private _forwardVector = new THREE.Vector3(0, 0, 1);
  private _rightVector = new THREE.Vector3(1, 0, 0);
  private _tempVec = new THREE.Vector3();
  private _euler = new THREE.Euler(0, 0, 0, 'YXZ');

  constructor(world: CANNON.World) {
    this.world = world;

    // Set authentic Martian gravity: 3.71 m/s²
    this.world.gravity.set(0, -3.71, 0);

    // 1. Chassis Rigid Body
    const chassisWidth = 1.3;
    const chassisHeight = 0.5;
    const chassisLength = 1.9;
    const mass = 380; // kg

    const chassisShape = new CANNON.Box(
      new CANNON.Vec3(chassisWidth * 0.5, chassisHeight * 0.5, chassisLength * 0.5)
    );

    this.chassisBody = new CANNON.Body({
      mass,
      shape: chassisShape,
      // Start slightly on the lander deck: x=0, z=0.5, y above deck
      position: new CANNON.Vec3(0, 1.4, 0.4),
    });

    // Realistic damping
    this.chassisBody.linearDamping = 0.15;
    this.chassisBody.angularDamping = 0.25;

    this.world.addBody(this.chassisBody);

    // 2. RaycastVehicle setup
    this.vehicle = new CANNON.RaycastVehicle({
      chassisBody: this.chassisBody,
      indexRightAxis: 0, // X
      indexUpAxis: 1,    // Y
      indexForwardAxis: 2, // Z
    });

    // Wheel mounting positions relative to chassis
    const halfTrack = 0.82;
    const halfBase = 0.78;
    const wheelDownOffset = -0.15; // Suspension origin slightly below center of mass

    const wheelOptions: CANNON.WheelInfoOptions = {
      radius: 0.32,
      directionLocal: new CANNON.Vec3(0, -1, 0),
      suspensionRestLength: 0.38,
      suspensionStiffness: 34,
      dampingCompression: 2.8,
      dampingRelaxation: 3.8,
      frictionSlip: 2.8,
      rollInfluence: 0.32, // Allows natural body roll without artificial pinning
      maxSuspensionForce: 100000,
      maxSuspensionTravel: 0.38,
      customSlidingRotationalSpeed: -30,
      useCustomSlidingRotationalSpeed: true,
      chassisConnectionPointLocal: new CANNON.Vec3(),
      axleLocal: new CANNON.Vec3(-1, 0, 0),
    };

    // Add 4 independent wheels (FL, FR, RL, RR)
    this.vehicle.addWheel({
      ...wheelOptions,
      chassisConnectionPointLocal: new CANNON.Vec3(-halfTrack, wheelDownOffset, halfBase),
    });
    this.vehicle.addWheel({
      ...wheelOptions,
      chassisConnectionPointLocal: new CANNON.Vec3(halfTrack, wheelDownOffset, halfBase),
    });
    this.vehicle.addWheel({
      ...wheelOptions,
      chassisConnectionPointLocal: new CANNON.Vec3(-halfTrack, wheelDownOffset, -halfBase),
    });
    this.vehicle.addWheel({
      ...wheelOptions,
      chassisConnectionPointLocal: new CANNON.Vec3(halfTrack, wheelDownOffset, -halfBase),
    });

    this.vehicle.addToWorld(this.world);

    this.lastPosition.set(this.chassisBody.position.x, this.chassisBody.position.y, this.chassisBody.position.z);
  }

  public update(dt: number, inputs: RoverInputState, powerMultiplier: number = 1.0) {
    this.missionSeconds += dt;

    // 1. Steering kinematics with smooth interpolation
    let targetSteering = 0;
    if (inputs.left) targetSteering += this.MAX_STEER;
    if (inputs.right) targetSteering -= this.MAX_STEER;

    const steerSpeed = 3.5;
    this.currentSteering += (targetSteering - this.currentSteering) * steerSpeed * dt;

    // Front wheel steering
    this.vehicle.setSteeringValue(this.currentSteering, RoverPhysics.WHEEL_FL);
    this.vehicle.setSteeringValue(this.currentSteering, RoverPhysics.WHEEL_FR);

    // 2. Throttle and Engine Force (4-Wheel Drive)
    let targetForce = 0;
    const currentSpeed = this.getSpeedMs();

    if (inputs.forward) {
      // Progressive acceleration up to ~5.5 m/s (~20 km/h)
      if (currentSpeed < 5.5) {
        targetForce = this.MAX_ENGINE_FORCE * powerMultiplier;
      }
    } else if (inputs.backward) {
      if (currentSpeed > -3.0) {
        targetForce = -this.MAX_ENGINE_FORCE * 0.75 * powerMultiplier;
      }
    }

    // Smooth engine torque ramp
    this.engineForce += (targetForce - this.engineForce) * 6.0 * dt;

    // Apply motor torque to all four wheels
    this.vehicle.applyEngineForce(this.engineForce, RoverPhysics.WHEEL_FL);
    this.vehicle.applyEngineForce(this.engineForce, RoverPhysics.WHEEL_FR);
    this.vehicle.applyEngineForce(this.engineForce, RoverPhysics.WHEEL_RL);
    this.vehicle.applyEngineForce(this.engineForce, RoverPhysics.WHEEL_RR);

    // 3. Braking
    if (inputs.brake) {
      this.brakeForce = this.MAX_BRAKE_FORCE;
    } else if (!inputs.forward && !inputs.backward) {
      // Natural rolling resistance & regenerative engine brake
      this.brakeForce = 45;
    } else {
      this.brakeForce = 0;
    }

    this.vehicle.setBrake(this.brakeForce, RoverPhysics.WHEEL_FL);
    this.vehicle.setBrake(this.brakeForce, RoverPhysics.WHEEL_FR);
    this.vehicle.setBrake(this.brakeForce, RoverPhysics.WHEEL_RL);
    this.vehicle.setBrake(this.brakeForce, RoverPhysics.WHEEL_RR);

    // 4. Ground collision constraint safeguard
    // Ensures wheels and chassis interact accurately with the continuous analytical heightfield
    this.enforceGroundContact();

    // 5. Update odometer
    const curPos = this.getChassisPosition();
    const dDist = curPos.distanceTo(this.lastPosition);
    if (dDist < 5.0) { // filter out teleport resets
      this.odometer += dDist;
    }
    this.lastPosition.copy(curPos);
  }

  private enforceGroundContact() {
    // For each wheel, verify against terrain height at wheel ground position
    for (let i = 0; i < this.vehicle.wheelInfos.length; i++) {
      const info = this.vehicle.wheelInfos[i];
      const wheelPos = this.getWheelPosition(i);
      const groundH = getTerrainHeight(wheelPos.x, wheelPos.z);

      // If wheel ray penetrated below analytical terrain (e.g. between discrete mesh edges)
      if (wheelPos.y < groundH + info.radius) {
        info.isInContact = true;
        info.raycastResult.hasHit = true;
        info.raycastResult.distance = Math.max(0.01, info.suspensionRestLength - (groundH + info.radius - wheelPos.y));
        info.raycastResult.hitPointWorld.set(wheelPos.x, groundH, wheelPos.z);
      }
    }

    // Chassis ground collision fallback
    const cPos = this.chassisBody.position;
    const terrainH = getTerrainHeight(cPos.x, cPos.z);
    if (cPos.y < terrainH + 0.3) {
      cPos.y = terrainH + 0.3;
      if (this.chassisBody.velocity.y < 0) {
        this.chassisBody.velocity.y = 0;
      }
    }
  }

  public getChassisPosition(): THREE.Vector3 {
    return this._chassisPos.set(
      this.chassisBody.position.x,
      this.chassisBody.position.y,
      this.chassisBody.position.z
    );
  }

  public getChassisQuaternion(): THREE.Quaternion {
    return this._chassisQuat.set(
      this.chassisBody.quaternion.x,
      this.chassisBody.quaternion.y,
      this.chassisBody.quaternion.z,
      this.chassisBody.quaternion.w
    );
  }

  public getWheelPosition(wheelIndex: number): THREE.Vector3 {
    this.vehicle.updateWheelTransform(wheelIndex);
    const transform = this.vehicle.wheelInfos[wheelIndex].worldTransform;
    return new THREE.Vector3(transform.position.x, transform.position.y, transform.position.z);
  }

  public getWheelQuaternion(wheelIndex: number): THREE.Quaternion {
    this.vehicle.updateWheelTransform(wheelIndex);
    const transform = this.vehicle.wheelInfos[wheelIndex].worldTransform;
    return new THREE.Quaternion(
      transform.quaternion.x,
      transform.quaternion.y,
      transform.quaternion.z,
      transform.quaternion.w
    );
  }

  public getSpeedMs(): number {
    const vel = this.chassisBody.velocity;
    // Forward component relative to vehicle heading
    this.getChassisQuaternion();
    this._forwardVector.set(0, 0, 1).applyQuaternion(this._chassisQuat);
    return vel.x * this._forwardVector.x + vel.y * this._forwardVector.y + vel.z * this._forwardVector.z;
  }

  public getTelemetry(configWindSpeed: number): RoverTelemetry {
    const pos = this.getChassisPosition();
    const quat = this.getChassisQuaternion();

    this._euler.setFromQuaternion(quat, 'YXZ');
    const pitchDeg = THREE.MathUtils.radToDeg(this._euler.x);
    const headingDeg = (THREE.MathUtils.radToDeg(this._euler.y) + 360) % 360;
    const rollDeg = THREE.MathUtils.radToDeg(this._euler.z);

    const speedMs = this.getSpeedMs();
    const speedKmh = speedMs * 3.6;

    // Check if rover is overturned (tilt > 65 degrees)
    this._upVector.set(0, 1, 0).applyQuaternion(quat);
    const isOverturned = this._upVector.y < 0.42;

    // Wheel loads and ground contacts
    const wheelLoads: [number, number, number, number] = [0, 0, 0, 0];
    const wheelSlip: [number, number, number, number] = [0, 0, 0, 0];
    const suspensionComp: [number, number, number, number] = [0, 0, 0, 0];
    let inAirCount = 0;

    for (let i = 0; i < 4; i++) {
      const info = this.vehicle.wheelInfos[i];
      if (!info.isInContact) {
        inAirCount++;
      } else {
        suspensionComp[i] = Math.max(0, 1.0 - info.suspensionLength / info.suspensionRestLength);
        wheelLoads[i] = Math.min(1.0, info.suspensionLength / info.suspensionRestLength);
      }
      wheelSlip[i] = Math.min(1.0, Math.abs(info.skidInfo));
    }

    const inAir = inAirCount === 4;

    // Slope calculation
    const normal = getTerrainNormal(pos.x, pos.z, this._tempVec);
    const slopeGradePct = Math.round(Math.sqrt(normal.x * normal.x + normal.z * normal.z) * 100);

    return {
      speedKmh: Math.round(speedKmh * 10) / 10,
      speedMs: Math.round(speedMs * 10) / 10,
      motorRpm: Math.round(Math.abs(speedMs) * 180),
      headingDeg: Math.round(headingDeg),
      pitchDeg: Math.round(pitchDeg),
      rollDeg: Math.round(rollDeg),
      elevationM: Math.round(pos.y * 10) / 10,
      slopeGradePct,
      batteryPct: Math.max(12, Math.round(98 - (this.odometer * 0.04) % 80)),
      isOverturned,
      inAir,
      wheelLoads,
      wheelSlip,
      suspensionCompression: suspensionComp,
      sol: 42 + Math.floor(this.missionSeconds / 180),
      missionTimeSeconds: Math.floor(this.missionSeconds),
      odometerMeters: Math.round(this.odometer),
      isBraking: this.brakeForce > 200,
      isReversing: speedMs < -0.1,
      armStatus: 'stowed',
      isDrilling: false,
      lastSampleName: null,
      deployedFromLander: pos.distanceTo(new THREE.Vector3(0, 0, 0)) > 6.0,
      windSpeedMs: configWindSpeed,
      surfaceTempC: -58,
      atmospherePressureKPa: 0.63,
    };
  }

  public resetPosition(x: number = 0, z: number = 3.8) {
    const groundY = getTerrainHeight(x, z);
    this.chassisBody.position.set(x, groundY + 1.2, z);
    this.chassisBody.velocity.set(0, 0, 0);
    this.chassisBody.angularVelocity.set(0, 0, 0);
    this.chassisBody.quaternion.set(0, 0, 0, 1);
    this.engineForce = 0;
    this.currentSteering = 0;
    this.brakeForce = 0;
  }

  public selfRight() {
    // Upright the rover if overturned
    this.chassisBody.quaternion.set(0, 0, 0, 1);
    this.chassisBody.position.y += 0.8;
    this.chassisBody.velocity.set(0, 1, 0);
    this.chassisBody.angularVelocity.set(0, 0, 0);
  }

  public dispose() {
    this.vehicle.removeFromWorld(this.world);
    this.world.removeBody(this.chassisBody);
  }
}
