/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import * as CANNON from 'cannon-es';
import { CameraViewMode, RockSampleData, RoverInputState, RoverTelemetry, SimulationConfig } from './types';
import { TerrainManager } from './terrainManager';
import { RockManager } from './rockManager';
import { DustSystem } from './dustSystem';
import { LanderModule } from './landerModule';
import { RoverModel } from './roverModel';
import { RoverPhysics } from './roverPhysics';
import { CameraController } from './cameraController';
import { MarsAudioManager } from './audio';

export class MarsSimulation {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  public world: CANNON.World;

  public terrain: TerrainManager;
  public rocks: RockManager;
  public dust: DustSystem;
  public lander: LanderModule;
  public roverModel: RoverModel;
  public roverPhysics: RoverPhysics;
  public cameraController: CameraController;
  public audio: MarsAudioManager;

  public isPaused = false;
  private isSoftwareGl = false;
  private animFrameId = 0;
  private lastTime = 0;

  // Lighting
  private sunLight: THREE.DirectionalLight;
  private hemiLight: THREE.HemisphereLight;

  // Rover inputs
  public inputs: RoverInputState = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    brake: false,
    armDeploy: false,
    armStow: false,
    drill: false,
  };

  public armState: 'stowed' | 'deploying' | 'deployed' | 'stowing' = 'stowed';
  public isDrilling = false;
  public nearbySample: RockSampleData | null = null;
  public currentSampleResult: RockSampleData | null = null;

  // Config
  public config: SimulationConfig = {
    gravity: -3.71,
    windSpeed: 8.5,
    windDirectionAngle: 0.4,
    dustDensity: 1.0,
    timeOfDayHours: 14.5,
    shadowsEnabled: true,
    drivePower: 1.0,
    cameraMode: 'third_person',
  };

  // Telemetry callback to React HUD
  public onTelemetryUpdate?: (telemetry: RoverTelemetry) => void;
  public onSampleScanned?: (sample: RockSampleData) => void;

  constructor(container: HTMLElement) {
    // 1. Detect Software WebGL
    this.isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    // 2. Setup Three.js Scene and Renderer
    this.scene = new THREE.Scene();
    const marsHorizonColor = new THREE.Color(0xb35332);
    this.scene.background = marsHorizonColor;
    this.scene.fog = new THREE.FogExp2(0xb35332, 0.0042);

    this.camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1800);

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.22;
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = !this.isSoftwareGl && this.config.shadowsEnabled;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    container.appendChild(this.renderer.domElement);

    // Add Surreal Martian Sky Dome
    const skyGeo = new THREE.SphereGeometry(1400, 32, 16);
    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vWorldPosition;
        void main() {
          float h = normalize(vWorldPosition).y;
          vec3 zenithColor = vec3(0.24, 0.09, 0.11); // Deep cosmic Martian zenith
          vec3 midColor = vec3(0.68, 0.28, 0.18);    // Mid atmosphere
          vec3 horizonColor = vec3(0.85, 0.44, 0.26);// Butterscotch golden dust horizon
          
          vec3 color = mix(horizonColor, midColor, smoothstep(0.0, 0.35, max(0.0, h)));
          color = mix(color, zenithColor, smoothstep(0.35, 0.85, max(0.0, h)));
          gl_FragColor = vec4(color, 1.0);
        }
      `,
    });
    const skyDome = new THREE.Mesh(skyGeo, skyMat);
    this.scene.add(skyDome);

    // 3. Studio Environment Reflection (RoomEnvironment + PMREMGenerator)
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    // 4. Lighting: Cinematic Low-Angle Sun (GTA 5 style golden-hour long shadows)
    this.sunLight = new THREE.DirectionalLight(0xffeedd, 3.6);
    this.sunLight.position.set(90, 52, 75);
    this.sunLight.castShadow = !this.isSoftwareGl;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 0.5;
    this.sunLight.shadow.camera.far = 320;
    const d = 42;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.bias = -0.0004;
    this.sunLight.shadow.normalBias = 0.02;
    this.scene.add(this.sunLight);

    this.hemiLight = new THREE.HemisphereLight(0xffd5b8, 0x421710, 1.6);
    this.scene.add(this.hemiLight);

    // 5. Cannon-es Physics World
    this.world = new CANNON.World();
    this.world.gravity.set(0, this.config.gravity, 0);

    // 6. Subsystems
    this.audio = new MarsAudioManager();
    this.terrain = new TerrainManager(this.scene, this.renderer);
    this.rocks = new RockManager(this.scene, this.world);
    this.dust = new DustSystem(this.scene);
    this.lander = new LanderModule(this.scene, this.world);
    this.roverModel = new RoverModel();
    this.scene.add(this.roverModel.group);

    this.roverPhysics = new RoverPhysics(this.world);
    this.cameraController = new CameraController(this.camera, this.renderer.domElement);

    // Listeners
    window.addEventListener('resize', this.onWindowResize);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);

    // Start render loop
    this.lastTime = performance.now();
    this.tick();
  }

  private onWindowResize = () => {
    if (!this.renderer || !this.camera) return;
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  };

  private onKeyDown = (e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

    switch (e.code) {
      case 'KeyW':
      case 'ArrowUp':
        this.inputs.forward = true;
        break;
      case 'KeyS':
      case 'ArrowDown':
        this.inputs.backward = true;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        this.inputs.left = true;
        break;
      case 'KeyD':
      case 'ArrowRight':
        this.inputs.right = true;
        break;
      case 'Space':
        e.preventDefault();
        this.inputs.brake = true;
        break;
      case 'KeyE':
        this.toggleArm();
        break;
      case 'KeyQ':
        this.stowArm();
        break;
      case 'KeyR':
        this.resetRoverPosition();
        break;
      case 'KeyC':
        this.cycleCamera();
        break;
      case 'Escape':
        this.togglePause();
        break;
    }
  };

  private onKeyUp = (e: KeyboardEvent) => {
    switch (e.code) {
      case 'KeyW':
      case 'ArrowUp':
        this.inputs.forward = false;
        break;
      case 'KeyS':
      case 'ArrowDown':
        this.inputs.backward = false;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        this.inputs.left = false;
        break;
      case 'KeyD':
      case 'ArrowRight':
        this.inputs.right = false;
        break;
      case 'Space':
        this.inputs.brake = false;
        break;
    }
  };

  public toggleArm() {
    this.audio.setServoActive(true);
    setTimeout(() => this.audio.setServoActive(false), 900);

    if (this.armState === 'stowed' || this.armState === 'stowing') {
      this.armState = 'deployed';
    } else {
      // Toggle drilling mode
      this.triggerSampleDrill();
    }
  }

  public stowArm() {
    this.audio.setServoActive(true);
    setTimeout(() => this.audio.setServoActive(false), 900);
    this.armState = 'stowed';
    this.isDrilling = false;
    this.roverModel.isDrilling = false;
    this.audio.setDrillActive(false);
  }

  public triggerSampleDrill() {
    if (this.armState !== 'deployed') {
      this.armState = 'deployed';
    }
    this.isDrilling = true;
    this.roverModel.isDrilling = true;
    this.audio.setDrillActive(true);

    // Emit drill dust particles
    const roverPos = this.roverPhysics.getChassisPosition();
    this.dust.emitWheelPuff(roverPos.x + 0.4, roverPos.y + 0.1, roverPos.z + 1.2, 3.5, 1.8);

    setTimeout(() => {
      this.isDrilling = false;
      this.roverModel.isDrilling = false;
      this.audio.setDrillActive(false);

      if (this.nearbySample) {
        this.currentSampleResult = { ...this.nearbySample };
        if (this.onSampleScanned) {
          this.onSampleScanned(this.currentSampleResult);
        }
      }
    }, 2800);
  }

  public cycleCamera(): CameraViewMode {
    const newMode = this.cameraController.cycleMode();
    this.config.cameraMode = newMode;
    return newMode;
  }

  public resetRoverPosition() {
    // Check if on lander or overturned
    const pos = this.roverPhysics.getChassisPosition();
    if (pos.distanceTo(new THREE.Vector3(0, 0, 0)) < 4.0) {
      // Reset to deck
      this.roverPhysics.resetPosition(0, 0.4);
    } else {
      // Self-right in place or reset to just off lander
      if (this.roverPhysics.getTelemetry(this.config.windSpeed).isOverturned) {
        this.roverPhysics.selfRight();
      } else {
        this.roverPhysics.resetPosition(pos.x, pos.z);
      }
    }
    this.audio.playThud(0.7);
  }

  public togglePause() {
    this.isPaused = !this.isPaused;
  }

  public deployLander() {
    this.lander.startDeployment();
    this.audio.playDeploymentChime();
  }

  private tick = () => {
    const now = performance.now();
    const dt = Math.min(0.08, (now - this.lastTime) / 1000);
    this.lastTime = now;

    if (!this.isPaused) {
      // 1. Step Cannon-es Physics simulation (fixed 60Hz step with max 5 substeps)
      this.world.step(1 / 60, dt, 5);

      // 2. Update Rover Physics and inputs
      this.roverPhysics.update(dt, this.inputs, this.config.drivePower);

      // 3. Sync Rover Visual 3D Meshes with Physics Rigid Bodies
      const chassisPos = this.roverPhysics.getChassisPosition();
      const chassisQuat = this.roverPhysics.getChassisQuaternion();
      this.roverModel.group.position.copy(chassisPos);
      this.roverModel.group.quaternion.copy(chassisQuat);

      // Update Sun light position to follow rover (for sharp shadows)
      this.sunLight.position.set(chassisPos.x + 60, chassisPos.y + 95, chassisPos.z + 50);
      this.sunLight.target.position.copy(chassisPos);
      this.sunLight.target.updateMatrixWorld();

      // Sync 4 Wheels
      for (let i = 0; i < 4; i++) {
        const wheelPos = this.roverPhysics.getWheelPosition(i);
        const wheelQuat = this.roverPhysics.getWheelQuaternion(i);

        // Convert world wheel transform to roverModel local coordinates
        const localPos = this.roverModel.group.worldToLocal(wheelPos.clone());
        this.roverModel.wheels[i].position.copy(localPos);

        // Wheel spin and steering
        const localQuat = this.roverModel.group.quaternion.clone().invert().multiply(wheelQuat);
        this.roverModel.wheels[i].quaternion.copy(localQuat);

        // Emit wheel dust puffs if wheel is rotating and contacting ground
        const wheelInfo = this.roverPhysics.vehicle.wheelInfos[i];
        if (wheelInfo.isInContact && Math.abs(this.roverPhysics.getSpeedMs()) > 0.4) {
          if (Math.random() < 0.28) {
            this.dust.emitWheelPuff(wheelPos.x, wheelPos.y - wheelInfo.radius, wheelPos.z, this.roverPhysics.getSpeedMs());
          }
        }
      }

      // 4. Update Lander animations
      this.lander.update(dt);

      // 5. Update Robotic Arm kinematics
      const armTarget = this.isDrilling ? 'drilling' : this.armState === 'deployed' ? 'deployed' : 'stowed';
      this.roverModel.updateArmKinematics(dt, armTarget);

      // 6. Update Dust System (wind particles drifting, billboard puffs)
      this.dust.update(dt, chassisPos, this.camera);

      // 7. Update Audio
      this.audio.updateMotor(
        this.roverPhysics.getSpeedMs() * 3.6,
        this.inputs.forward || this.inputs.backward
      );

      // 8. Update Camera
      this.cameraController.update(dt, chassisPos, chassisQuat, this.roverModel);

      // 9. Check proximity to scientific rock sample targets
      this.updateRockProximity(chassisPos);

      // 10. Send Telemetry to UI
      if (this.onTelemetryUpdate) {
        const telemetry = this.roverPhysics.getTelemetry(this.config.windSpeed);
        telemetry.armStatus = this.armState;
        telemetry.isDrilling = this.isDrilling;
        telemetry.lastSampleName = this.currentSampleResult ? this.currentSampleResult.name : null;
        this.onTelemetryUpdate(telemetry);
      }
    }

    // Render scene
    this.renderer.render(this.scene, this.camera);

    this.animFrameId = requestAnimationFrame(this.tick);
  };

  private updateRockProximity(roverPos: THREE.Vector3) {
    let closestDist = Infinity;
    let closestTarget: RockSampleData | null = null;

    for (let i = 0; i < this.rocks.sampleTargets.length; i++) {
      const target = this.rocks.sampleTargets[i];
      // Target coordinates from boulder instance
      const matrix = new THREE.Matrix4();
      this.rocks.boulderInstances.getMatrixAt(i, matrix);
      const targetPos = new THREE.Vector3().setFromMatrixPosition(matrix);
      const dist = roverPos.distanceTo(targetPos);
      target.distance = Math.round(dist * 10) / 10;

      if (dist < closestDist) {
        closestDist = dist;
        closestTarget = target;
      }
    }

    if (closestDist < 3.8 && closestTarget) {
      this.nearbySample = closestTarget;
    } else {
      this.nearbySample = null;
    }
  }

  public dispose() {
    cancelAnimationFrame(this.animFrameId);
    window.removeEventListener('resize', this.onWindowResize);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);

    this.cameraController.dispose(this.renderer.domElement);
    this.audio.dispose();
    this.terrain.dispose();
    this.rocks.dispose(this.world);
    this.dust.dispose();
    this.lander.dispose(this.world);
    this.roverModel.dispose();
    this.roverPhysics.dispose();

    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
    this.renderer.dispose();
  }
}
