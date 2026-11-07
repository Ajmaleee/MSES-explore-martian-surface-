/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { getTerrainHeight } from './terrainNoise';

export class LanderModule {
  public group: THREE.Group;
  public rampGroup: THREE.Group;
  public leftPetal: THREE.Group;
  public rightPetal: THREE.Group;
  public rearPetal: THREE.Group;

  public deployProgress = 0; // 0 = closed, 1 = fully open and ramps down
  public isDeploying = false;
  public isDeployed = false;

  public physicsBodies: CANNON.Body[] = [];

  constructor(scene: THREE.Scene, world: CANNON.World) {
    this.group = new THREE.Group();
    this.group.name = 'LanderModuleGroup';

    // Base position at origin on leveled terrain
    const groundY = getTerrainHeight(0, 0);
    this.group.position.set(0, groundY, 0);

    // Materials
    const goldKaptonMat = new THREE.MeshStandardMaterial({
      color: 0xdaa520,
      roughness: 0.25,
      metalness: 0.85,
    });

    const landerFrameMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.45,
      metalness: 0.7,
    });

    const darkMetalMat = new THREE.MeshStandardMaterial({
      color: 0x2d3748,
      roughness: 0.6,
      metalness: 0.8,
    });

    const rampMat = new THREE.MeshStandardMaterial({
      color: 0x718096,
      roughness: 0.7,
      metalness: 0.65,
    });

    // 1. Hexagonal Main Landing Deck
    const deckGeo = new THREE.CylinderGeometry(3.6, 3.8, 0.4, 6);
    const deckMesh = new THREE.Mesh(deckGeo, landerFrameMat);
    deckMesh.position.y = 0.6;
    deckMesh.castShadow = true;
    deckMesh.receiveShadow = true;
    this.group.add(deckMesh);

    // Deck gold insulation wrap under-belly
    const foilGeo = new THREE.CylinderGeometry(3.7, 2.8, 0.35, 6);
    const foilMesh = new THREE.Mesh(foilGeo, goldKaptonMat);
    foilMesh.position.y = 0.3;
    foilMesh.castShadow = true;
    this.group.add(foilMesh);

    // 2. 3 Shock-absorbing landing legs & crushable footpads
    for (let i = 0; i < 3; i++) {
      const angle = (i * Math.PI * 2) / 3 + Math.PI / 6;
      const legGroup = new THREE.Group();
      legGroup.rotation.y = angle;

      // Primary strut
      const strutGeo = new THREE.CylinderGeometry(0.08, 0.08, 2.2, 8);
      const strutMesh = new THREE.Mesh(strutGeo, darkMetalMat);
      strutMesh.position.set(2.8, 0.3, 0);
      strutMesh.rotation.z = Math.PI / 4.2;
      strutMesh.castShadow = true;
      legGroup.add(strutMesh);

      // Footpad
      const padGeo = new THREE.CylinderGeometry(0.5, 0.6, 0.12, 12);
      const padMesh = new THREE.Mesh(padGeo, goldKaptonMat);
      padMesh.position.set(3.7, -0.25, 0);
      padMesh.castShadow = true;
      padMesh.receiveShadow = true;
      legGroup.add(padMesh);

      this.group.add(legGroup);
    }

    // 3. Descent Thrusters (4 clustered monopropellant rockets)
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2 + Math.PI / 4;
      const thruster = new THREE.Group();
      thruster.position.set(Math.cos(angle) * 2.6, 0.4, Math.sin(angle) * 2.6);

      const nozzleGeo = new THREE.ConeGeometry(0.22, 0.45, 12, 1, true);
      nozzleGeo.rotateX(Math.PI);
      const nozzleMesh = new THREE.Mesh(nozzleGeo, darkMetalMat);
      thruster.add(nozzleMesh);
      this.group.add(thruster);
    }

    // 4. Clamshell Protective Petals (3 folding petals)
    this.leftPetal = this.createPetal(landerFrameMat, goldKaptonMat);
    this.leftPetal.position.set(-2.4, 0.8, 0);
    this.leftPetal.rotation.z = -Math.PI / 2.3; // initially closed over rover
    this.group.add(this.leftPetal);

    this.rightPetal = this.createPetal(landerFrameMat, goldKaptonMat);
    this.rightPetal.position.set(2.4, 0.8, 0);
    this.rightPetal.rotation.z = Math.PI / 2.3;
    this.group.add(this.rightPetal);

    this.rearPetal = this.createPetal(landerFrameMat, goldKaptonMat);
    this.rearPetal.position.set(0, 0.8, -2.4);
    this.rearPetal.rotation.x = -Math.PI / 2.3;
    this.group.add(this.rearPetal);

    // 5. Deployable Forward Ramp (spacious 2.8m width for 820kg rover)
    this.rampGroup = new THREE.Group();
    this.rampGroup.position.set(0, 0.78, 2.8); // Hinge location at front edge of deck

    const rampGeo = new THREE.BoxGeometry(2.8, 0.08, 4.2);
    // Offset ramp geometry so pivot is at top edge
    rampGeo.translate(0, 0, 2.1);

    const rampMesh = new THREE.Mesh(rampGeo, rampMat);
    rampMesh.castShadow = true;
    rampMesh.receiveShadow = true;
    this.rampGroup.add(rampMesh);

    // Ramp traction slats
    for (let s = 0.3; s < 4.0; s += 0.35) {
      const slatGeo = new THREE.BoxGeometry(2.6, 0.04, 0.06);
      const slatMesh = new THREE.Mesh(slatGeo, darkMetalMat);
      slatMesh.position.set(0, 0.06, s);
      this.rampGroup.add(slatMesh);
    }

    // Ramp starts upright/locked (0 = upright folded, deployed = sloped down to ground)
    this.rampGroup.rotation.x = -Math.PI / 2.2;
    this.group.add(this.rampGroup);

    scene.add(this.group);

    // 6. Physics bodies for the Lander deck and Ramp
    this.setupPhysics(world, groundY);
  }

  private createPetal(outerMat: THREE.Material, innerMat: THREE.Material): THREE.Group {
    const petal = new THREE.Group();
    // Curved aerodynamic aeroshell shield segment instead of squarish box
    const shape = new THREE.CylinderGeometry(2.8, 2.8, 2.4, 16, 1, true, 0, Math.PI * 0.45);
    shape.translate(0, 1.2, 0);

    const outerMesh = new THREE.Mesh(shape, outerMat);
    outerMesh.castShadow = true;
    outerMesh.receiveShadow = true;
    petal.add(outerMesh);

    const innerFoilGeo = new THREE.CylinderGeometry(2.78, 2.78, 2.3, 16, 1, true, 0, Math.PI * 0.45);
    innerFoilGeo.translate(0, 1.2, 0.02);
    const innerFoil = new THREE.Mesh(innerFoilGeo, innerMat);
    petal.add(innerFoil);

    return petal;
  }

  private setupPhysics(world: CANNON.World, groundY: number) {
    // Deck body (static platform cylinder / box)
    const deckBody = new CANNON.Body({
      mass: 0, // static
      position: new CANNON.Vec3(0, groundY + 0.6, 0),
      shape: new CANNON.Cylinder(3.6, 3.8, 0.4, 8),
    });
    world.addBody(deckBody);
    this.physicsBodies.push(deckBody);

    // Ramp body - sloped ramp down to Martian soil
    const rampLength = 4.2;
    const rampAngle = 0.20; // ~11.5 degrees down slope
    const rampBody = new CANNON.Body({
      mass: 0,
      position: new CANNON.Vec3(0, groundY + 0.38, 4.6),
      shape: new CANNON.Box(new CANNON.Vec3(1.4, 0.06, rampLength * 0.5)),
    });
    rampBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), rampAngle);
    world.addBody(rampBody);
    this.physicsBodies.push(rampBody);
  }

  public startDeployment() {
    if (this.isDeployed || this.isDeploying) return;
    this.isDeploying = true;
  }

  public update(dt: number) {
    if (this.isDeploying && !this.isDeployed) {
      this.deployProgress += dt * 0.45; // ~2.2 seconds to open
      if (this.deployProgress >= 1.0) {
        this.deployProgress = 1.0;
        this.isDeploying = false;
        this.isDeployed = true;
      }

      const p = this.deployProgress;
      // Smooth easing
      const ease = p * p * (3 - 2 * p);

      // Open clamshell petals
      this.leftPetal.rotation.z = -Math.PI / 2.3 + ease * (Math.PI / 2.3 + 0.3);
      this.rightPetal.rotation.z = Math.PI / 2.3 - ease * (Math.PI / 2.3 + 0.3);
      this.rearPetal.rotation.x = -Math.PI / 2.3 + ease * (Math.PI / 2.3 + 0.3);

      // Lower ramp down to ground
      const rampStart = -Math.PI / 2.2;
      const rampEnd = 0.22; // angle matching ground contact
      this.rampGroup.rotation.x = rampStart + ease * (rampEnd - rampStart);
    }
  }

  public reset() {
    this.deployProgress = 0;
    this.isDeploying = false;
    this.isDeployed = false;
    this.leftPetal.rotation.z = -Math.PI / 2.3;
    this.rightPetal.rotation.z = Math.PI / 2.3;
    this.rearPetal.rotation.x = -Math.PI / 2.3;
    this.rampGroup.rotation.x = -Math.PI / 2.2;
  }

  public dispose(world: CANNON.World) {
    this.physicsBodies.forEach(b => world.removeBody(b));
  }
}
