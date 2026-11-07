/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';

export class RoverModel {
  public group: THREE.Group;
  public chassisGroup: THREE.Group;

  // 4 independently transformed wheels (FL, FR, RL, RR)
  public wheels: THREE.Group[] = [];
  public wheelTreads: THREE.Mesh[] = [];

  // Articulated Camera Mast
  public mastHead: THREE.Group;
  public mastCamMount: THREE.Group;

  // Articulated 4-DOF Robotic Arm
  public armBase: THREE.Group;       // Shoulder azimuth
  public armUpper: THREE.Group;      // Shoulder elevation
  public armForearm: THREE.Group;    // Elbow pitch
  public armWrist: THREE.Group;      // Wrist roll/pitch
  public armTurret: THREE.Group;     // End-effector turret with drill
  public drillBit: THREE.Mesh;

  // Arm animated targets
  public armJointAngles = {
    azimuth: 0,
    shoulder: 0.1,
    elbow: 0.2,
    wrist: 0.1,
  };

  public isDrilling = false;

  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'RoverModelGroup';

    // Materials
    const chassisWhiteMat = new THREE.MeshStandardMaterial({
      color: 0xedf2f7,
      roughness: 0.35,
      metalness: 0.45,
    });

    const chassisGoldMat = new THREE.MeshStandardMaterial({
      color: 0xd4a017,
      roughness: 0.28,
      metalness: 0.88,
    });

    const structuralMetalMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.55,
      metalness: 0.75,
    });

    const titaniumMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      roughness: 0.38,
      metalness: 0.85,
    });

    const lensMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.1,
      metalness: 0.95,
    });

    const solarPanelMat = new THREE.MeshStandardMaterial({
      color: 0x1e1b4b,
      roughness: 0.2,
      metalness: 0.6,
    });

    // 1. Chassis Group (Warm Electronics Box - WEB)
    this.chassisGroup = new THREE.Group();
    this.chassisGroup.position.set(0, 0, 0);

    // Primary body hull (faceted aerodynamic box)
    const hullGeo = new THREE.BoxGeometry(1.2, 0.45, 1.8);
    const hullMesh = new THREE.Mesh(hullGeo, chassisWhiteMat);
    hullMesh.castShadow = true;
    hullMesh.receiveShadow = true;
    hullMesh.position.y = 0.35;
    this.chassisGroup.add(hullMesh);

    // Gold foil insulation underbelly & thermal blanket side panels
    const foilGeo = new THREE.BoxGeometry(1.22, 0.25, 1.4);
    const foilMesh = new THREE.Mesh(foilGeo, chassisGoldMat);
    foilMesh.position.set(0, 0.28, 0.1);
    foilMesh.castShadow = true;
    this.chassisGroup.add(foilMesh);

    // Top Solar Array / Equipment Deck
    const deckGeo = new THREE.BoxGeometry(1.3, 0.05, 1.6);
    const deckMesh = new THREE.Mesh(deckGeo, solarPanelMat);
    deckMesh.position.set(0, 0.6, -0.05);
    deckMesh.castShadow = true;
    deckMesh.receiveShadow = true;
    this.chassisGroup.add(deckMesh);

    // Solar panel cell grid dividers (accent lines)
    for (let i = -0.5; i <= 0.5; i += 0.25) {
      const gridLineGeo = new THREE.BoxGeometry(0.015, 0.06, 1.58);
      const gridLine = new THREE.Mesh(gridLineGeo, structuralMetalMat);
      gridLine.position.set(i, 0.605, -0.05);
      this.chassisGroup.add(gridLine);
    }

    // Rear MMRTG Power Source (cylindrical nuclear battery with 8 cooling fins)
    const rtgGroup = new THREE.Group();
    rtgGroup.position.set(0, 0.52, -1.05);

    const rtgCoreGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.6, 16);
    rtgCoreGeo.rotateX(Math.PI / 2);
    const rtgCore = new THREE.Mesh(rtgCoreGeo, structuralMetalMat);
    rtgCore.castShadow = true;
    rtgGroup.add(rtgCore);

    for (let f = 0; f < 8; f++) {
      const finAngle = (f * Math.PI) / 4;
      const finGeo = new THREE.BoxGeometry(0.012, 0.26, 0.55);
      const finMesh = new THREE.Mesh(finGeo, titaniumMat);
      finMesh.rotation.z = finAngle;
      rtgGroup.add(finMesh);
    }
    this.chassisGroup.add(rtgGroup);

    // Antennas: High-Gain Dish and Low-Gain Helical Mast
    const dishMast = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.45, 8), structuralMetalMat);
    dishMast.position.set(0.45, 0.8, -0.6);
    dishMast.castShadow = true;
    this.chassisGroup.add(dishMast);

    const dishGeo = new THREE.SphereGeometry(0.24, 16, 8, 0, Math.PI * 2, 0, Math.PI / 3);
    const dish = new THREE.Mesh(dishGeo, chassisWhiteMat);
    dish.position.set(0.45, 1.05, -0.6);
    dish.rotation.x = -Math.PI / 3;
    dish.rotation.y = 0.4;
    dish.castShadow = true;
    this.chassisGroup.add(dish);

    const helicalMast = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.7, 8), structuralMetalMat);
    helicalMast.position.set(-0.45, 0.95, -0.6);
    helicalMast.castShadow = true;
    this.chassisGroup.add(helicalMast);

    // Forward LED Floodlights
    const lightLeft = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.08, 12), titaniumMat);
    lightLeft.rotation.x = Math.PI / 2;
    lightLeft.position.set(-0.4, 0.48, 0.92);
    this.chassisGroup.add(lightLeft);

    const lightRight = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.08, 12), titaniumMat);
    lightRight.rotation.x = Math.PI / 2;
    lightRight.position.set(0.4, 0.48, 0.92);
    this.chassisGroup.add(lightRight);

    // SpotLight projecting forward
    const spot = new THREE.SpotLight(0xffeedd, 3.5, 30, Math.PI / 6, 0.4);
    spot.position.set(0, 0.55, 0.95);
    spot.target.position.set(0, 0, 10);
    this.chassisGroup.add(spot);
    this.chassisGroup.add(spot.target);

    // 2. Camera Mast (Remote Sensing Mast)
    const mastBase = new THREE.Group();
    mastBase.position.set(-0.42, 0.62, 0.65);

    const mastPole = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.95, 10), titaniumMat);
    mastPole.position.y = 0.475;
    mastPole.castShadow = true;
    mastBase.add(mastPole);

    this.mastHead = new THREE.Group();
    this.mastHead.position.y = 0.95;

    // Pan/tilt turret head
    const headBoxGeo = new THREE.BoxGeometry(0.26, 0.16, 0.2);
    const headBox = new THREE.Mesh(headBoxGeo, chassisWhiteMat);
    headBox.castShadow = true;
    this.mastHead.add(headBox);

    // ChemCam spectrometer cylinder
    const chemCamGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.14, 16);
    chemCamGeo.rotateX(Math.PI / 2);
    const chemCam = new THREE.Mesh(chemCamGeo, titaniumMat);
    chemCam.position.set(0, 0.02, 0.1);
    this.mastHead.add(chemCam);

    // Dual stereo Mastcam lenses
    [-0.08, 0.08].forEach(xOff => {
      const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.06, 12), lensMat);
      lens.rotateX(Math.PI / 2);
      lens.position.set(xOff, -0.03, 0.11);
      this.mastHead.add(lens);
    });

    // Mastcam perspective anchor (for First-Person camera)
    this.mastCamMount = new THREE.Group();
    this.mastCamMount.position.set(0, 0, 0.15);
    this.mastHead.add(this.mastCamMount);

    mastBase.add(this.mastHead);
    this.chassisGroup.add(mastBase);

    // 3. Articulated 4-DOF Robotic Arm (Instrument Deployment Arm)
    const armRoot = new THREE.Group();
    armRoot.position.set(0.38, 0.48, 0.88); // Front-right corner of chassis

    // Joint 1: Shoulder azimuth rotation (yaw)
    this.armBase = new THREE.Group();
    const shoulderSwivel = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.12, 12), structuralMetalMat);
    this.armBase.add(shoulderSwivel);
    armRoot.add(this.armBase);

    // Joint 2: Shoulder elevation (pitch)
    this.armUpper = new THREE.Group();
    this.armUpper.position.set(0, 0.06, 0);

    const upperBoomGeo = new THREE.CylinderGeometry(0.04, 0.045, 0.65, 8);
    upperBoomGeo.translate(0, 0.32, 0);
    const upperBoom = new THREE.Mesh(upperBoomGeo, titaniumMat);
    upperBoom.castShadow = true;
    this.armUpper.add(upperBoom);

    this.armBase.add(this.armUpper);

    // Joint 3: Elbow joint
    this.armForearm = new THREE.Group();
    this.armForearm.position.set(0, 0.65, 0);

    const elbowHinge = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.1, 10), structuralMetalMat);
    elbowHinge.rotateZ(Math.PI / 2);
    this.armForearm.add(elbowHinge);

    const foreBoomGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.55, 8);
    foreBoomGeo.translate(0, 0.27, 0);
    const foreBoom = new THREE.Mesh(foreBoomGeo, titaniumMat);
    foreBoom.castShadow = true;
    this.armForearm.add(foreBoom);

    this.armUpper.add(this.armForearm);

    // Joint 4: Wrist and End-Effector Turret
    this.armWrist = new THREE.Group();
    this.armWrist.position.set(0, 0.55, 0);

    this.armTurret = new THREE.Group();
    const turretBox = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.18), structuralMetalMat);
    turretBox.castShadow = true;
    this.armTurret.add(turretBox);

    // Scientific instruments on turret: APXS Spectrometer, Microscopic Imager, Percussive Core Drill
    const apxsSensor = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.08, 12), chassisGoldMat);
    apxsSensor.position.set(-0.06, 0, 0.1);
    apxsSensor.rotateX(Math.PI / 2);
    this.armTurret.add(apxsSensor);

    const drillChassis = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.16, 12), titaniumMat);
    drillChassis.position.set(0.06, 0, 0.1);
    drillChassis.rotateX(Math.PI / 2);
    this.armTurret.add(drillChassis);

    const drillBitGeo = new THREE.CylinderGeometry(0.015, 0.005, 0.22, 8);
    drillBitGeo.rotateX(Math.PI / 2);
    drillBitGeo.translate(0, 0, 0.11);
    this.drillBit = new THREE.Mesh(drillBitGeo, structuralMetalMat);
    this.armTurret.add(this.drillBit);

    this.armWrist.add(this.armTurret);
    this.armForearm.add(this.armWrist);

    this.chassisGroup.add(armRoot);

    // Initial Stowed Pose for the robotic arm
    this.setArmPose(0, -1.2, 2.4, -1.2);

    this.group.add(this.chassisGroup);

    // 4. Build 4 Wheels (FL, FR, RL, RR)
    // Wheel positions relative to rover center (matching heavy stable physics stance)
    const wheelHalfTrack = 1.05;
    const wheelHalfBase = 0.95;

    const wheelOffsets = [
      new THREE.Vector3(-wheelHalfTrack, 0, wheelHalfBase),  // FL (0)
      new THREE.Vector3(wheelHalfTrack, 0, wheelHalfBase),   // FR (1)
      new THREE.Vector3(-wheelHalfTrack, 0, -wheelHalfBase), // RL (2)
      new THREE.Vector3(wheelHalfTrack, 0, -wheelHalfBase),  // RR (3)
    ];

    for (let i = 0; i < 4; i++) {
      const wheelGroup = new THREE.Group();
      wheelGroup.name = `Wheel_${i}`;

      const { wheelMesh, treadMesh } = this.createWheelAssembly(i % 2 === 1);
      wheelGroup.add(wheelMesh);
      this.wheelTreads.push(treadMesh);

      wheelGroup.position.copy(wheelOffsets[i]);
      this.wheels.push(wheelGroup);
      this.group.add(wheelGroup);
    }
  }

  private createWheelAssembly(isRight: boolean): { wheelMesh: THREE.Group; treadMesh: THREE.Mesh } {
    const assembly = new THREE.Group();

    const metalMat = new THREE.MeshStandardMaterial({
      color: 0x222a36,
      roughness: 0.6,
      metalness: 0.75,
    });

    const rimMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      roughness: 0.35,
      metalness: 0.88,
    });

    const goldHubMat = new THREE.MeshStandardMaterial({
      color: 0xd4a017,
      roughness: 0.3,
      metalness: 0.85,
    });

    // Outer wheel tire with spiral grousers/treads
    const tireRadius = 0.38;
    const tireWidth = 0.30;
    const tireGeo = new THREE.CylinderGeometry(tireRadius, tireRadius, tireWidth, 24);
    tireGeo.rotateZ(Math.PI / 2); // Align cylinder along X axle

    const tireMesh = new THREE.Mesh(tireGeo, metalMat);
    tireMesh.castShadow = true;
    tireMesh.receiveShadow = true;
    assembly.add(tireMesh);

    // Inner rim
    const rimGeo = new THREE.CylinderGeometry(tireRadius * 0.75, tireRadius * 0.75, tireWidth * 1.02, 16);
    rimGeo.rotateZ(Math.PI / 2);
    const rimMesh = new THREE.Mesh(rimGeo, rimMat);
    assembly.add(rimMesh);

    // Drive motor canister in center hub
    const hubGeo = new THREE.CylinderGeometry(0.09, 0.09, tireWidth * 1.15, 12);
    hubGeo.rotateZ(Math.PI / 2);
    const hubMesh = new THREE.Mesh(hubGeo, goldHubMat);
    assembly.add(hubMesh);

    // 6 Wheel spokes
    for (let s = 0; s < 6; s++) {
      const spokeAngle = (s * Math.PI) / 3;
      const spokeGeo = new THREE.BoxGeometry(tireWidth * 0.9, 0.02, tireRadius * 0.7);
      const spoke = new THREE.Mesh(spokeGeo, rimMat);
      spoke.rotation.x = spokeAngle;
      assembly.add(spoke);
    }

    // Chevron grousers (tread ribs) around tire circumference
    for (let g = 0; g < 18; g++) {
      const gAngle = (g * Math.PI * 2) / 18;
      const grouserGeo = new THREE.BoxGeometry(0.018, 0.02, tireWidth * 0.9);
      const grouser = new THREE.Mesh(grouserGeo, rimMat);
      grouser.position.set(
        0,
        Math.cos(gAngle) * (tireRadius + 0.008),
        Math.sin(gAngle) * (tireRadius + 0.008)
      );
      grouser.rotation.x = gAngle + (isRight ? 0.2 : -0.2);
      assembly.add(grouser);
    }

    return { wheelMesh: assembly, treadMesh: tireMesh };
  }

  public setArmPose(azimuth: number, shoulder: number, elbow: number, wrist: number) {
    this.armJointAngles.azimuth = azimuth;
    this.armJointAngles.shoulder = shoulder;
    this.armJointAngles.elbow = elbow;
    this.armJointAngles.wrist = wrist;

    this.armBase.rotation.y = azimuth;
    this.armUpper.rotation.x = shoulder;
    this.armForearm.rotation.x = elbow;
    this.armWrist.rotation.x = wrist;
  }

  public updateArmKinematics(dt: number, targetMode: 'stowed' | 'deployed' | 'drilling') {
    // Target joint angles depending on state
    let tAzimuth = 0;
    let tShoulder = -1.2;
    let tElbow = 2.4;
    let tWrist = -1.2;

    if (targetMode === 'deployed') {
      tAzimuth = 0.45;
      tShoulder = 0.35;
      tElbow = 0.55;
      tWrist = 0.4;
    } else if (targetMode === 'drilling') {
      tAzimuth = 0.3;
      tShoulder = 0.65;
      tElbow = 0.7;
      tWrist = 0.55;
    }

    // Smooth exponential damping interpolation
    const speed = 2.5;
    this.armJointAngles.azimuth += (tAzimuth - this.armJointAngles.azimuth) * speed * dt;
    this.armJointAngles.shoulder += (tShoulder - this.armJointAngles.shoulder) * speed * dt;
    this.armJointAngles.elbow += (tElbow - this.armJointAngles.elbow) * speed * dt;
    this.armJointAngles.wrist += (tWrist - this.armJointAngles.wrist) * speed * dt;

    this.armBase.rotation.y = this.armJointAngles.azimuth;
    this.armUpper.rotation.x = this.armJointAngles.shoulder;
    this.armForearm.rotation.x = this.armJointAngles.elbow;
    this.armWrist.rotation.x = this.armJointAngles.wrist;

    // Drill bit rotation if active
    if (this.isDrilling) {
      this.drillBit.rotation.z += 35 * dt;
    }
  }

  public dispose() {
    this.group.traverse(child => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.geometry.dispose();
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach(m => m.dispose());
        } else {
          mesh.material.dispose();
        }
      }
    });
  }
}
