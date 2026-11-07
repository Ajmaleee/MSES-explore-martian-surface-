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

  // Ground dummy body for wheel contact reporting
  private groundBody: CANNON.Body;

  // Wheel indices
  public static readonly WHEEL_FL = 0;
  public static readonly WHEEL_FR = 1;
  public static readonly WHEEL_RL = 2;
  public static readonly WHEEL_RR = 3;

  private engineForce = 0;
  private currentSteering = 0;
  private brakeForce = 0;

  // Heavy realistic exploration rover parameters
  private readonly MAX_STEER = 0.44; // ~25 degrees
  private readonly MAX_ENGINE_FORCE = 4400; // Strong torque for planted heavy vehicle
  private readonly MAX_BRAKE_FORCE = 5200;

  // Wheel stance dimensions
  public readonly wheelRadius = 0.38;
  public readonly halfTrack = 1.08; // Planted wide stance
  public readonly halfBase = 0.98;  // Sturdy wheelbase

  // Odometer & time
  private odometer = 0;
  private lastPosition = new THREE.Vector3();
  private missionSeconds = 0;

  // Scratch math objects (zero GC)
  private _chassisPos = new THREE.Vector3();
  private _chassisQuat = new THREE.Quaternion();
  private _upVector = new THREE.Vector3(0, 1, 0);
  private _forwardVector = new THREE.Vector3(0, 0, 1);
  private _tempVec = new THREE.Vector3();
  private _euler = new THREE.Euler(0, 0, 0, 'YXZ');
  private _cannonNorm = new THREE.Vector3();

  constructor(world: CANNON.World) {
    this.world = world;

    // Grounded planetary gravity (-9.81) for rock-solid dynamics and zero flipping
    this.world.gravity.set(0, -9.81, 0);

    // Ground dummy body to attach wheel contacts
    this.groundBody = new CANNON.Body({ mass: 0 });

    // 1. Heavy Chassis Rigid Body (950 kg for planted authentic weight)
    const chassisWidth = 1.6;
    const chassisHeight = 0.55;
    const chassisLength = 2.2;
    const mass = 950; // kg

    const chassisShape = new CANNON.Box(
      new CANNON.Vec3(chassisWidth * 0.5, chassisHeight * 0.5, chassisLength * 0.5)
    );

    this.chassisBody = new CANNON.Body({
      mass,
      shape: chassisShape,
      position: new CANNON.Vec3(0, 1.6, 0.4),
    });

    // High angular damping and linear damping ensure the rover has physical weight
    // and never twitches, floats, or flips over on regular movement
    this.chassisBody.linearDamping = 0.28;
    this.chassisBody.angularDamping = 0.65;

    this.world.addBody(this.chassisBody);

    // 2. RaycastVehicle setup
    this.vehicle = new CANNON.RaycastVehicle({
      chassisBody: this.chassisBody,
      indexRightAxis: 0, // X
      indexUpAxis: 1,    // Y
      indexForwardAxis: 2, // Z
    });

    // Low wheel connection point keeps center of mass exceptionally stable
    const wheelDownOffset = -0.02;

    const wheelOptions: CANNON.WheelInfoOptions = {
      radius: this.wheelRadius,
      directionLocal: new CANNON.Vec3(0, -1, 0),
      suspensionRestLength: 0.44,
      suspensionStiffness: 72, // Firm heavy spring matching 950kg mass
      dampingCompression: 5.8,
      dampingRelaxation: 7.8,
      frictionSlip: 4.8, // Strong regolith grip
      rollInfluence: 0.05, // Extreme stability: completely prevents unprovoked flipping
      maxSuspensionForce: 350000,
      maxSuspensionTravel: 0.38,
      customSlidingRotationalSpeed: -30,
      useCustomSlidingRotationalSpeed: true,
      chassisConnectionPointLocal: new CANNON.Vec3(),
      axleLocal: new CANNON.Vec3(-1, 0, 0),
    };

    // Add 4 independent wheels
    this.vehicle.addWheel({
      ...wheelOptions,
      chassisConnectionPointLocal: new CANNON.Vec3(-this.halfTrack, wheelDownOffset, this.halfBase),
    });
    this.vehicle.addWheel({
      ...wheelOptions,
      chassisConnectionPointLocal: new CANNON.Vec3(this.halfTrack, wheelDownOffset, this.halfBase),
    });
    this.vehicle.addWheel({
      ...wheelOptions,
      chassisConnectionPointLocal: new CANNON.Vec3(-this.halfTrack, wheelDownOffset, -this.halfBase),
    });
    this.vehicle.addWheel({
      ...wheelOptions,
      chassisConnectionPointLocal: new CANNON.Vec3(this.halfTrack, wheelDownOffset, -this.halfBase),
    });

    this.vehicle.addToWorld(this.world);

    // Continuous analytical ground solver
    this.setupAnalyticalRaycaster();

    this.lastPosition.set(this.chassisBody.position.x, this.chassisBody.position.y, this.chassisBody.position.z);
  }

  private setupAnalyticalRaycaster() {
    const chassis = this.chassisBody;
    const groundBody = this.groundBody;
    const world = this.world;
    const self = this;

    const raycastResult = new CANNON.RaycastResult();
    const chassisVelAtContact = new CANNON.Vec3();

    this.vehicle.castRay = function(wheel: CANNON.WheelInfo) {
      this.updateWheelTransformWorld(wheel);
      const source = wheel.chassisConnectionPointWorld;
      const raylen = wheel.suspensionRestLength + wheel.radius;

      // 1. Raycast physical obstacle check (e.g. lander deck or boulders)
      raycastResult.reset();
      const oldState = chassis.collisionResponse;
      chassis.collisionResponse = false;
      const target = new CANNON.Vec3(source.x, source.y - raylen, source.z);
      world.rayTest(source, target, raycastResult);
      chassis.collisionResponse = oldState;

      let hitY = -9999;
      let hitNormal = new CANNON.Vec3(0, 1, 0);
      let hitDistance = raylen + 10;
      let hitBody: CANNON.Body | null = null;

      if (raycastResult.body) {
        hitY = raycastResult.hitPointWorld.y;
        hitDistance = raycastResult.distance;
        hitNormal.copy(raycastResult.hitNormalWorld);
        hitBody = raycastResult.body;
      }

      // 2. Analytical terrain height evaluation
      const terrainY = getTerrainHeight(source.x, source.z);
      const distToTerrain = source.y - terrainY;

      if (terrainY > hitY && distToTerrain < raylen + 0.15) {
        hitY = terrainY;
        hitDistance = Math.max(0.01, distToTerrain);
        getTerrainNormal(source.x, source.z, self._cannonNorm);
        hitNormal.set(self._cannonNorm.x, self._cannonNorm.y, self._cannonNorm.z);
        hitBody = groundBody;
      }

      if (hitDistance <= raylen && hitBody) {
        wheel.isInContact = true;
        wheel.raycastResult.body = hitBody;
        wheel.raycastResult.groundObject = 0;
        wheel.raycastResult.distance = hitDistance;
        wheel.raycastResult.hitNormalWorld.copy(hitNormal);
        wheel.raycastResult.hitPointWorld.set(source.x, hitY, source.z);

        wheel.suspensionLength = hitDistance - wheel.radius;

        const minSusp = wheel.suspensionRestLength - wheel.maxSuspensionTravel;
        const maxSusp = wheel.suspensionRestLength + wheel.maxSuspensionTravel;
        if (wheel.suspensionLength < minSusp) wheel.suspensionLength = minSusp;
        if (wheel.suspensionLength > maxSusp) wheel.suspensionLength = maxSusp;

        chassis.getVelocityAtWorldPoint(wheel.raycastResult.hitPointWorld, chassisVelAtContact);
        const projVel = hitNormal.dot(chassisVelAtContact);
        wheel.suspensionRelativeVelocity = projVel;
        wheel.clippedInvContactDotSuspension = 1.0;

        return hitDistance;
      } else {
        wheel.isInContact = false;
        wheel.suspensionLength = wheel.suspensionRestLength;
        wheel.suspensionRelativeVelocity = 0.0;
        wheel.raycastResult.reset();
        return -1;
      }
    };
  }

  public update(dt: number, inputs: RoverInputState, powerMultiplier: number = 1.0) {
    this.missionSeconds += dt;

    // Steering
    let targetSteering = 0;
    if (inputs.left) targetSteering += this.MAX_STEER;
    if (inputs.right) targetSteering -= this.MAX_STEER;

    const steerSpeed = 3.4;
    this.currentSteering += (targetSteering - this.currentSteering) * steerSpeed * dt;

    this.vehicle.setSteeringValue(this.currentSteering, RoverPhysics.WHEEL_FL);
    this.vehicle.setSteeringValue(this.currentSteering, RoverPhysics.WHEEL_FR);

    // 4WD Torque
    let targetForce = 0;
    const currentSpeed = this.getSpeedMs();

    if (inputs.forward) {
      if (currentSpeed < 7.0) { // ~25 km/h maximum
        targetForce = this.MAX_ENGINE_FORCE * powerMultiplier;
      }
    } else if (inputs.backward) {
      if (currentSpeed > -4.5) {
        targetForce = -this.MAX_ENGINE_FORCE * 0.85 * powerMultiplier;
      }
    }

    this.engineForce += (targetForce - this.engineForce) * 5.5 * dt;

    this.vehicle.applyEngineForce(this.engineForce, RoverPhysics.WHEEL_FL);
    this.vehicle.applyEngineForce(this.engineForce, RoverPhysics.WHEEL_FR);
    this.vehicle.applyEngineForce(this.engineForce, RoverPhysics.WHEEL_RL);
    this.vehicle.applyEngineForce(this.engineForce, RoverPhysics.WHEEL_RR);

    // Brakes
    if (inputs.brake) {
      this.brakeForce = this.MAX_BRAKE_FORCE;
    } else if (!inputs.forward && !inputs.backward) {
      this.brakeForce = 120;
    } else {
      this.brakeForce = 0;
    }

    this.vehicle.setBrake(this.brakeForce, RoverPhysics.WHEEL_FL);
    this.vehicle.setBrake(this.brakeForce, RoverPhysics.WHEEL_FR);
    this.vehicle.setBrake(this.brakeForce, RoverPhysics.WHEEL_RL);
    this.vehicle.setBrake(this.brakeForce, RoverPhysics.WHEEL_RR);

    // Ground protection floor
    const cPos = this.chassisBody.position;
    const terrainH = getTerrainHeight(cPos.x, cPos.z);
    if (cPos.y < terrainH + 0.42) {
      cPos.y = terrainH + 0.42;
      if (this.chassisBody.velocity.y < 0) {
        this.chassisBody.velocity.y = 0;
      }
    }

    // Update odometer
    const curPos = this.getChassisPosition();
    const dDist = curPos.distanceTo(this.lastPosition);
    if (dDist < 5.0) {
      this.odometer += dDist;
    }
    this.lastPosition.copy(curPos);
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

    this._upVector.set(0, 1, 0).applyQuaternion(quat);
    const isOverturned = this._upVector.y < 0.35;

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
      batteryPct: Math.max(15, Math.round(98 - (this.odometer * 0.03) % 80)),
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
    this.chassisBody.position.set(x, groundY + 1.35, z);
    this.chassisBody.velocity.set(0, 0, 0);
    this.chassisBody.angularVelocity.set(0, 0, 0);
    this.chassisBody.quaternion.set(0, 0, 0, 1);
    this.engineForce = 0;
    this.currentSteering = 0;
    this.brakeForce = 0;
  }

  public selfRight() {
    this.chassisBody.quaternion.set(0, 0, 0, 1);
    this.chassisBody.position.y += 0.9;
    this.chassisBody.velocity.set(0, 1.2, 0);
    this.chassisBody.angularVelocity.set(0, 0, 0);
  }

  public dispose() {
    this.vehicle.removeFromWorld(this.world);
    this.world.removeBody(this.chassisBody);
  }
}
