import {Injectable} from '@angular/core';
import * as BABYLON from 'babylonjs';
import {ColorEvent} from 'ngx-color';

import {BabylonService} from '../babylon/babylon.service';
import {CameraService} from '../camera/camera.service';
import {LoadModelService} from '../load-model/load-model.service';

@Injectable({
  providedIn: 'root',
})
export class ModelsettingsService {

  public actualModelMeshes: BABYLON.Mesh[];
  public showBoundingBoxMeshes = false;
  private min = new BABYLON.Vector3(Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE);
  private max = new BABYLON.Vector3(Number.MAX_VALUE * -1, Number.MAX_VALUE * -1, Number.MAX_VALUE * -1);
  private initialSize: BABYLON.Vector3;

  private center: BABYLON.Mesh;
  public rotationX = 0;
  private lastRotationX = 0;
  public rotationY = 0;
  private lastRotationY = 0;
  public rotationZ = 0;
  private lastRotationZ = 0;
  public scalingFactor = 1;

  private boundingBox: BABYLON.Mesh;
  public showBoundingBoxModel = false;
  public height;
  public width;
  public depth;
  private lastHeight;
  private lastWidth;
  private lastDepth;

  private ground: BABYLON.Mesh;
  public showGround = false;
  public scalingFactorGround = 1;

  public showLocalAxis = false;
  public showWorldAxis = false;

  public scalingFactorLocalAxis = 1;
  public scalingFactorWorldAxis = 1;

  private rotQuat = new BABYLON.Quaternion();

  constructor(private babylonService: BabylonService,
              private cameraService: CameraService,
              private loadModelService: LoadModelService) {

    this.loadModelService.Observables.actualModelMeshes.subscribe(actualModelMeshes => {
      this.actualModelMeshes = actualModelMeshes;
    });
  }

  /*
  *
  *   Load Settings for actual Model
  *
   */

  public async loadSettings(scalingFactor, rotX, rotY, rotZ) {
    this.scalingFactor = scalingFactor;
    await this.initializeVariablesforLoading();
    await this.generateHelpers();
    await this.setSettings(scalingFactor, rotX, rotY, rotZ);
  }

  private async initializeVariablesforLoading() {
    this.min = BABYLON.Vector3.Zero();
    this.max = BABYLON.Vector3.Zero();
    this.initialSize = BABYLON.Vector3.Zero();

    this.lastRotationX = 0;
    this.lastRotationY = 0;
    this.lastRotationZ = 0;

    this.height = 0;
    this.width = 0;
    this.depth = 0;
    this.lastHeight = 0;
    this.lastWidth = 0;
    this.lastDepth = 0;

    for (let _i = 0; _i < this.actualModelMeshes.length; _i++) {
      const mesh = this.actualModelMeshes[_i];
      this.getMinMax(mesh, true);
    }
  }

  private async generateHelpers() {
    await this.createCenter();
    this.initialSize = await this.max.subtract(this.min);
    this.height = this.initialSize.y.toFixed(2);
    this.width = this.initialSize.x.toFixed(2);
    this.depth = this.initialSize.z.toFixed(2);
    this.lastHeight = this.initialSize.y;
    this.lastWidth = this.initialSize.x;
    this.lastDepth = this.initialSize.z;

    this.cameraService.setUpperRadiusLimit(Math.max(this.max.x, this.max.y, this.max.z) * this.scalingFactor * 5);
    this.cameraService.setDefaultPosition(2.7, 1.3, Math.max(this.max.x, this.max.y, this.max.z) + 50, 0, 0, 0);
  }

  private async setSettings(scalingFactor, rotX, rotY, rotZ) {
    await this.loadScalingFactor(scalingFactor);
    await this.loadRotation(this.center, rotX, rotY, rotZ);
    await this.decomposeAfterLoading();
  }

  private loadScalingFactor(factor: number) {
    this.scalingFactor = factor;
    this.center.scaling = new BABYLON.Vector3(factor, factor, factor);
  }

  private loadRotation(mesh, rotX, rotY, rotZ) {

    // Math.PI / 2 -> 90 Grad

    const axisX = BABYLON.Axis['X'];
    const axisY = BABYLON.Axis['Y'];
    const axisZ = BABYLON.Axis['Z'];

    if (!mesh.rotationQuaternion) {
      mesh.rotationQuaternion = BABYLON.Quaternion.RotationYawPitchRoll(0, 0, 0);
    }

    const rotationQuaternionX = BABYLON.Quaternion.RotationAxis(axisX, Math.PI / 180 * rotX);
    let end = rotationQuaternionX.multiply(mesh.rotationQuaternion);

    const rotationQuaternionY = BABYLON.Quaternion.RotationAxis(axisY, Math.PI / 180 * rotY);
    end = rotationQuaternionY.multiply(end);

    const rotationQuaternionZ = BABYLON.Quaternion.RotationAxis(axisZ, Math.PI / 180 * rotZ);
    end = rotationQuaternionZ.multiply(end);

    // Important for unparenting
    this.rotQuat = end;

    mesh.rotationQuaternion = end;
  }

  public async decomposeAfterLoading() {
    await this.unparentModel();
    await this.destroyCenter();
  }

  private async unparentModel() {

    for (let _i = 0; _i < this.actualModelMeshes.length; _i++) {

      const mesh = this.actualModelMeshes[_i];

      this.center.computeWorldMatrix();
      mesh.computeWorldMatrix();

      const abs = mesh.absolutePosition;

      if (!mesh.rotationQuaternion) {
        mesh.rotationQuaternion = BABYLON.Quaternion.RotationYawPitchRoll(mesh.rotation.y, mesh.rotation.x, mesh.rotation.z);
      }
      mesh.parent = null;
      mesh.position = abs;

      const meshRotation = mesh.rotationQuaternion;
      mesh.rotationQuaternion = this.rotQuat.multiply(meshRotation);

      mesh.scaling.x *= this.center.scaling.x;
      mesh.scaling.y *= this.center.scaling.y;
      mesh.scaling.z *= this.center.scaling.z;
    }
  }

  /*
   * Set Settings during Upload
   */

  public async createVisualSettings() {
    this.initializeVariablesforSettings();
    await this.generateHelpers();

    this.createBoundingBox();
    this.showBoundingBoxModel = false;
    this.boundingBox.visibility = 0;
    this.createWorldAxis(18);
    this.showWorldAxis = false;
    this.babylonService.getScene().getMeshesByTags('worldAxis').map(mesh => mesh.visibility = 0);
    this.createlocalAxes(12);
    this.showLocalAxis = false;
    this.babylonService.getScene().getMeshesByTags('localAxis').map(mesh => mesh.visibility = 0);
    this.createGround(20);
    this.showGround = false;
    this.babylonService.getScene().getMeshesByTags('ground').map(mesh => mesh.visibility = 0);

  }

  public resetVisualSettingsHelper() {
    this.showBoundingBoxModel = false;
    this.boundingBox.visibility = 0;

    this.showBoundingBoxMeshes = false;
    for (let _i = 0; _i < this.actualModelMeshes.length; _i++) {
      const mesh = this.actualModelMeshes[_i];
      mesh.showBoundingBox = false;
    }

    this.showWorldAxis = false;
    this.babylonService.getScene().getMeshesByTags('worldAxis').map(mesh => mesh.visibility = 0);
    this.scalingFactorWorldAxis = 1;
    const postemp = 1 * 0.9 * 18;
    this.babylonService.getScene().getMeshesByTags('worldAxis').map(
      mesh => mesh.scaling = new BABYLON.Vector3(1, 1, 1));
    this.babylonService.getScene().getMeshesByTags('worldAxisX').map(
      mesh => mesh.position = new BABYLON.Vector3(0.9 * postemp, -0.05 * postemp, 0));
    this.babylonService.getScene().getMeshesByTags('worldAxisY').map(
      mesh => mesh.position = new BABYLON.Vector3(0, 0.9 * postemp, -0.05 * postemp));
    this.babylonService.getScene().getMeshesByTags('worldAxisZ').map(
      mesh => mesh.position = new BABYLON.Vector3(0, 0.05 * postemp, 0.9 * postemp));

    this.showLocalAxis = false;
    this.babylonService.getScene().getMeshesByTags('localAxis').map(mesh => mesh.visibility = 0);
    this.scalingFactorLocalAxis = 1;
    const posxz = 1 * 0.9 * 12;
    this.babylonService.getScene().getMeshesByTags('localAxis').map(
      mesh => mesh.scaling = new BABYLON.Vector3(1, 1, 1));
    this.babylonService.getScene().getMeshesByTags('localAxisX').map(
      mesh => mesh.position = new BABYLON.Vector3(0.9 * posxz, -0.05 * posxz, 0));
    this.babylonService.getScene().getMeshesByTags('localAxisY').map(
      mesh => mesh.position = new BABYLON.Vector3(0, 0.9 * posxz, -0.05 * posxz));
    this.babylonService.getScene().getMeshesByTags('localAxisZ').map(
      mesh => mesh.position = new BABYLON.Vector3(0, 0.05 * posxz, 0.9 * posxz));

    this.showGround = false;
    this.babylonService.getScene().getMeshesByTags('ground').map(mesh => mesh.visibility = 0);
    this.scalingFactorGround = 1;
    this.ground.scaling = new BABYLON.Vector3(1, 1, 1);
    const material = new BABYLON.StandardMaterial('GroundPlaneMaterial', this.babylonService.getScene());
    material.diffuseColor = new BABYLON.Color3(255 / 255, 255 / 255, 255 / 255);
    this.ground.material = material;
  }

  public resetMeshSize() {

    this.scalingFactor = 1;
    this.center.scaling = new BABYLON.Vector3(1, 1, 1);

    this.height = this.initialSize.y.toFixed(2);
    this.width = this.initialSize.x.toFixed(2);
    this.depth = this.initialSize.z.toFixed(2);
  }

  public resetMeshRotation() {
    this.rotationX = 0;
    this.lastRotationX = 0;
    this.rotationY = 0;
    this.lastRotationY = 0;
    this.rotationZ = 0;
    this.lastRotationZ = 0;

    if (!this.center.rotationQuaternion) {
      this.center.rotationQuaternion = BABYLON.Quaternion.RotationYawPitchRoll(0, 0, 0);
    }

    const start = this.center.rotationQuaternion;

    const end = BABYLON.Quaternion.RotationYawPitchRoll(0, 0, 0);
    const anim = new BABYLON.Animation('anim', 'rotationQuaternion',
      120, BABYLON.Animation.ANIMATIONTYPE_QUATERNION, BABYLON.Animation.ANIMATIONLOOPMODE_RELATIVE);
    const frame = [{frame: 0, value: start},
      {frame: 100, value: end}];
    anim.setKeys(frame);
    this.center.animations = [];
    this.center.animations.push(anim);
    this.babylonService.getScene().beginAnimation(this.center, 0, 100, false);

  }

  public async decomposeAfterSetting() {
    if (this.center) {
      this.cameraService.setUpperRadiusLimit(Math.max(this.max.x, this.max.y, this.max.z) * this.scalingFactor * 5);

      for (let _i = 0; _i < this.actualModelMeshes.length; _i++) {
        const mesh = this.actualModelMeshes[_i];
        mesh.parent = null;
      }

      await this.destroyCenter();
      await this.destroyBoundingBox();
      await this.destroyWorldAxis();
      await this.destroyLocalAxis();
      await this.destroyGround();
    }
  }

  private initializeVariablesforSettings() {
    this.min = BABYLON.Vector3.Zero();
    this.max = BABYLON.Vector3.Zero();
    this.initialSize = BABYLON.Vector3.Zero();
    this.showBoundingBoxMeshes = false;

    this.rotationX = 0;
    this.lastRotationX = 0;
    this.rotationY = 0;
    this.lastRotationY = 0;
    this.rotationZ = 0;
    this.lastRotationZ = 0;
    this.scalingFactor = 1;

    this.height = 0;
    this.width = 0;
    this.depth = 0;
    this.lastHeight = 0;
    this.lastWidth = 0;
    this.lastDepth = 0;

    this.showBoundingBoxModel = false;

    this.showGround = false;
    this.scalingFactorGround = 1;

    this.showLocalAxis = false;
    this.showWorldAxis = false;

    this.scalingFactorLocalAxis = 1;
    this.scalingFactorWorldAxis = 1;

    for (let _i = 0; _i < this.actualModelMeshes.length; _i++) {
      const mesh = this.actualModelMeshes[_i];
      this.getMinMax(mesh, true);
    }

  }

  private getMinMax(mesh, computeWorldMatrix) {

    if (computeWorldMatrix) {
      mesh.computeWorldMatrix(true);
    }

    const bi = mesh.getBoundingInfo();
    const minimum = bi.boundingBox.minimumWorld;
    const maximum = bi.boundingBox.maximumWorld;

    if (minimum.x < this.min.x) {
      this.min.x = minimum.x;
    }
    if (minimum.y < this.min.y) {
      this.min.y = minimum.y;
    }
    if (minimum.z < this.min.z) {
      this.min.z = minimum.z;
    }

    if (maximum.x > this.max.x) {
      this.max.x = maximum.x;
    }
    if (maximum.y > this.max.y) {
      this.max.y = maximum.y;
    }
    if (maximum.z > this.max.z) {
      this.max.z = maximum.z;
    }

  }

  private async createCenter() {
    this.center = BABYLON.MeshBuilder.CreateBox('center', {size: 1}, this.babylonService.getScene());
    BABYLON.Tags.AddTagsTo(this.center, 'center');
    this.center.isVisible = false;
    for (let _i = 0; _i < this.actualModelMeshes.length; _i++) {
      const mesh = this.actualModelMeshes[_i];
      mesh.parent = this.center;
    }
  }

  private destroyCenter() {
    this.babylonService.getScene().getMeshesByTags('center').map(mesh => mesh.dispose());
  }

  private createBoundingBox() {

    this.boundingBox = BABYLON.MeshBuilder.CreateBox('boundingBox', {
      width: this.initialSize.x, height: this.initialSize.y, depth: this.initialSize.z,
    }, this.babylonService.getScene());
    BABYLON.Tags.AddTagsTo(this.boundingBox, 'boundingBox');
    this.boundingBox.parent = this.center;

    this.boundingBox.material = new BABYLON.StandardMaterial('boundingBoxMat', this.babylonService.getScene());
    this.boundingBox.material.wireframe = true;
    this.showBoundingBoxModel = true;

    this.boundingBox.position.x = this.max.x - this.initialSize.x / 2;
    this.boundingBox.position.y = this.max.y - this.initialSize.y / 2;
    this.boundingBox.position.z = this.max.z - this.initialSize.z / 2;
  }

  public handleChangeBoundingBoxModel() {
    this.showBoundingBoxModel = (this.showBoundingBoxModel) ? false : true;
    if (this.showBoundingBoxModel) {
      this.boundingBox.visibility = 1;
    } else {
      this.boundingBox.visibility = 0;
    }
  }

  private destroyBoundingBox() {
    this.babylonService.getScene().getMeshesByTags('boundingBox').map(mesh => mesh.dispose());
    this.showBoundingBoxModel = false;
  }

  public handleChangeBoundingBoxMeshes() {
    this.showBoundingBoxMeshes = (this.showBoundingBoxMeshes) ? false : true;
    for (let _i = 0; _i < this.actualModelMeshes.length; _i++) {
      const mesh = this.actualModelMeshes[_i];
      mesh.showBoundingBox = this.showBoundingBoxMeshes;
    }
  }

  private createGround(size: number) {
    this.scalingFactorGround = 1;
    this.ground = BABYLON.MeshBuilder.CreateGround('ground', {height: size, width: size, subdivisions: 1},
      this.babylonService.getScene());
    BABYLON.Tags.AddTagsTo(this.ground, 'ground');
    this.showGround = true;
  }

  public setScalingFactorGround(event: any) {
    this.scalingFactorGround = event.value;
    this.ground.scaling = new BABYLON.Vector3(event.value, event.value, event.value);
  }

  public handleChangeColorGround($event: ColorEvent) {
    // color = {
    //   hex: '#333',
    //   rgb: {
    //     r: 51,
    //     g: 51,
    //     b: 51,
    //     a: 1,
    //   },
    //   hsl: {
    //     h: 0,
    //     s: 0,
    //     l: .20,
    //     a: 1,
    //   },
    // }
    const material = new BABYLON.StandardMaterial('GroundPlaneMaterial', this.babylonService.getScene());
    material.diffuseColor = new BABYLON.Color3($event.color.rgb.r / 255, $event.color.rgb.g / 255, $event.color.rgb.b / 255);
    this.ground.material = material;
  }

  public handleChangeGround() {
    this.showGround = (this.showGround) ? false : true;
    if (this.showGround) {
      this.babylonService.getScene().getMeshesByTags('ground').map(mesh => mesh.visibility = 1);
    } else {
      this.babylonService.getScene().getMeshesByTags('ground').map(mesh => mesh.visibility = 0);
    }
  }

  private destroyGround() {
    this.babylonService.getScene().getMeshesByTags('ground').map(mesh => mesh.dispose());
    this.showGround = false;
  }

  public createWorldAxis(size: number) {

    this.scalingFactorWorldAxis = 1;
    const sizeWorldAxis = size;

    const vecOneX = new BABYLON.Vector3(sizeWorldAxis, 0, 0);
    const vecTwoX = new BABYLON.Vector3(sizeWorldAxis * 0.95, 0.05 * sizeWorldAxis, 0);
    const vecThreeX = new BABYLON.Vector3(sizeWorldAxis, 0, 0);
    const vecFourX = new BABYLON.Vector3(sizeWorldAxis * 0.95, -0.05 * sizeWorldAxis, 0);
    const axisX = BABYLON.Mesh.CreateLines('axisX', [BABYLON.Vector3.Zero(), vecOneX, vecTwoX, vecThreeX, vecFourX],
      this.babylonService.getScene());
    BABYLON.Tags.AddTagsTo(axisX, 'worldAxis');
    axisX.color = new BABYLON.Color3(1, 0, 0);
    const xChar = this.createTextPlane('X', 'red', sizeWorldAxis / 10, 'worldAxis', 'worldAxisX');
    xChar.position = new BABYLON.Vector3(0.9 * sizeWorldAxis, -0.05 * sizeWorldAxis, 0);

    const vecOneY = new BABYLON.Vector3(0, sizeWorldAxis, 0);
    const vecTwoY = new BABYLON.Vector3(-0.05 * sizeWorldAxis, sizeWorldAxis * 0.95, 0);
    const vecThreeY = new BABYLON.Vector3(0, sizeWorldAxis, 0);
    const vecFourY = new BABYLON.Vector3(0.05 * sizeWorldAxis, sizeWorldAxis * 0.95, 0);
    const axisY = BABYLON.Mesh.CreateLines('axisY', [BABYLON.Vector3.Zero(), vecOneY, vecTwoY, vecThreeY, vecFourY],
      this.babylonService.getScene());
    BABYLON.Tags.AddTagsTo(axisY, 'worldAxis');
    axisY.color = new BABYLON.Color3(0, 1, 0);
    const yChar = this.createTextPlane('Y', 'green', sizeWorldAxis / 10, 'worldAxis', 'worldAxisY');
    yChar.position = new BABYLON.Vector3(0, 0.9 * sizeWorldAxis, -0.05 * sizeWorldAxis);

    const vecOneZ = new BABYLON.Vector3(0, 0, sizeWorldAxis);
    const vecTwoZ = new BABYLON.Vector3(0, -0.05 * sizeWorldAxis, sizeWorldAxis * 0.95);
    const vecThreeZ = new BABYLON.Vector3(0, 0, sizeWorldAxis);
    const vecFourZ = new BABYLON.Vector3(0, 0.05 * sizeWorldAxis, sizeWorldAxis * 0.95);
    const axisZ = BABYLON.Mesh.CreateLines('axisZ', [BABYLON.Vector3.Zero(), vecOneZ, vecTwoZ, vecThreeZ, vecFourZ],
      this.babylonService.getScene());
    BABYLON.Tags.AddTagsTo(axisZ, 'worldAxis');
    axisZ.color = new BABYLON.Color3(0, 0, 1);
    const zChar = this.createTextPlane('Z', 'blue', sizeWorldAxis / 10, 'worldAxis', 'worldAxisZ');
    zChar.position = new BABYLON.Vector3(0, 0.05 * sizeWorldAxis, 0.9 * sizeWorldAxis);

    this.showWorldAxis = true;
  }

  private createTextPlane(text, color, size, tag, tagIndividual) {
    const dynamicTexture = new BABYLON.DynamicTexture('DynamicTexture', 50, this.babylonService.getScene(), true);
    dynamicTexture.hasAlpha = true;
    dynamicTexture.drawText(text, 5, 40, 'bold 36px Arial', color, 'transparent', true);

    const plane = BABYLON.Mesh.CreatePlane(tag, size, this.babylonService.getScene(), true);
    BABYLON.Tags.AddTagsTo(plane, tag);
    BABYLON.Tags.AddTagsTo(plane, tagIndividual);

    const material = new BABYLON.StandardMaterial('TextPlaneMaterial', this.babylonService.getScene());
    material.backFaceCulling = false;
    material.specularColor = new BABYLON.Color3(0, 0, 0);
    material.diffuseTexture = dynamicTexture;
    plane.material = material;

    return plane;
  }

  public setScalingFactorWorldAxis(event: any) {
    this.scalingFactorWorldAxis = event.value;
    const pos = event.value * 0.9 * 18;
    this.babylonService.getScene().getMeshesByTags('worldAxis').map(
      mesh => mesh.scaling = new BABYLON.Vector3(event.value, event.value, event.value));
    this.babylonService.getScene().getMeshesByTags('worldAxisX').map(
      mesh => mesh.position = new BABYLON.Vector3(0.9 * pos, -0.05 * pos, 0));
    this.babylonService.getScene().getMeshesByTags('worldAxisY').map(
      mesh => mesh.position = new BABYLON.Vector3(0, 0.9 * pos, -0.05 * pos));
    this.babylonService.getScene().getMeshesByTags('worldAxisZ').map(
      mesh => mesh.position = new BABYLON.Vector3(0, 0.05 * pos, 0.9 * pos));
  }

  public handleChangeWorldAxis() {
    this.showWorldAxis = (this.showWorldAxis) ? false : true;
    if (this.showWorldAxis) {
      this.babylonService.getScene().getMeshesByTags('worldAxis').map(mesh => mesh.visibility = 1);
    } else {
      this.babylonService.getScene().getMeshesByTags('worldAxis').map(mesh => mesh.visibility = 0);
    }
  }

  private destroyWorldAxis() {
    this.babylonService.getScene().getMeshesByTags('worldAxis').map(mesh => mesh.dispose());
    this.showWorldAxis = false;
  }

  private createlocalAxes(size: number) {

    this.scalingFactorLocalAxis = 1;
    const sizeLocalAxis = size;

    const vecOneX = new BABYLON.Vector3(sizeLocalAxis, 0, 0);
    const vecTwoX = new BABYLON.Vector3(sizeLocalAxis * 0.95, 0.05 * sizeLocalAxis, 0);
    const vecThreeX = new BABYLON.Vector3(sizeLocalAxis, 0, 0);
    const vecFourX = new BABYLON.Vector3(sizeLocalAxis * 0.95, -0.05 * sizeLocalAxis, 0);
    const local_axisX = BABYLON.Mesh.CreateLines('local_axisX', [BABYLON.Vector3.Zero(), vecOneX, vecTwoX, vecThreeX, vecFourX],
      this.babylonService.getScene());
    BABYLON.Tags.AddTagsTo(local_axisX, 'localAxis');
    local_axisX.color = new BABYLON.Color3(1, 0, 0);
    const xChar = this.createTextPlane('X', 'red', sizeLocalAxis / 10, 'localAxis', 'localAxisX');
    xChar.position = new BABYLON.Vector3(0.9 * sizeLocalAxis, -0.05 * sizeLocalAxis, 0);

    const vecOneY = new BABYLON.Vector3(0, sizeLocalAxis, 0);
    const vecTwoY = new BABYLON.Vector3(-0.05 * sizeLocalAxis, sizeLocalAxis * 0.95, 0);
    const vecThreeY = new BABYLON.Vector3(0, sizeLocalAxis, 0);
    const vecFourY = new BABYLON.Vector3(0.05 * sizeLocalAxis, sizeLocalAxis * 0.95, 0);
    const local_axisY = BABYLON.Mesh.CreateLines('local_axisY', [BABYLON.Vector3.Zero(), vecOneY, vecTwoY, vecThreeY, vecFourY],
      this.babylonService.getScene());
    BABYLON.Tags.AddTagsTo(local_axisY, 'localAxis');
    local_axisY.color = new BABYLON.Color3(0, 1, 0);
    const yChar = this.createTextPlane('Y', 'green', sizeLocalAxis / 10, 'localAxis', 'localAxisY');
    yChar.position = new BABYLON.Vector3(0, 0.9 * sizeLocalAxis, -0.05 * sizeLocalAxis);

    const vecOneZ = new BABYLON.Vector3(0, 0, sizeLocalAxis);
    const vecTwoZ = new BABYLON.Vector3(0, -0.05 * sizeLocalAxis, sizeLocalAxis * 0.95);
    const vecThreeZ = new BABYLON.Vector3(0, 0, sizeLocalAxis);
    const vecFourZ = new BABYLON.Vector3(0, 0.05 * sizeLocalAxis, sizeLocalAxis * 0.95);
    const local_axisZ = BABYLON.Mesh.CreateLines('local_axisZ', [BABYLON.Vector3.Zero(), vecOneZ, vecTwoZ, vecThreeZ, vecFourZ],
      this.babylonService.getScene());
    BABYLON.Tags.AddTagsTo(local_axisZ, 'localAxis');
    local_axisZ.color = new BABYLON.Color3(0, 0, 1);
    const zChar = this.createTextPlane('Z', 'blue', sizeLocalAxis / 10, 'localAxis', 'localAxisZ');
    zChar.position = new BABYLON.Vector3(0, 0.05 * sizeLocalAxis, 0.9 * sizeLocalAxis);

    local_axisX.parent = this.center;
    xChar.parent = this.center;
    local_axisY.parent = this.center;
    yChar.parent = this.center;
    local_axisZ.parent = this.center;
    zChar.parent = this.center;

    this.showLocalAxis = true;

  }

  public setScalingFactorLocalAxis(event: any) {
    this.scalingFactorLocalAxis = event.value;
    const pos = event.value * 0.9 * 12;
    this.babylonService.getScene().getMeshesByTags('localAxis').map(
      mesh => mesh.scaling = new BABYLON.Vector3(event.value, event.value, event.value));
    this.babylonService.getScene().getMeshesByTags('localAxisX').map(
      mesh => mesh.position = new BABYLON.Vector3(0.9 * pos, -0.05 * pos, 0));
    this.babylonService.getScene().getMeshesByTags('localAxisY').map(
      mesh => mesh.position = new BABYLON.Vector3(0, 0.9 * pos, -0.05 * pos));
    this.babylonService.getScene().getMeshesByTags('localAxisZ').map(
      mesh => mesh.position = new BABYLON.Vector3(0, 0.05 * pos, 0.9 * pos));
  }

  public handleChangeLocalAxis() {
    this.showLocalAxis = (this.showLocalAxis) ? false : true;
    if (this.showLocalAxis) {
      this.babylonService.getScene().getMeshesByTags('localAxis').map(mesh => mesh.visibility = 1);
    } else {
      this.babylonService.getScene().getMeshesByTags('localAxis').map(mesh => mesh.visibility = 0);
    }
  }

  private destroyLocalAxis() {
    this.babylonService.getScene().getMeshesByTags('localAxis').map(mesh => mesh.dispose());
    this.showLocalAxis = false;
  }

  public setScalingFactor(event: any) {
    this.scalingFactor = event.value.toFixed(2);
    this.center.scaling = new BABYLON.Vector3(event.value, event.value, event.value);

    const bi = this.boundingBox.getBoundingInfo();
    const minimum = bi.boundingBox.minimumWorld;
    const maximum = bi.boundingBox.maximumWorld;
    const size = maximum.subtract(minimum);
    this.height = size.y.toFixed(2);
    this.width = size.x.toFixed(2);
    this.depth = size.z.toFixed(2);

  }

  public handleChangeHeight() {

    // originalSize.x => 1 scale
    // originalSize.y * factor = this.height
    const factor = this.height / this.initialSize.y;
    this.scalingFactor = parseFloat((this.height / this.initialSize.y).toFixed(2));

    this.center.scaling = new BABYLON.Vector3(factor, factor, factor);

    const bi = this.boundingBox.getBoundingInfo();
    const minimum = bi.boundingBox.minimumWorld;
    const maximum = bi.boundingBox.maximumWorld;
    const size = maximum.subtract(minimum);
    this.width = size.x.toFixed(2);
    this.depth = size.z.toFixed(2);
  }

  public handleChangeWidth() {

    // originalSize.x => 1 scale
    // originalSize.x  * factor = this.height
    const factor = this.width / this.initialSize.x;
    this.scalingFactor = parseFloat((this.width / this.initialSize.x).toFixed(2));
    this.center.scaling = new BABYLON.Vector3(factor, factor, factor);

    const bi = this.boundingBox.getBoundingInfo();
    const minimum = bi.boundingBox.minimumWorld;
    const maximum = bi.boundingBox.maximumWorld;
    const size = maximum.subtract(minimum);
    this.height = size.y.toFixed(2);
    this.depth = size.z.toFixed(2);

  }

  public handleChangeDepth() {

    // originalSize.x => 1 scale
    // originalSize.x  * factor = this.height
    const factor = this.depth / this.initialSize.z;
    this.scalingFactor = parseFloat((this.depth / this.initialSize.z).toFixed(2));

    this.center.scaling = new BABYLON.Vector3(factor, factor, factor);

    const bi = this.boundingBox.getBoundingInfo();
    const minimum = bi.boundingBox.minimumWorld;
    const maximum = bi.boundingBox.maximumWorld;
    const size = maximum.subtract(minimum);
    this.height = size.y.toFixed(2);
    this.width = size.x.toFixed(2);

  }

  private async rotationFunc(axisName: string, degree: number) {

    // Math.PI / 2 -> 90 Grad

    switch (axisName) {
      case 'x':
        console.log('Ich werde jetzt rotieren:', this.lastRotationX, '+', degree);
        this.lastRotationX = this.lastRotationX + degree;
        break;
      case 'y':
        this.lastRotationY = this.lastRotationY + degree;
        break;
      case 'z':
        this.lastRotationZ = this.lastRotationZ + degree;
    }

    if (!this.center.rotationQuaternion) {
      this.center.rotationQuaternion = BABYLON.Quaternion.RotationYawPitchRoll(0, 0, 0);
    }


    const start = this.center.rotationQuaternion;


    const axisX = BABYLON.Axis['X'];
    const axisY = BABYLON.Axis['Y'];
    const axisZ = BABYLON.Axis['Z'];

    const rotationQuaternion = BABYLON.Quaternion.RotationYawPitchRoll(0, 0, 0);

    const rotationQuaternionX = BABYLON.Quaternion.RotationAxis(axisX, Math.PI / 180 * this.lastRotationX);
    let end = rotationQuaternionX.multiply(rotationQuaternion);

    const rotationQuaternionY = BABYLON.Quaternion.RotationAxis(axisY, Math.PI / 180 * this.lastRotationY);
    end = rotationQuaternionY.multiply(end);

    const rotationQuaternionZ = BABYLON.Quaternion.RotationAxis(axisZ, Math.PI / 180 * this.lastRotationZ);
    end = rotationQuaternionZ.multiply(end);

    const anim = new BABYLON.Animation('anim', 'rotationQuaternion',
      120, BABYLON.Animation.ANIMATIONTYPE_QUATERNION, BABYLON.Animation.ANIMATIONLOOPMODE_RELATIVE);
    const frame = [{frame: 0, value: start},
      {frame: 100, value: end}];
    anim.setKeys(frame);
    this.center.animations = [];
    this.center.animations.push(anim);
    this.center.rotationQuaternion = end;
    await this.babylonService.getScene().beginAnimation(this.center, 0, 100, false, undefined, undefined, undefined, false);

  }

  public async handleChangeRotationX(rotation: number) {
    if (rotation !== 0) {
      const check = this.rotationX + rotation;
      if (0 <= check && check <= 360) {
        this.rotationX = this.rotationX + rotation;
        this.rotationFunc('x', rotation);
      } else {
        return;
      }
    } else {
      const check = this.rotationX;

      if (0 <= check && check <= 360) {
        await this.rotationFunc('x', this.rotationX - this.lastRotationX);
      } else {
        this.rotationX = this.lastRotationX;
      }
    }
  }

  public async handleChangeRotationY(rotation: number) {
    if (rotation !== 0) {
      const check = this.rotationY + rotation;
      if (0 <= check && check <= 360) {
        this.rotationY = this.rotationY + rotation;
        this.rotationFunc('y', rotation);
      } else {
        return;
      }
    } else {
      const check = this.rotationY;
      if (0 <= check && check <= 360) {
        await this.rotationFunc('y', this.rotationY - this.lastRotationY);
      } else {
        this.rotationY = this.lastRotationY;
      }
    }
  }

  public async handleChangeRotationZ(rotation: number) {
    if (rotation !== 0) {
      const check = this.rotationZ + rotation;
      if (0 <= check && check <= 360) {
        this.rotationZ = this.rotationZ + rotation;
        this.rotationFunc('z', rotation);
      } else {
        return;
      }
    } else {
      const check = this.rotationZ;
      if (0 <= check && check <= 360) {
        await this.rotationFunc('z', this.rotationZ - this.lastRotationZ);
      } else {
        this.rotationZ = this.lastRotationZ;
      }
    }
  }

}
