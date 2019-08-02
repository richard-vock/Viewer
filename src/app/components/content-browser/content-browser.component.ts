import { Component, OnInit } from '@angular/core';
import { MatDialog, MatDialogConfig, MatRadioChange } from '@angular/material';

import { MediaTypePipe } from '../../pipes/media-type.pipe';
import { MessageService } from '../../services/message/message.service';
import { ProcessingService } from '../../services/processing/processing.service';
import { UserdataService } from '../../services/userdata/userdata.service';
import { LoginComponent } from '../dialogs/dialog-login/login.component';
import { DialogPasswordComponent } from '../dialogs/dialog-password/dialog-password.component';

@Component({
  selector: 'app-content-browser',
  templateUrl: './content-browser.component.html',
  styleUrls: ['./content-browser.component.scss'],
  providers: [MediaTypePipe],
})
export class ContentBrowserComponent implements OnInit {
  // external
  public isLoggedIn = false;
  public isEntityCategory = false;
  public isCollectionLoaded = false;

  // internal
  public filterPersonalCollections = false;
  public filterPersonalEntities = false;

  public showEntities = true;
  public showImages = true;
  public showAudio = true;
  public showVideo = true;
  public showText = true;

  private identifierCollection;
  private identifierEntity;

  constructor(
    public processingService: ProcessingService,
    private message: MessageService,
    public dialog: MatDialog,
    public userdataService: UserdataService,
  ) {}

  ngOnInit() {
    this.isLoggedIn = this.processingService.isLoggedIn;
    this.isCollectionLoaded = this.processingService.isCollectionLoaded;
    this.isEntityCategory = true;

    this.processingService.loggedIn.subscribe(loggedIn => {
      this.isLoggedIn = loggedIn;
    });

    this.processingService.collectionLoaded.subscribe(loadedCol => {
      this.isCollectionLoaded = loadedCol;
    });
  }

  public loginDialog() {
    const dialogConfig = new MatDialogConfig();
    dialogConfig.disableClose = true;
    dialogConfig.autoFocus = true;
    this.dialog.open(LoginComponent, dialogConfig);
  }

  changeCategory(mrChange: MatRadioChange) {
    // for other values check:
    // const mrButton: MatRadioButton = mrChange.source;
    if (mrChange.value === 'col') {
      this.isEntityCategory = false;
    }
    if (mrChange.value === 'obj') {
      this.isEntityCategory = true;
    }
  }

  searchCollectionByID(event?) {
    let id = '';
    event ? (id = event.value._id) : (id = this.identifierCollection);
    this.processingService
      .selectCollectionByID(id)
      .then(result => {
        switch (result) {
          case 'loaded':
            break;

          case 'missing':
            this.message.error(
              'Can not find Collection with ID ' +
                this.identifierCollection +
                '.',
            );
            break;

          case 'password':
            console.log('password');
            this.passwordDialog();
            break;

          default:
            this.message.error(
              'Can not find Collection with ID ' +
                this.identifierCollection +
                '.',
            );
        }
      })
      .catch(error => {
        console.error(error);
        this.message.error('Connection to entity server refused.');
      });
  }

  public passwordDialog() {
    const dialogConfig = new MatDialogConfig();

    dialogConfig.disableClose = true;
    dialogConfig.autoFocus = true;

    dialogConfig.data = {
      id: this.identifierCollection,
    };
    console.log('password');

    const dialogRef = this.dialog.open(DialogPasswordComponent, dialogConfig);
    dialogRef.afterClosed().subscribe(data => {
      if (data === true) {
        this.identifierCollection = '';
      }
    });
  }

  searchEntityByID(event?) {
    let id = '';
    event ? (id = event.value._id) : (id = this.identifierEntity);
    const isloadable = this.processingService.selectEntityByID(id);
    if (isloadable) {
    } else {
      this.message.error('Can not find Entity with ID ' + id + '.');
    }
  }
}
