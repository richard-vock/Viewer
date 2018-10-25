import {Component, Input, OnInit} from '@angular/core';
import {AnnotationService} from '../../services/annotation/annotation.service';
import * as BABYLON from 'babylonjs';
import {BabylonService} from '../../services/babylon/babylon.service';
import {Annotation} from '../../interfaces/annotation/annotation';
import {DataService} from '../../services/data/data.service';

@Component({
  selector: 'app-annotation',
  templateUrl: './annotation.component.html',
  styleUrls: ['./annotation.component.css']
})

export class AnnotationComponent implements OnInit {

  @Input() annotation: Annotation;


  public editMode = false;
  public labelMode = 'edit';
  public labelModeText = 'edit';
  public positionLeft = 0;
  public positionRight = 0;
  public visibility: boolean;
  public id = '';


  constructor(private dataService: DataService, private annotationService: AnnotationService, private babylonService: BabylonService
  ) {
    this.visibility = true;

  }

  ngOnInit() {
    this.id = this.annotation._id;

    setInterval(() => {
      this.setPosition(this.annotation);
    }, 10);
  }

  public setPosition(annotation: Annotation) {
    const _getMesh = this.babylonService.getScene().getMeshByName(annotation._id + '_pick');
    if (_getMesh != null) {

      const vectorMesh = _getMesh.getBoundingInfo().boundingBox.centerWorld;
      const p = BABYLON.Vector3.Project(
        vectorMesh,
        BABYLON.Matrix.Identity(),
        this.babylonService.getScene().getTransformMatrix(),
        this.babylonService.getScene().activeCamera.viewport.toGlobal(this.babylonService.getEngine().getRenderWidth(),
          this.babylonService.getEngine().getRenderHeight())
      );
      this.positionLeft = Math.round(p.y);
      this.positionRight = Math.round(p.x);
    }

  }

  public visabilityAnnotationCard(visibility: boolean) {
    this.visibility = visibility;
  }

  public selectPerspective() {
  }

  public deleteAnnotation(): void {
    this.annotationService.deleteAnnotation(this.annotation);
  }

  private closeAnnotation(): void {
    this.visibility = false;
  }

  public toggleEditViewMode() {
    console.log('toggle Function');

    if (this.editMode) {
      this.editMode = false;
      this.labelMode = 'edit';
      this.labelModeText = 'edit';
    } else {
      this.editMode = true;
      this.labelMode = 'remove_red_eye';
      this.labelModeText = 'view';
    }
  }


}
