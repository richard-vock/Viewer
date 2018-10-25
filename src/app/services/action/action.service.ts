import {Injectable} from '@angular/core';
import * as BABYLON from 'babylonjs';
import {BabylonService} from '../babylon/babylon.service';
import {AnnotationService} from '../annotation/annotation.service';


@Injectable({
  providedIn: 'root'
})
export class ActionService {


  constructor(private babylonService: BabylonService) {
  }


  public createActionManager(modelName: string, trigger: number, actionExecuted: (result: any) => void) {
    const mesh = this.babylonService.getScene().getMeshByName(modelName);
    if (mesh !== null) {
      const scene = this.babylonService.getScene();
      mesh.actionManager = new BABYLON.ActionManager(scene);
      mesh.actionManager.registerAction(new BABYLON.ExecuteCodeAction(
        trigger, function (evt) {
          const pickResult = scene.pick(scene.pointerX, scene.pointerY,
            null, false, scene.activeCamera);
          console.log(pickResult);
          actionExecuted(pickResult);
        }));
    } else {
    }
  }


  public pickableModel(modelName: string, pickable: boolean) {
    const mesh = this.babylonService.getScene().getMeshByName(modelName);
    mesh.isPickable = pickable;
  }

}
