import {Component, OnInit} from '@angular/core';
import {MatDialog, MatDialogConfig, MatIconRegistry} from '@angular/material';
import {DomSanitizer} from '@angular/platform-browser';

import {BabylonService} from '../../services/babylon/babylon.service';
import {CameraService} from '../../services/camera/camera.service';
import {MongohandlerService} from '../../services/mongohandler/mongohandler.service';
import {OverlayService} from '../../services/overlay/overlay.service';
import {ProcessingService} from '../../services/processing/processing.service';
import {LoginComponent} from '../dialogs/dialog-login/login.component';

@Component({
  selector: 'app-menu',
  templateUrl: './menu.component.html',
  styleUrls: ['./menu.component.scss'],
})
export class MenuComponent implements OnInit {

  // external
  public isLoggedIn = false;
    // available quality of object
  public high = '';
  public medium = '';
  public low = '';

  public fullscreenCapable = document.fullscreenEnabled;

  constructor(
    public iconRegistry: MatIconRegistry,
    public sanitizer: DomSanitizer,
    public cameraService: CameraService,
    public overlayService: OverlayService,
    public processingService: ProcessingService,
    public babylonService: BabylonService,
    private mongohandlerService: MongohandlerService,
    public dialog: MatDialog) {

    iconRegistry.addSvgIcon(
      'cardboard',
      sanitizer.bypassSecurityTrustResourceUrl('assets/img/google-cardboard.svg'));

    this.processingService.loggedIn.subscribe(isLoggedIn => {
      this.isLoggedIn = isLoggedIn;
    });

    this.processingService.Observables.actualModel.subscribe(model => {
      if (model.processed) {
        this.high = (model.processed.high) ? model.processed.high : '';
        this.medium = (model.processed.medium) ? model.processed.medium : '';
        this.low = (model.processed.low) ? model.processed.low : '';
      }
    });
  }

  ngOnInit() {
    document.addEventListener('fullscreenchange', _ => {
      if (!document.fullscreen && this.babylonService.getEngine().isFullscreen) {
        this.babylonService.getEngine()
          .switchFullscreen(false);
      }
    });
  }

  toggleFullscreen() {
    // BabylonJS' this.engine.switchFullscreen(false); creates a fullscreen without our menu.
    // To display the menu, we have to switch to fullscreen on our own.
    const _tf = (): Promise<void> => {
      const _docEl = document.documentElement as any;
      return (_docEl.mozRequestFullScreen) ? _docEl.mozRequestFullScreen()
        : (_docEl.webkitRequestFullscreen) ? _docEl.webkitRequestFullscreen()
        : _docEl.requestFullscreen();
    };
    const isFullscreen = document.fullscreen;
    if (isFullscreen) {
      this.babylonService.getEngine()
        .switchFullscreen(false);
    } else {
      _tf()
        .then(() => {})
        .catch(e => console.error(e));
    }
  }

  loginDialog() {
    const dialogConfig = new MatDialogConfig();

    dialogConfig.disableClose = true;
    dialogConfig.autoFocus = true;

    this.dialog.open(LoginComponent, dialogConfig);
  }

  logout() {
    this.mongohandlerService.logout()
      .then(() => {
        this.processingService.bootstrap();
      });
  }

}
