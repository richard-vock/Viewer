import { Component } from '@angular/core';

import { AnnotationComponent } from './annotation.component';

@Component({
  selector: 'app-annotation-for-editor',
  templateUrl: './annotation-for-editor.component.html',
  styleUrls: ['./annotation-for-editor.component.scss'],
})

export class AnnotationComponentForEditorComponent extends AnnotationComponent {

  toggleVisibility() {
    if (!this.annotation) {
      console.error('AnnotationComponentForEditorComponent without Annotation', this);
      throw new Error('AnnotationComponentForEditorComponent without Annotation');
      return;
    }
    if (this.showAnnotation) {
      this.showAnnotation = false;
      if (this.selectedAnnotation === this.annotation._id) {
        this.annotationService.setSelectedAnnotation('');
      }
      this.babylonService.hideMesh(this.annotation._id, false);
    } else {
      this.showAnnotation = true;
      this.annotationService.setSelectedAnnotation(this.annotation._id);
      this.babylonService.hideMesh(this.annotation._id, true);
    }
  }

  // TODO set perspective in annotation Service and make it not async and public and save!
  public async selectPerspective() {

    await this.cameraService.createPreviewScreenshot(400)
      .then(detailScreenshot => {
        if (!this.annotation) {
          console.error('AnnotationComponentForEditorComponent without Annotation', this);
          throw new Error('AnnotationComponentForEditorComponent without Annotation');
          return;
        }
        const camera = this.cameraService.getActualCameraPosAnnotation();
        this.annotation.body.content.relatedPerspective = {
          cameraType: camera.cameraType,
          position: {
            x: camera.position.x,
            y: camera.position.y,
            z: camera.position.z,
          },
          target: {
            x: camera.target.x,
            y: camera.target.y,
            z: camera.target.z,
          },
          preview: detailScreenshot,
        };

        this.annotationService.updateAnnotation(this.annotation);

      });
  }

  public changeOpenPopup() {
    if (!this.annotation) {
      console.error('AnnotationComponentForEditorComponent without Annotation', this);
      throw new Error('AnnotationComponentForEditorComponent without Annotation');
      return;
    }
    if (!this.isEditMode) {
      this.collapsed = !this.collapsed;
    }
    this.collapsed && this.selectedAnnotation === this.annotation._id ?
      this.annotationService.setSelectedAnnotation('') :
      this.annotationService.setSelectedAnnotation(this.annotation._id);
    this.babylonService.hideMesh(this.annotation._id, true);
    this.showAnnotation = true;
  }
}
