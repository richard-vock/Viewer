import {Component, Input, OnInit, ViewChild} from '@angular/core';
import {MatDialog} from '@angular/material';
import {Matrix, Vector3} from 'babylonjs';
import {
  PerfectScrollbarComponent,
  PerfectScrollbarConfigInterface, PerfectScrollbarDirective
} from 'ngx-perfect-scrollbar';

import {IAnnotation} from '../../../interfaces/interfaces';
import {AnnotationService} from '../../../services/annotation/annotation.service';
import {AnnotationmarkerService} from '../../../services/annotationmarker/annotationmarker.service';
import {BabylonService} from '../../../services/babylon/babylon.service';
import {CameraService} from '../../../services/camera/camera.service';
import {DataService} from '../../../services/data/data.service';
import {SocketService} from '../../../services/socket/socket.service';
import {UserdataService} from '../../../services/userdata/userdata.service';
import {DialogAnnotationEditorComponent} from '../../dialogs/dialog-annotation-editor/dialog-annotation-editor.component';
import {ProcessingService} from '../../../services/processing/processing.service';

@Component({
  selector: 'app-annotation',
  templateUrl: './annotation.component.html',
  styleUrls: ['./annotation.component.scss'],
})

export class AnnotationComponent implements OnInit {

  @Input() modelFileName: string;
  @Input() annotation: IAnnotation;

  @ViewChild('annotationContent') private annotationContent;

  // internal
  public isEditMode: boolean;
  public showAnnotation: boolean;
  public positionTop: number;
  public positionLeft: number;
  public collapsed: boolean;
  public selectedAnnotation: string;
  private editModeAnnotation: string;
  // --- JAN ----
  public showMediaBrowser = false;
  public config: PerfectScrollbarConfigInterface = {};
  // ---

  // external
  public visibility: boolean;
  public isAnnotatingAllowed: boolean;
  public isAnnotationOwner: boolean;
  public isCollectionOwner: boolean;
  public isInSocket: boolean;

  constructor(private dataService: DataService,
              public annotationService: AnnotationService,
              public babylonService: BabylonService,
              public annotationmarkerService: AnnotationmarkerService,
              public socketService: SocketService,
              public dialog: MatDialog,
              private userdataService: UserdataService,
              public cameraService: CameraService,
              private processingService: ProcessingService) {
  }

  ngOnInit() {

    this.showAnnotation = true;
    this.collapsed = false;
    this.isAnnotatingAllowed = this.annotationService.isAnnotatingAllowed;
    this.isAnnotationOwner = this.userdataService.isAnnotationOwner(this.annotation);
    this.isCollectionOwner = this.userdataService.isCollectionOwner;

    this.processingService.loggedIn.subscribe(colOwner => {
      this.isAnnotationOwner = this.userdataService.isAnnotationOwner(this.annotation);
    });

    this.userdataService.collectionOwner.subscribe(colOwner => {
      this.isCollectionOwner = colOwner;
    });

    this.annotationService.isSelectedAnnotation.subscribe(selectedAnno => {
      selectedAnno === this.annotation._id ? this.visibility = true : this.visibility = false;
      this.selectedAnnotation = selectedAnno;
    });

    this.annotationService.annnotatingAllowed.subscribe(allowed => {
      this.isAnnotatingAllowed = allowed;
      console.log('Allowed', this.isAnnotatingAllowed);
    });

    this.socketService.inSocket.subscribe(inSocket => {
      this.isInSocket = inSocket;
    });

    this.annotationService.isEditModeAnnotation.subscribe(selectedEditAnno => {
      this.editModeAnnotation = selectedEditAnno;
      const isEditAnno = selectedEditAnno === this.annotation._id;
      console.log(selectedEditAnno, this.annotation._id, isEditAnno);
      if (!isEditAnno && this.isEditMode) {
        this.isEditMode = false;
        this.annotationService.updateAnnotation(this.annotation);
        console.log(this.isEditMode);
      }
      if (isEditAnno && !this.isEditMode) {
        this.isEditMode = true;
        console.log(this.isEditMode);
        console.log(this.isAnnotatingAllowed);

        // this.annotationService.setSelectedAnnotation(this.annotation._id);
      }
    });

    setInterval(() => {
      this.setPosition(this.annotation);
    }, 15);
  }

  public closeAnnotation(): void {
    this.annotationService.setSelectedAnnotation('');
  }

  public shareAnnotation() {
    this.annotationService.shareAnnotation(this.annotation);
  }

  public deleteAnnotation(): void {
    this.annotationService.deleteAnnotation(this.annotation);
  }

  // TODO get position from babylon Service
  private setPosition(annotation: IAnnotation) {

    const scene = this.babylonService.getScene();

    if (!scene) {
      return false;
    }

    const getMesh = scene.getMeshByName(annotation._id + '_pick');

    if (getMesh && scene.activeCamera) {
      const engine = this.babylonService.getEngine();

      const p = Vector3.Project(
        getMesh.getBoundingInfo().boundingBox.centerWorld,
        Matrix.Identity(),
        scene.getTransformMatrix(),
        scene.activeCamera.viewport.toGlobal(engine.getRenderWidth(), engine.getRenderHeight()),
      );

      this.positionTop = Math.round(p.y) + 5;
      this.positionLeft = Math.round(p.x) + 5;
    }
  }

  // --- JAN ----
  public editFullscreen(): void {

    const dialogRef = this.dialog.open(DialogAnnotationEditorComponent, {
      width: '75%',
      data: {
        title: this.annotation.body.content.title,
        content: this.annotation.body.content.description,
      },
    });

    dialogRef.afterClosed()
      .subscribe(result => {

        if (result) {
          this.annotation.body.content.title = result.title;
          this.annotation.body.content.description = result.content;
        }
        console.log(result);
      });
  }

  public addMedium(medium) {

    const mdImage = `![alt ${medium.description}](${medium.url})`;

    this.annotationContent.nativeElement.focus();

    const start = this.annotationContent.nativeElement.selectionStart;
    const value = this.annotationContent.nativeElement.value;

    this.annotation.body.content.description =
      `${value.substring(0, start)}${mdImage}${value.substring(start, value.length)}`;
  }

  // ---

}
