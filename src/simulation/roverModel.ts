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

  // Rocker-Bogie mechanical visual linkages
  public rockerArmLeft: THREE.Group;
  public rockerArmRight: THREE.Group;

  // Articulated Camera Mast
  public mastHead: THREE.Group;
  public mastCamMount: THREE.Group;
  public chemCamAperture: THREE.Mesh;

  // Articulated 5-DOF Robotic Arm
  public armBase: THREE.Group;       // Shoulder azimuth
  public armUpper: THREE.Group;      // Shoulder elevation
  public armForearm: THREE.Group;    // Elbow pitch
  public armWrist: THREE.Group;      // Wrist pitch
  public armTurret: THREE.Group;     // Rotary instrument turret
  public drillBit: THREE.Mesh;
  public watsonLedRing: THREE.Mesh;

  // Arm joint angles
  public armJointAngles = {
    azimuth: 0,
    shoulder: 0.1,
    elbow: 0.2,
    wrist: 0.1,
    turretRoll: 0,
  };

  public isDrilling = false;

  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'RoverModelGroup';

    // 1. High-Fidelity PBR Aerospace Materials
    const chassisWhiteMat = new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      roughness: 0.32,
      metalness: 0.45,
    });

    const chassisGoldKaptonMat = new THREE.MeshStandardMaterial({
      color: 0xdfa012,
      roughness: 0.22,
      metalness: 0.92,
    });

    const titaniumMat = new THREE.MeshStandardMaterial({
      color: 0xa0aec0,
      roughness: 0.28,
      metalness: 0.88,
    });

    const darkAnodizedMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.45,
      metalness: 0.82,
    });

    const carbonFiberMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.5,
      metalness: 0.3,
    });

    const opticalLensMat = new THREE.MeshPhysicalMaterial({
      color: 0x0284c7,
      roughness: 0.05,
      metalness: 0.95,
      transmission: 0.6,
      ior: 1.52,
    });

    const solarPanelMat = new THREE.MeshStandardMaterial({
      color: 0x1e1b4b,
      roughness: 0.18,
      metalness: 0.65,
    });

    const copperGoldMat = new THREE.MeshStandardMaterial({
      color: 0xb45309,
      roughness: 0.25,
      metalness: 0.95,
    });

    // 2. Chassis Group (Warm Electronics Box - WEB)
    this.chassisGroup = new THREE.Group();
    this.chassisGroup.position.set(0, 0, 0);

    // Primary Body Hull (Beveled Avionics Enclosure)
    const hullGeo = new THREE.BoxGeometry(1.4, 0.48, 2.0);
    const hullMesh = new THREE.Mesh(hullGeo, chassisWhiteMat);
    hullMesh.castShadow = true;
    hullMesh.receiveShadow = true;
    hullMesh.position.y = 0.38;
    this.chassisGroup.add(hullMesh);

    // Multi-Layer Thermal Insulation (MLI) Gold Foil Blanket (Side & Underbelly wraps)
    const foilGeo = new THREE.BoxGeometry(1.42, 0.28, 1.6);
    const foilMesh = new THREE.Mesh(foilGeo, chassisGoldKaptonMat);
    foilMesh.position.set(0, 0.30, 0.1);
    foilMesh.castShadow = true;
    this.chassisGroup.add(foilMesh);

    // Top Equipment Deck (Carbon composite payload deck)
    const deckGeo = new THREE.BoxGeometry(1.48, 0.06, 1.8);
    const deckMesh = new THREE.Mesh(deckGeo, carbonFiberMat);
    deckMesh.position.set(0, 0.64, -0.05);
    deckMesh.castShadow = true;
    deckMesh.receiveShadow = true;
    this.chassisGroup.add(deckMesh);

    // High-Efficiency Solar Panel Array Inset
    const solarGeo = new THREE.BoxGeometry(1.36, 0.02, 1.3);
    const solarMesh = new THREE.Mesh(solarGeo, solarPanelMat);
    solarMesh.position.set(0, 0.68, -0.22);
    solarMesh.castShadow = true;
    this.chassisGroup.add(solarMesh);

    // Solar array division grid lines
    for (let x = -0.55; x <= 0.55; x += 0.22) {
      const lineGeo = new THREE.BoxGeometry(0.012, 0.025, 1.28);
      const lineMesh = new THREE.Mesh(lineGeo, titaniumMat);
      lineMesh.position.set(x, 0.685, -0.22);
      this.chassisGroup.add(lineMesh);
    }

    // MarsDial Calibration Sundial Target (Photometric calibration target)
    const marsDialGroup = new THREE.Group();
    marsDialGroup.position.set(0.35, 0.68, -0.1);

    const dialBase = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.02, 24), titaniumMat);
    marsDialGroup.add(dialBase);

    const gnomonPost = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.008, 0.08, 12), darkAnodizedMat);
    gnomonPost.position.y = 0.04;
    marsDialGroup.add(gnomonPost);

    // 4 Colored Radiometric Calibration Chips (Red, Green, Blue, Yellow)
    const colors = [0xef4444, 0x22c55e, 0x3b82f6, 0xeab308];
    for (let c = 0; c < 4; c++) {
      const chipAngle = (c * Math.PI) / 2 + Math.PI / 4;
      const chipMat = new THREE.MeshBasicMaterial({ color: colors[c] });
      const chip = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.022, 0.02), chipMat);
      chip.position.set(Math.cos(chipAngle) * 0.05, 0.015, Math.sin(chipAngle) * 0.05);
      marsDialGroup.add(chip);
    }
    this.chassisGroup.add(marsDialGroup);

    // Hazcams: Dual Front Stereo Hazard Avoidance Cameras
    const frontHazcamGroup = new THREE.Group();
    frontHazcamGroup.position.set(0, 0.42, 1.02);

    const hazcamBar = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.06, 0.06), darkAnodizedMat);
    frontHazcamGroup.add(hazcamBar);

    [-0.18, 0.18].forEach(xOff => {
      const eye = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.06, 16), titaniumMat);
      eye.rotateX(Math.PI / 2);
      eye.position.set(xOff, 0, 0.04);
      const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.07, 12), opticalLensMat);
      glass.rotateX(Math.PI / 2);
      glass.position.set(xOff, 0, 0.04);
      frontHazcamGroup.add(eye);
      frontHazcamGroup.add(glass);
    });
    this.chassisGroup.add(frontHazcamGroup);

    // Hazcams: Dual Rear Stereo Cameras
    const rearHazcamGroup = new THREE.Group();
    rearHazcamGroup.position.set(0, 0.38, -1.02);
    const rearBar = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.05, 0.05), darkAnodizedMat);
    rearHazcamGroup.add(rearBar);
    [-0.14, 0.14].forEach(xOff => {
      const eye = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.05, 12), titaniumMat);
      eye.rotateX(Math.PI / 2);
      eye.position.set(xOff, 0, -0.03);
      rearHazcamGroup.add(eye);
    });
    this.chassisGroup.add(rearHazcamGroup);

    // Forward LED Exploration Floodlights with deep conical reflector
    [-0.45, 0.45].forEach(xOff => {
      const lightHsg = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.05, 0.1, 16), titaniumMat);
      lightHsg.rotateX(Math.PI / 2);
      lightHsg.position.set(xOff, 0.52, 0.98);
      lightHsg.castShadow = true;
      this.chassisGroup.add(lightHsg);
    });

    const spot = new THREE.SpotLight(0xfff1e0, 4.2, 35, Math.PI / 5.5, 0.45);
    spot.position.set(0, 0.55, 1.05);
    spot.target.position.set(0, 0, 12);
    this.chassisGroup.add(spot);
    this.chassisGroup.add(spot.target);

    // Rear Multi-Mission Radioisotope Thermoelectric Generator (MMRTG)
    const rtgGroup = new THREE.Group();
    rtgGroup.position.set(0, 0.58, -1.22);
    rtgGroup.rotation.x = -0.15; // Realistic canted mounting

    const rtgCoreGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.68, 24);
    rtgCoreGeo.rotateX(Math.PI / 2);
    const rtgCore = new THREE.Mesh(rtgCoreGeo, darkAnodizedMat);
    rtgCore.castShadow = true;
    rtgGroup.add(rtgCore);

    // 8 Scalloped Radiation Cooling Fins
    for (let f = 0; f < 8; f++) {
      const finAngle = (f * Math.PI) / 4;
      const finGeo = new THREE.BoxGeometry(0.012, 0.32, 0.64);
      const finMesh = new THREE.Mesh(finGeo, titaniumMat);
      finMesh.rotation.z = finAngle;
      rtgGroup.add(finMesh);
    }

    // Cooling fluid tube loop conduits
    const tubeGeo = new THREE.TorusGeometry(0.18, 0.015, 8, 24);
    const tubeMesh = new THREE.Mesh(tubeGeo, copperGoldMat);
    tubeMesh.position.z = 0.28;
    rtgGroup.add(tubeMesh);

    this.chassisGroup.add(rtgGroup);

    // High-Gain Antenna (HGA) - Steerable Parabolic Dish with 2-axis Gimbal Drive
    const hgaGroup = new THREE.Group();
    hgaGroup.position.set(0.5, 0.68, -0.6);

    const hgaPedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.35, 12), titaniumMat);
    hgaPedestal.position.y = 0.175;
    hgaGroup.add(hgaPedestal);

    const hgaGimbal = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.09, 0.09), darkAnodizedMat);
    hgaGimbal.position.y = 0.35;
    hgaGroup.add(hgaGimbal);

    const hgaDishGeo = new THREE.SphereGeometry(0.28, 24, 12, 0, Math.PI * 2, 0, Math.PI / 3);
    const hgaDish = new THREE.Mesh(hgaDishGeo, chassisWhiteMat);
    hgaDish.position.set(0, 0.44, 0);
    hgaDish.rotation.x = -Math.PI / 3.2;
    hgaDish.rotation.y = 0.35;
    hgaDish.castShadow = true;
    hgaGroup.add(hgaDish);

    const hgaSubReflector = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.1, 12), copperGoldMat);
    hgaSubReflector.position.set(0, 0.44, 0.12);
    hgaSubReflector.rotation.x = Math.PI / 2;
    hgaGroup.add(hgaSubReflector);

    this.chassisGroup.add(hgaGroup);

    // Low-Gain Antenna (LGA) - Spiral UHF Helical Antenna
    const lgaGroup = new THREE.Group();
    lgaGroup.position.set(-0.52, 0.68, -0.6);

    const lgaMast = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.7, 12), darkAnodizedMat);
    lgaMast.position.y = 0.35;
    lgaGroup.add(lgaMast);

    // Helical copper spiral coil rings
    for (let h = 0; h < 6; h++) {
      const ringGeo = new THREE.TorusGeometry(0.035, 0.005, 8, 20);
      ringGeo.rotateX(Math.PI / 2 + 0.15);
      const ringMesh = new THREE.Mesh(ringGeo, copperGoldMat);
      ringMesh.position.y = 0.25 + h * 0.07;
      lgaGroup.add(ringMesh);
    }

    this.chassisGroup.add(lgaGroup);

    // 3. Remote Sensing Mast (RSM) - Articulated Camera & Spectrometer Mast
    const mastBase = new THREE.Group();
    mastBase.position.set(-0.46, 0.68, 0.68);

    // Lattice tubular mast pole with structural bracket
    const mastLowerTube = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 0.55, 16), titaniumMat);
    mastLowerTube.position.y = 0.275;
    mastLowerTube.castShadow = true;
    mastBase.add(mastLowerTube);

    const mastCollar = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.08, 16), darkAnodizedMat);
    mastCollar.position.y = 0.55;
    mastBase.add(mastCollar);

    const mastUpperTube = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.045, 0.55, 16), titaniumMat);
    mastUpperTube.position.y = 0.825;
    mastUpperTube.castShadow = true;
    mastBase.add(mastUpperTube);

    this.mastHead = new THREE.Group();
    this.mastHead.position.y = 1.12;

    // Pan/Tilt Mast Head Housing (SuperCam / ChemCam unit)
    const headBoxGeo = new THREE.BoxGeometry(0.32, 0.2, 0.24);
    const headBox = new THREE.Mesh(headBoxGeo, chassisWhiteMat);
    headBox.castShadow = true;
    this.mastHead.add(headBox);

    // SuperCam Circular Laser Telescope Aperture
    const chemCamTube = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.16, 24), darkAnodizedMat);
    chemCamTube.rotateX(Math.PI / 2);
    chemCamTube.position.set(0, 0.03, 0.12);
    this.mastHead.add(chemCamTube);

    this.chemCamAperture = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.17, 24), opticalLensMat);
    this.chemCamAperture.rotateX(Math.PI / 2);
    this.chemCamAperture.position.set(0, 0.03, 0.12);
    this.mastHead.add(this.chemCamAperture);

    // Dual Stereo Mastcam-Z Zoom Camera Lenses with sunshades
    [-0.1, 0.1].forEach(xOff => {
      const mastcamShade = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.09, 16), titaniumMat);
      mastcamShade.rotateX(Math.PI / 2);
      mastcamShade.position.set(xOff, -0.04, 0.13);
      this.mastHead.add(mastcamShade);

      const mastcamGlass = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.1, 12), opticalLensMat);
      mastcamGlass.rotateX(Math.PI / 2);
      mastcamGlass.position.set(xOff, -0.04, 0.13);
      this.mastHead.add(mastcamGlass);
    });

    // Dual Navcam Engineering Stereo Lenses
    [-0.13, 0.13].forEach(xOff => {
      const navcamEye = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.05, 12), darkAnodizedMat);
      navcamEye.rotateX(Math.PI / 2);
      navcamEye.position.set(xOff, 0.07, 0.12);
      this.mastHead.add(navcamEye);
    });

    // Environmental Sensor Wind Boom (MEDA boom)
    const medaBoom = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.28, 8), titaniumMat);
    medaBoom.rotateZ(Math.PI / 2);
    medaBoom.position.set(0.22, 0.04, 0);
    this.mastHead.add(medaBoom);

    // Mastcam perspective anchor (First-person camera position)
    this.mastCamMount = new THREE.Group();
    this.mastCamMount.position.set(0, 0, 0.18);
    this.mastHead.add(this.mastCamMount);

    mastBase.add(this.mastHead);
    this.chassisGroup.add(mastBase);

    // 4. 5-DOF Articulated Robotic Arm (Instrument Deployment Arm)
    const armRoot = new THREE.Group();
    armRoot.position.set(0.42, 0.52, 0.95); // Front-right corner of chassis

    // Joint 1: Shoulder Azimuth (Yaw)
    this.armBase = new THREE.Group();
    const shoulderSwivel = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.095, 0.14, 16), darkAnodizedMat);
    this.armBase.add(shoulderSwivel);
    armRoot.add(this.armBase);

    // Joint 2: Shoulder Elevation (Pitch) with hydraulic actuator cylinder
    this.armUpper = new THREE.Group();
    this.armUpper.position.set(0, 0.07, 0);

    const shoulderHinge = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.12, 16), titaniumMat);
    shoulderHinge.rotateZ(Math.PI / 2);
    this.armUpper.add(shoulderHinge);

    const upperBoomGeo = new THREE.CylinderGeometry(0.045, 0.05, 0.68, 16);
    upperBoomGeo.translate(0, 0.34, 0);
    const upperBoom = new THREE.Mesh(upperBoomGeo, titaniumMat);
    upperBoom.castShadow = true;
    this.armUpper.add(upperBoom);

    // Actuator cylinder
    const actuatorCyl = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.35, 12), darkAnodizedMat);
    actuatorCyl.position.set(0.05, 0.2, 0.04);
    this.armUpper.add(actuatorCyl);

    this.armBase.add(this.armUpper);

    // Joint 3: Elbow Joint
    this.armForearm = new THREE.Group();
    this.armForearm.position.set(0, 0.68, 0);

    const elbowHinge = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.11, 16), darkAnodizedMat);
    elbowHinge.rotateZ(Math.PI / 2);
    this.armForearm.add(elbowHinge);

    const foreBoomGeo = new THREE.CylinderGeometry(0.04, 0.045, 0.58, 16);
    foreBoomGeo.translate(0, 0.29, 0);
    const foreBoom = new THREE.Mesh(foreBoomGeo, titaniumMat);
    foreBoom.castShadow = true;
    this.armForearm.add(foreBoom);

    this.armUpper.add(this.armForearm);

    // Joint 4 & 5: Wrist Pitch and Rotary Instrument Turret
    this.armWrist = new THREE.Group();
    this.armWrist.position.set(0, 0.58, 0);

    const wristHinge = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.09, 12), darkAnodizedMat);
    wristHinge.rotateZ(Math.PI / 2);
    this.armWrist.add(wristHinge);

    this.armTurret = new THREE.Group();
    this.armTurret.position.set(0, 0.06, 0);

    // Hexagonal Instrument Turret Body
    const turretBoxGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.16, 6);
    turretBoxGeo.rotateX(Math.PI / 2);
    const turretBox = new THREE.Mesh(turretBoxGeo, darkAnodizedMat);
    turretBox.castShadow = true;
    this.armTurret.add(turretBox);

    // Scientific Instruments Mounted to Turret:
    // A. Percussive Coring Drill with Carbide Drill Bit
    const drillHsg = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 0.18, 16), titaniumMat);
    drillHsg.rotateX(Math.PI / 2);
    drillHsg.position.set(0.06, 0, 0.12);
    this.armTurret.add(drillHsg);

    const drillBitGeo = new THREE.CylinderGeometry(0.016, 0.006, 0.26, 12);
    drillBitGeo.rotateX(Math.PI / 2);
    drillBitGeo.translate(0, 0, 0.13);
    this.drillBit = new THREE.Mesh(drillBitGeo, darkAnodizedMat);
    this.armTurret.add(this.drillBit);

    // B. Alpha Particle X-Ray Spectrometer (APXS) Contact Sensor
    const apxsHsg = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.12, 16), chassisGoldKaptonMat);
    apxsHsg.rotateX(Math.PI / 2);
    apxsHsg.position.set(-0.06, 0, 0.11);
    this.armTurret.add(apxsHsg);

    // C. WATSON Microscopic Imager with circular LED illuminator ring
    const watsonHsg = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.1, 16), titaniumMat);
    watsonHsg.rotateX(Math.PI / 2);
    watsonHsg.position.set(0, 0.06, 0.11);
    this.armTurret.add(watsonHsg);

    const ledRingGeo = new THREE.TorusGeometry(0.025, 0.005, 8, 16);
    this.watsonLedRing = new THREE.Mesh(ledRingGeo, new THREE.MeshBasicMaterial({ color: 0xe0f2fe }));
    this.watsonLedRing.position.set(0, 0.06, 0.16);
    this.armTurret.add(this.watsonLedRing);

    // D. Dust Removal Tool (DRT) Wire Brush
    const drtHsg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.08, 12), titaniumMat);
    drtHsg.rotateX(Math.PI / 2);
    drtHsg.position.set(0, -0.06, 0.11);
    this.armTurret.add(drtHsg);

    this.armWrist.add(this.armTurret);
    this.armForearm.add(this.armWrist);
    this.chassisGroup.add(armRoot);

    // Stowed robotic arm pose
    this.setArmPose(0, -1.2, 2.4, -1.2);

    this.group.add(this.chassisGroup);

    // 5. Rocker-Bogie Suspension Wishbone Arms
    // Left & Right mechanical rocker linkages connecting chassis pivot to wheel hubs
    this.rockerArmLeft = this.createRockerBogieAssembly(false, titaniumMat, darkAnodizedMat);
    this.rockerArmRight = this.createRockerBogieAssembly(true, titaniumMat, darkAnodizedMat);
    this.chassisGroup.add(this.rockerArmLeft);
    this.chassisGroup.add(this.rockerArmRight);

    // 6. Build 4 High-Poly Engineered Wheels (FL, FR, RL, RR)
    const wheelHalfTrack = 1.08;
    const wheelHalfBase = 0.98;

    const wheelOffsets = [
      new THREE.Vector3(-wheelHalfTrack, 0, wheelHalfBase),  // FL (0)
      new THREE.Vector3(wheelHalfTrack, 0, wheelHalfBase),   // FR (1)
      new THREE.Vector3(-wheelHalfTrack, 0, -wheelHalfBase), // RL (2)
      new THREE.Vector3(wheelHalfTrack, 0, -wheelHalfBase),  // RR (3)
    ];

    for (let i = 0; i < 4; i++) {
      const wheelGroup = new THREE.Group();
      wheelGroup.name = `Wheel_${i}`;

      const { wheelMesh, treadMesh } = this.createHighPolyWheelAssembly(i % 2 === 1);
      wheelGroup.add(wheelMesh);
      this.wheelTreads.push(treadMesh);

      wheelGroup.position.copy(wheelOffsets[i]);
      this.wheels.push(wheelGroup);
      this.group.add(wheelGroup);
    }
  }

  private createRockerBogieAssembly(
    isRight: boolean,
    metalMat: THREE.Material,
    darkMat: THREE.Material
  ): THREE.Group {
    const assembly = new THREE.Group();
    const sign = isRight ? 1 : -1;
    assembly.position.set(sign * 0.72, 0.35, 0);

    // Main Rocker Differential Pivot Pin
    const pivotPin = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.16, 16), darkMat);
    pivotPin.rotateZ(Math.PI / 2);
    assembly.add(pivotPin);

    // Forward Rocker Tube extending to front wheel
    const fwdTubeCurve = new THREE.LineCurve3(
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(sign * 0.28, -0.15, 0.9)
    );
    const fwdTube = new THREE.Mesh(new THREE.TubeGeometry(fwdTubeCurve, 12, 0.038, 12, false), metalMat);
    fwdTube.castShadow = true;
    assembly.add(fwdTube);

    // Rear Bogie Tube extending to rear wheel
    const aftTubeCurve = new THREE.LineCurve3(
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(sign * 0.28, -0.15, -0.9)
    );
    const aftTube = new THREE.Mesh(new THREE.TubeGeometry(aftTubeCurve, 12, 0.038, 12, false), metalMat);
    aftTube.castShadow = true;
    assembly.add(aftTube);

    // Steering Knuckle Actuator Housings above front and rear wheel hubs
    [0.9, -0.9].forEach(zOff => {
      const servoHsg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.18, 16), darkMat);
      servoHsg.position.set(sign * 0.28, -0.06, zOff);
      assembly.add(servoHsg);
    });

    return assembly;
  }

  private createHighPolyWheelAssembly(isRight: boolean): { wheelMesh: THREE.Group; treadMesh: THREE.Mesh } {
    const assembly = new THREE.Group();

    const wheelAluminumMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      roughness: 0.32,
      metalness: 0.88,
    });

    const tireBlackMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.55,
      metalness: 0.72,
    });

    const hubGoldMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      roughness: 0.28,
      metalness: 0.85,
    });

    const tireRadius = 0.38;
    const tireWidth = 0.30;

    // 1. 32-Segment Outer Wheel Cylinder (High polygon smoothness)
    const tireGeo = new THREE.CylinderGeometry(tireRadius, tireRadius, tireWidth, 32);
    tireGeo.rotateZ(Math.PI / 2);
    const tireMesh = new THREE.Mesh(tireGeo, tireBlackMat);
    tireMesh.castShadow = true;
    tireMesh.receiveShadow = true;
    assembly.add(tireMesh);

    // 2. Machined Aluminum Wheel Rim
    const rimGeo = new THREE.CylinderGeometry(tireRadius * 0.78, tireRadius * 0.78, tireWidth * 1.04, 32);
    rimGeo.rotateZ(Math.PI / 2);
    const rimMesh = new THREE.Mesh(rimGeo, wheelAluminumMat);
    assembly.add(rimMesh);

    // 3. Central Drive Motor Canister
    const hubGeo = new THREE.CylinderGeometry(0.11, 0.11, tireWidth * 1.18, 20);
    hubGeo.rotateZ(Math.PI / 2);
    const hubMesh = new THREE.Mesh(hubGeo, hubGoldMat);
    assembly.add(hubMesh);

    // 4. 6 Signature Spiral Flexure Spokes (Curved spring spokes)
    for (let s = 0; s < 6; s++) {
      const baseAngle = (s * Math.PI) / 3;
      const spokeCurve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(0, Math.cos(baseAngle) * 0.11, Math.sin(baseAngle) * 0.11),
        new THREE.Vector3(0, Math.cos(baseAngle + 0.5) * 0.22, Math.sin(baseAngle + 0.5) * 0.22),
        new THREE.Vector3(0, Math.cos(baseAngle + 0.25) * (tireRadius * 0.76), Math.sin(baseAngle + 0.25) * (tireRadius * 0.76))
      );
      const spokeGeo = new THREE.TubeGeometry(spokeCurve, 12, 0.012, 8, false);
      const spokeMesh = new THREE.Mesh(spokeGeo, wheelAluminumMat);
      assembly.add(spokeMesh);
    }

    // 5. 24 Machined Chevron Wave Traction Grousers
    for (let g = 0; g < 24; g++) {
      const gAngle = (g * Math.PI * 2) / 24;
      const grouserGeo = new THREE.BoxGeometry(0.02, 0.024, tireWidth * 0.94);
      const grouser = new THREE.Mesh(grouserGeo, wheelAluminumMat);
      grouser.position.set(
        0,
        Math.cos(gAngle) * (tireRadius + 0.01),
        Math.sin(gAngle) * (tireRadius + 0.01)
      );
      grouser.rotation.x = gAngle + (isRight ? 0.22 : -0.22);
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
    let tAzimuth = 0;
    let tShoulder = -1.2;
    let tElbow = 2.4;
    let tWrist = -1.2;
    let tTurretRoll = 0;

    if (targetMode === 'deployed') {
      tAzimuth = 0.45;
      tShoulder = 0.35;
      tElbow = 0.55;
      tWrist = 0.4;
      tTurretRoll = 0;
    } else if (targetMode === 'drilling') {
      tAzimuth = 0.3;
      tShoulder = 0.65;
      tElbow = 0.7;
      tWrist = 0.55;
      tTurretRoll = Math.PI; // Rotate turret to bring drill bit into contact position
    }

    const speed = 2.6;
    this.armJointAngles.azimuth += (tAzimuth - this.armJointAngles.azimuth) * speed * dt;
    this.armJointAngles.shoulder += (tShoulder - this.armJointAngles.shoulder) * speed * dt;
    this.armJointAngles.elbow += (tElbow - this.armJointAngles.elbow) * speed * dt;
    this.armJointAngles.wrist += (tWrist - this.armJointAngles.wrist) * speed * dt;
    this.armJointAngles.turretRoll += (tTurretRoll - this.armJointAngles.turretRoll) * speed * dt;

    this.armBase.rotation.y = this.armJointAngles.azimuth;
    this.armUpper.rotation.x = this.armJointAngles.shoulder;
    this.armForearm.rotation.x = this.armJointAngles.elbow;
    this.armWrist.rotation.x = this.armJointAngles.wrist;
    this.armTurret.rotation.z = this.armJointAngles.turretRoll;

    if (this.isDrilling) {
      this.drillBit.rotation.z += 40 * dt;
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
