import {DOCUMENT} from '@angular/common';
import {EventEmitter, Inject, Injectable, Output} from '@angular/core';
import * as BABYLON from 'babylonjs';
import {ActionManager, ExecuteCodeAction} from 'babylonjs';
import * as GUI from 'babylonjs-gui';
import 'babylonjs-loaders';
import {ReplaySubject} from 'rxjs';

import {LoadingscreenhandlerService} from '../loadingscreenhandler/loadingscreenhandler.service';
import {MessageService} from '../message/message.service';

import {LoadingScreen} from './loadingscreen';

@Injectable({
  providedIn: 'root',
})
export class BabylonService {

  @Output() vrModeIsActive: EventEmitter<boolean> = new EventEmitter();
  public isVRModeActive = false;

  private scene: BABYLON.Scene;
  private engine: BABYLON.Engine;

  private analyser: BABYLON.Analyser;

  private VRHelper: BABYLON.VRExperienceHelper;

  private CanvasSubject = new ReplaySubject<HTMLCanvasElement>();
  public CanvasObservable = this.CanvasSubject.asObservable();

  private backgroundURL = 'assets/textures/backgrounds/darkgrey.jpg';

  private actualControl: any = false;
  private selectingControl: boolean;
  private selectedControl: boolean;

  private color: {
    r: number;
    g: number;
    b: number;
    a: number;
  };

  private pointlight: BABYLON.PointLight;
  private ambientlightUp: BABYLON.HemisphericLight;
  private ambientlightDown: BABYLON.HemisphericLight;

  private pointlightPosX: number;
  private pointlightPosY: number;
  private pointlightPosZ: number;
  public pointlightIntensity: number;

  private background: BABYLON.Layer;
  private isBackground: boolean;

  // FOR VR-HUD
  public vrJump: boolean;

  public audio: BABYLON.Sound;
  public mediaType = '';
  private slider: GUI.Slider;
  private currentTime: number;
  public video: HTMLVideoElement;

  constructor(private message: MessageService,
              private loadingScreenHandler: LoadingscreenhandlerService,
              @Inject(DOCUMENT) private document: any) {

    this.CanvasObservable.subscribe(newCanvas => {

      if (newCanvas) {

        this.engine = new BABYLON.Engine(newCanvas, true, {
          audioEngine: true,
          preserveDrawingBuffer: true, stencil: true,
        });
        this.scene = new BABYLON.Scene(this.engine);
        this.engine.loadingScreen = new LoadingScreen(newCanvas, '',
          '#111111', 'assets/img/kompakkt-icon.png', this.loadingScreenHandler);

        this.analyser = new BABYLON.Analyser(this.scene);
        BABYLON.Engine.audioEngine['connectToAnalyser'](this.analyser);
        this.analyser.FFT_SIZE = 32;
        this.analyser.SMOOTHING = 0.9;

        this.scene.registerBeforeRender(() => {

          if (this.mediaType === 'audio' && this.audio) {
            if (this.audio.isPlaying) {
              const fft = this.analyser.getByteFrequencyData();
              const audioMeshes = this.scene.getMeshesByTags('audioCenter');
              audioMeshes.forEach(mesh => {
                mesh.scaling = new BABYLON.Vector3((0.05 + (fft[15] / 320)),
                  (0.05 + (fft[15] / 320)), (0.05 + (fft[15] / 320)));
              });
              if (BABYLON.Engine.audioEngine.audioContext) {
                // TODO
                this.currentTime = BABYLON.Engine.audioEngine.audioContext['currentTime'] - this.currentTime;
                if (this.slider) {
                  this.slider.value = (this.slider.value + this.currentTime);
                }
              }
            }

            const _cam = this.scene.getCameraByName('arcRotateCamera');
            if (_cam && _cam['radius']) {
              const radius = Math.abs(_cam['radius']);
              const node = this.scene.getTransformNodeByName('mediaPanel');
              if (node) {
                node.getChildMeshes()
                  .forEach(mesh => mesh.scalingDeterminant = radius / 35);
              }
            }
          }

          if (this.mediaType === 'video' && this.video) {
            if (!this.video.paused) {
              this.slider.value = this.video.currentTime;
            }
          }

          // VR-Annotation-Text-Walk
          if (this.actualControl && this.selectingControl && !this.selectedControl) {

            this.actualControl.scaling.x += 0.005;
            this.actualControl.scaling.y += 0.005;
            this.actualControl.material.diffuseColor = BABYLON.Color3.Red();

            if (this.actualControl.scaling.x >= 1.5) {
              this.selectedControl = true;
            }
          }

          if (this.selectedControl) {

            this.actualControl.metadata = '1';
            this.actualControl.scaling.x = 1;
            this.actualControl.scaling.y = 1;
            this.actualControl.material.diffuseColor = BABYLON.Color3.Black();
            this.selectedControl = false;
            this.actualControl = false;
          }

          // Annotation_Marker -- Fixed_Size_On_Zoom
          const _cam = this.scene.getCameraByName('arcRotateCamera');
          if (_cam && _cam['radius']) {
            const radius = Math.abs(_cam['radius']);
            this.scene.getMeshesByTags('plane', mesh => mesh.scalingDeterminant = radius / 35);
            this.scene.getMeshesByTags('label', mesh => mesh.scalingDeterminant = radius / 35);
          }

          // FOR VR-HUD
          const _activeCamera = this.getActiveCamera();
          if (this.vrJump && _activeCamera) {
            this.vrJump = false;
            let i = 1;
            this.scene.getMeshesByTags('control', mesh => {

              const newPosition = new BABYLON.Vector3();
              if ((i % 2) != 0) {
                newPosition.x = _activeCamera.position.x - 5;
                newPosition.y = _activeCamera.position.y;
                newPosition.z = _activeCamera.position.z;
                i++;
              } else {
                newPosition.x = _activeCamera.position.x + 5;
                newPosition.y = _activeCamera.position.y;
                newPosition.z = _activeCamera.position.z;
              }
              mesh.setAbsolutePosition(newPosition);
            });
          }
        });

        // TODO
        this.scene.registerAfterRender(() => {
          if (this.currentTime && this.mediaType === 'audio') {
            if (this.audio) {
              if (BABYLON.Engine.audioEngine.audioContext) {
                this.currentTime = BABYLON.Engine.audioEngine.audioContext['currentTime'];
              }
            }
          }
        });

        this.engine.runRenderLoop(() => {
          this.scene.render();
        });
      }
    });
  }

  public getActiveCamera() {
    return this.scene.activeCamera;
  }

  public updateCanvas(newCanvas: HTMLCanvasElement) {
    this.CanvasSubject.next(newCanvas);
  }

  public resize(): void {
    this.engine.resize();
  }

  public getEngine(): BABYLON.Engine {
    return this.engine;
  }

  public getScene(): BABYLON.Scene {
    return this.scene;
  }

  public createArcRotateCam(alpha: number, beta: number, radius: number): BABYLON.ArcRotateCamera {
    return new BABYLON.ArcRotateCamera('arcRotateCamera', alpha, beta, radius, BABYLON.Vector3.Zero(), this.scene);
  }

  public createVRHelper() {

    const vrButton: HTMLButtonElement = this.document.getElementById('vrbutton');

    this.VRHelper = this.scene.createDefaultVRExperience({
      // Camera für VR ohne Cardboard!
      createDeviceOrientationCamera: false,
      // createDeviceOrientationCamera: false,
      useCustomVRButton: true,
      customVRButton: vrButton,
    });

    // this.VRHelper.gazeTrackerMesh = BABYLON.Mesh.CreateSphere("sphere1", 32, 0.1, this.scene);
    this.VRHelper.enableInteractions();
    // this.VRHelper.displayGaze = true;

    this.VRHelper.onNewMeshSelected.add(mesh => {

      switch (mesh.name) {

        case 'controlPrevious':
          this.selectingControl = true;
          this.actualControl = mesh;
          this.selectingControl = true;
          break;

        case 'controlNext':
          this.selectingControl = true;
          this.actualControl = mesh;
          this.selectingControl = true;
          break;

        default:
          this.selectingControl = false;
          this.selectedControl = false;

          if (this.actualControl !== false) {
            this.actualControl.scaling.x = 1;
            this.actualControl.scaling.y = 1;
            this.actualControl = false;

          }
      }
    });

    this.VRHelper.onEnteringVRObservable.add(() => {
      this.vrModeIsActive.emit(true);
      this.isVRModeActive = true;
    });
    this.VRHelper.onExitingVRObservable.add(() => {
      this.vrModeIsActive.emit(false);
      this.isVRModeActive = false;
    });

    return this.VRHelper;
  }

  public getVRHelper() {
    return this.VRHelper;
  }

  private clearScene() {
    this.scene.meshes.forEach(mesh => mesh.dispose());
    this.scene.meshes = [];

    if (this.audio) {
      this.audio.dispose();
    }
    if (this.slider) {
      this.slider.dispose();
    }
    this.currentTime = 0;
    if (this.video) {
      this.video.remove();
    }
  }

  public loadModel(rootUrl: string, filename: string): Promise<any> {

    this.clearScene();
    this.mediaType = 'model';

    const message = this.message;
    const engine = this.engine;

    engine.displayLoadingUI();

    return new Promise<any>((resolve, reject) => {

      BABYLON.SceneLoader.ImportMeshAsync(null, rootUrl, filename, this.scene, function (progress) {

        if (progress.lengthComputable) {
          engine.loadingUIText = (progress.loaded * 100 / progress.total).toFixed() + '%';
        }
      }).then(function (result) {
        engine.hideLoadingUI();
        resolve(result);
      }, function (error) {

        engine.hideLoadingUI();
        message.error(error);
        reject(error);
      });
    });

  }

  private str_pad_left(string, pad, length) {
    return (new Array(length + 1).join(pad) + string).slice(-length);
  }

  private getCurrentTime(time: number): string {
    const minutes = Math.floor(time / 60);
    const seconds = time - minutes * 60;

    return (this.str_pad_left(minutes, '0', 2) + ':' + this.str_pad_left(seconds, '0', 2));
  }

  private secondsToHms(sek) {
    const d = Number(sek);

    const h = Math.floor(d / 3600);
    const m = Math.floor(d % 3600 / 60);
    const s = Math.floor(d % 3600 % 60);

    return ('0' + h).slice(-2) + ':' + ('0' + m).slice(-2) + ':' + ('0' + s).slice(-2);
  }

  public loadAudio(rootUrl: string): Promise<any> {

    const message = this.message;
    const engine = this.engine;
    const scene = this.scene;

    this.clearScene();
    this.mediaType = 'audio';

    engine.displayLoadingUI();

    return new Promise((resolve, reject) => {

      this.makeRequest(rootUrl)
        .then(posts => {

          this.audio = new BABYLON.Sound('Music', posts,
                                         scene, () => {
              engine.hideLoadingUI();
              const plane = this.createAudioScene();
              resolve(plane);
            },
            null);
          console.log('Success!', posts);
        })
        .catch(function (error) {
          message.error(error);
          engine.hideLoadingUI();
          reject(error);
        });
    });
  }

  public loadImage(rootUrl: string): Promise<any> {

    const message = this.message;
    const engine = this.engine;
    const scene = this.scene;

    engine.displayLoadingUI();
    this.clearScene();
    this.mediaType = 'image';

    return new Promise<any>((resolve, reject) => {

      const img = new Image();
      img.onload = () => {
        const width = img.width;
        const height = img.height;

        const mypicture = new BABYLON.Texture(rootUrl, scene);  // rem about CORS rules for cross-domain
        const ground = BABYLON.Mesh.CreateGround('gnd', width / 10, height / 10, 1, scene);
        BABYLON.Tags.AddTagsTo(ground, 'mediaGround');
        ground.rotate(BABYLON.Axis.X, Math.PI / 180 * -90, BABYLON.Space.WORLD);

        const gndmat = new BABYLON.StandardMaterial('gmat', scene);
        ground.material = gndmat;
        gndmat.diffuseTexture = mypicture;

        engine.hideLoadingUI();
        resolve(ground);
      };
      img.src = rootUrl;
    });
  }

  public loadVideo(rootUrl: string): Promise<any> {

    const message = this.message;
    const engine = this.engine;
    const scene = this.scene;

    this.clearScene();
    this.mediaType = 'video';

    engine.displayLoadingUI();

    // Video material
    const videoTexture = new BABYLON.VideoTexture('video', rootUrl, scene, false);
    // videoMat.backFaceCulling = false;

    return new Promise<any>((resolve, reject) => {
      videoTexture.onLoadObservable.add(tex => {
        this.video = videoTexture.video;
        const width = tex.getSize().width;
        const height = tex.getSize().height;
        const ground = BABYLON.Mesh.CreateGround('videoGround', width / 10, height / 10, 1, scene);
        BABYLON.Tags.AddTagsTo(ground, 'mediaGround');
        ground.rotate(BABYLON.Axis.X, Math.PI / 180 * -90, BABYLON.Space.WORLD);

        const videoMat = new BABYLON.StandardMaterial('textVid', scene);
        ground.material = videoMat;
        videoMat.diffuseTexture = videoTexture;
        const plane = this.createVideoScene();

        new Promise<any>((resolve, reject) => {
          //const dummy = new BABYLON.Mesh('dummy', scene);
          engine.hideLoadingUI();
          resolve(plane);
        })
          .then(resolve)
          .catch(reject);
      });
    });
  }

  public saveScene(): void {
    return BABYLON.SceneSerializer.Serialize(this.scene);
  }

  public async createScreenshot() {
    this.hideMesh('plane', false);
    this.hideMesh('label', false);
    await new Promise<any>((resolve, reject) => this.engine.onEndFrameObservable.add(resolve));
    const result = await new Promise<string>((resolve, reject) => {
      const _activeCamera = this.getScene().activeCamera;
      if (_activeCamera instanceof BABYLON.Camera) {
        BABYLON.Tools.CreateScreenshot(this.getEngine(), _activeCamera, {precision: 2}, screenshot => {
          fetch(screenshot).then(res => res.blob()).then(blob => BABYLON.Tools.Download(blob, `Kompakkt-${Date.now().toString()}`));
          resolve(screenshot);
        });
      }
    });
    this.hideMesh('plane', true);
    this.hideMesh('label', true);
    return result;
  }

  public async createPreviewScreenshot(width?: number): Promise<string> {
    this.hideMesh('plane', false);
    this.hideMesh('label', false);
    await new Promise<any>((resolve, reject) => this.engine.onEndFrameObservable.add(resolve));
    const result = await new Promise<string>((resolve, reject) => {
      const _activeCamera = this.getScene().activeCamera;
      if (_activeCamera instanceof BABYLON.Camera) {
        BABYLON.Tools.CreateScreenshot(this.getEngine(), _activeCamera,
          (width === undefined) ? {width: 400, height: 225} : {width, height: Math.round((width / 16) * 9)}, screenshot => {
            resolve(screenshot);
          });
      }
    });
    this.hideMesh('plane', true);
    this.hideMesh('label', true);
    return result;
  }

  public hideMesh(tag: string, visibility: boolean) {
    this.scene.getMeshesByTags(tag, mesh => mesh.isVisible = visibility);
  }

  public setBackgroundImage(background: boolean): void {
    if (background && !this.isBackground) {
      this.background = new BABYLON.Layer('background', this.backgroundURL, this.scene, true);
      this.background.alphaBlendingMode = BABYLON.Engine.ALPHA_ADD;
      this.background.isBackground = true;
      this.isBackground = true;
    }
    if (!background && this.background) {
      this.background.dispose();
      this.isBackground = false;
    } else {
      return;
    }
  }

  public setBackgroundColor(color: any): void {
    this.color = color;
    this.scene.clearColor = new BABYLON.Color4(color.r / 255, color.g / 255, color.b / 255, color.a);
  }

  public setLightIntensity(light: string, intensity: number) {
    if (light === 'pointlight' && this.pointlight !== undefined) {
      this.pointlight.intensity = intensity;
      this.pointlightIntensity = intensity;
    }
    if (light === 'ambientlightUp' && this.ambientlightUp !== undefined) {
      this.ambientlightUp.intensity = intensity;
    }
    if (light === 'ambientlightDown' && this.ambientlightDown !== undefined) {
      this.ambientlightDown.intensity = intensity;
    }
  }

  public createPointLight(name: string, position: any) {
    if (this.pointlight !== undefined && this.pointlight !== null) {
      this.pointlight.dispose();
    }
    const pointLight = new BABYLON.PointLight(name, new BABYLON.Vector3(position.x, position.y, position.z), this.scene);
    this.pointlightPosX = position.x;
    this.pointlightPosY = position.y;
    this.pointlightPosZ = position.z;

    this.pointlight = pointLight;
    this.pointlight.intensity = this.pointlightIntensity;

    // return this.pointlight;
  }

  public createAmbientlightDown(name: string, position: any) {
    if (this.ambientlightDown !== undefined) {
      this.ambientlightDown.dispose();
    }
    const hemiLight = new BABYLON.HemisphericLight(name, new BABYLON.Vector3(position.x, position.y, position.z), this.scene);
    this.ambientlightDown = hemiLight;
  }

  public createAmbientlightUp(name: string, position: any) {
    if (this.ambientlightUp !== undefined) {
      this.ambientlightUp.dispose();
    }
    const hemiLight = new BABYLON.HemisphericLight(name, new BABYLON.Vector3(position.x, position.y, position.z), this.scene);
    this.ambientlightUp = hemiLight;
  }

  public setLightPosition(dimension: string, pos: number) {
    if (this.pointlight !== undefined) {
      switch (dimension) {
        case 'x':
          this.pointlightPosX = pos;
          break;
        case 'y':
          this.pointlightPosY = pos;
          break;
        case 'z':
          this.pointlightPosZ = pos;
      }

      this.createPointLight('pointlight', {x: this.pointlightPosX, y: this.pointlightPosY, z: this.pointlightPosZ});
    }
  }

  public getColor(): any {
    return this.color;
  }

  public getPointlightData(): any {
    return {
      type: 'PointLight',
      position: {
        x: this.pointlightPosX,
        y: this.pointlightPosY,
        z: this.pointlightPosZ,
      },
      intensity: this.pointlightIntensity ? this.pointlightIntensity : 1,
    };
  }

  private createAudioScene() {

    // create a Center of Transformation
    const CoT = new BABYLON.TransformNode('mediaPanel');
    CoT.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
    CoT.position.x = 0;
    CoT.position.y = 0;
    CoT.position.z = 0;

    // PLANE for Annotations
    const plane = BABYLON.MeshBuilder.CreatePlane(name, {height: 1.5, width: 20}, this.scene);
    BABYLON.Tags.AddTagsTo(plane, 'controller');
    plane.renderingGroupId = 1;
    plane.material = new BABYLON.StandardMaterial('controlMat', this.scene);
    plane.material.alpha = 1;
    plane.parent = CoT;
    plane.position.y = -1.4;
    // plane.position.x = -8;
    plane.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;


    const plane2 = BABYLON.MeshBuilder.CreatePlane(name, {height: 3, width: 20}, this.scene);
    plane2.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
    plane2.renderingGroupId = 1;
    plane2.parent = CoT;
    plane2.position.y = -1;
    // plane2.position.x = -8;

    // GUI
    const advancedTexture = GUI.AdvancedDynamicTexture.CreateForMesh(plane2);

    const panel = new GUI.StackPanel();
    panel.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
    panel.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_CENTER;
    advancedTexture.addControl(panel);

    this.currentTime = 0;

    const buffer = this.audio ? this.audio.getAudioBuffer() : undefined;
    this.currentTime = 0;

    const header = new GUI.TextBlock();
    buffer ? header.text = 'Length: ' + this.secondsToHms(buffer.duration) :
      header.text = 'Can not calculate length.';
    header.width = '400px';
    header.height = '150px';
    header.color = 'black';
    panel.addControl(header);

    this.slider = new GUI.Slider();
    this.slider.minimum = 0;
    buffer ? this.slider.maximum = buffer.duration : this.slider.maximum = 0;
    this.slider.value = 0;
    this.slider.width = '2000px';
    this.slider.height = '300px';
    this.slider.onValueChangedObservable.add(() => {
      header.text = 'Current time: ' + this.secondsToHms(this.slider.value);
      // Video:       header.text = 'Current time: ' + this.getCurrentTime(this.video.currentTime) + ' min.';
    });
    this.slider.onPointerDownObservable.add(() => {
      if (this.audio.isPlaying) {
        this.audio.pause();
      }
    });
    this.slider.onPointerUpObservable.add(() => {
      //   this.currentTime = this.slider.value;
      this.audio.play(0, this.slider.value);
    });

    panel.addControl(this.slider);

// Volume

    const plane3 = BABYLON.MeshBuilder.CreatePlane(name, {height: 15, width: 2}, this.scene);
    plane3.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
    plane3.renderingGroupId = 1;
    plane3.parent = CoT;
    plane3.position.x = 2;

    const advancedTextureVol = GUI.AdvancedDynamicTexture.CreateForMesh(plane3);

    const sliderVol = new GUI.Slider();
    sliderVol.isVertical = true;
    sliderVol.minimum = 0;
    sliderVol.maximum = 1;
    sliderVol.value = this.audio.getVolume();
    sliderVol.height = '1000px';
    sliderVol.width = '150px';
    sliderVol.onValueChangedObservable.add(() => {
      this.audio.setVolume(sliderVol.value);
    });
    advancedTextureVol.addControl(sliderVol);

    // Cube

    BABYLON.SceneLoader.ImportMeshAsync(null, 'assets/models/', 'kompakkt.babylon', this.scene, function (progress) {
      console.log('LOADED');
    })
      .then(result => {
        console.log(result);
        const center = BABYLON.MeshBuilder.CreateBox('audioCenter', {size: 1}, this.scene);
        BABYLON.Tags.AddTagsTo(center, 'audioCenter');
        center.isVisible = false;

        const axisX = BABYLON.Axis['X'];
        const axisY = BABYLON.Axis['Y'];

        if (!center.rotationQuaternion) {
          center.rotationQuaternion = BABYLON.Quaternion.RotationYawPitchRoll(0, 0, 0);
        }

        const rotationQuaternionX = BABYLON.Quaternion.RotationAxis(axisX, Math.PI / 180 * 1);
        let end = rotationQuaternionX.multiply(center.rotationQuaternion);

        const rotationQuaternionY = BABYLON.Quaternion.RotationAxis(axisY, Math.PI / 180 * 240);
        end = rotationQuaternionY.multiply(end);

        center.rotationQuaternion = end;

        center.scaling = new BABYLON.Vector3(0.05,0.05,0.05);

        result.meshes
          .forEach(mesh => {
            console.log('Audio gefunden');
            mesh.parent = center;
            mesh.isPickable = true;

            mesh.actionManager = new ActionManager(this.scene);
            mesh.actionManager.registerAction(new ExecuteCodeAction(
              ActionManager.OnPickTrigger, (() => {
                console.log('click');
                this.audio.isPlaying ?
                  this.audio.pause() : this.audio.play();

              })));
          });
        return plane;
      });

  }

  private createVideoScene() {
    // create a Center of Transformation
    const CoT = new BABYLON.TransformNode('mediaPanel');
    CoT.position.x = 0;
    CoT.position.y = 0;
    CoT.position.z = 0;

    const ground = this.scene.getMeshesByTags('mediaGround')[0];
    ground.computeWorldMatrix(true);
    const bi = ground.getBoundingInfo();
    const minimum = bi.boundingBox.minimumWorld;
    const maximum = bi.boundingBox.maximumWorld;
    const initialSize = maximum.subtract(minimum);

    ground.isPickable = true;

    ground.actionManager = new ActionManager(this.scene);
    ground.actionManager.registerAction(new ExecuteCodeAction(
      ActionManager.OnPickTrigger, (() => {
        console.log('click');
        this.video.paused ? this.video.play() : this.video.pause();
      })));

    // PLANE for Annotations
    const plane = BABYLON.MeshBuilder.CreatePlane(name, {height: initialSize.y * 0.1, width: initialSize.x}, this.scene);
    BABYLON.Tags.AddTagsTo(plane, 'controller');
    plane.renderingGroupId = 1;
    plane.material = new BABYLON.StandardMaterial('controlMat', this.scene);
    plane.material.alpha = 1;
    plane.parent = CoT;
    plane.position.y = minimum.y - (initialSize.y * 0.1 > 15 ? initialSize.y * 0.1 : 15);

    // Plane for Time-Slider
    const plane2 = BABYLON.MeshBuilder.CreatePlane(name, {
      height: (initialSize.y * 0.1 > 15 ? initialSize.y * 0.1 : 15),
      width: initialSize.x
    }, this.scene);
    plane2.renderingGroupId = 1;
    plane2.parent = CoT;
    plane2.position.y = minimum.y - (initialSize.y * 0.1 > 15 ? initialSize.y * 0.1 : 15) + (0.5 * (initialSize.y * 0.2 > 30 ? initialSize.y * 0.2 : 30));

    // GUI
    const advancedTexture = GUI.AdvancedDynamicTexture.CreateForMesh(plane2);

    const panel = new GUI.StackPanel();
    panel.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
    panel.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_CENTER;
    advancedTexture.addControl(panel);

    this.currentTime = 0;

    const header = new GUI.TextBlock();
    header.text = 'Length: ' + this.video ? String(this.video.duration) : 'Can not calculate length in' + ' sec';
    header.width = '1000px';
    header.height = '700px';
    header.color = 'black';
    panel.addControl(header);

    this.slider = new GUI.Slider();
    this.slider.minimum = 0;
    this.video ? this.slider.maximum = this.video.duration : 0;
    this.slider.value = 0;
    this.slider.width = '1100px';
    this.slider.height = '500px';
    this.slider.onValueChangedObservable.add(() => {
      header.text = 'Current time: ' + this.getCurrentTime(this.video.currentTime) + ' min.';
    });
    this.slider.onPointerDownObservable.add(() => {
      if (!this.video.paused) {
        this.video.pause();
      }
    });
    this.slider.onPointerUpObservable.add(() => {
      this.video.currentTime = this.slider.value;
      this.video.play();
    });
    panel.addControl(this.slider);

// Volume

    const plane3 = BABYLON.MeshBuilder.CreatePlane(name, {
      height: initialSize.y * 0.8,
      width: (initialSize.x * 0.1 > 30 ? initialSize.x * 0.1 : 30)
    }, this.scene);
    plane3.renderingGroupId = 1;
    plane3.parent = CoT;
    plane3.position.x = maximum.x + initialSize.x * 0.1;

    const advancedTextureVol = GUI.AdvancedDynamicTexture.CreateForMesh(plane3);

    const sliderVol = new GUI.Slider();
    sliderVol.isVertical = true;
    sliderVol.minimum = 0;
    sliderVol.maximum = 1;
    sliderVol.value = this.video.volume;
    sliderVol.height = '400px';
    sliderVol.width = '50px';
    sliderVol.onValueChangedObservable.add(() => {
      this.video.volume = sliderVol.value;
    });
    advancedTextureVol.addControl(sliderVol);

    return plane;

  }

  private makeRequest(url) {

    // Create the XHR request
    const request: XMLHttpRequest = new XMLHttpRequest();

    request.responseType = 'arraybuffer';

    request.onprogress = event => {
      this.engine.loadingUIText = (event.loaded * 100 / event.total).toFixed() + '%';
    };

    // Return it as a Promise
    return new Promise(function (resolve, reject) {

      // Setup our listener to process compeleted requests
      request.onreadystatechange = function () {

        // Only run if the request is complete
        if (request.readyState !== 4) return;

        // Process the response
        if (request.status >= 200 && request.status < 300) {
          // If successful
          resolve(request.response);
        } else {
          // If failed
          reject({
            status: request.status,
            statusText: request.statusText,
          });
        }

      };
      // Setup our HTTP request
      request.open('GET', url, true);

      // Send the request
      request.send();

    });
  }
}
