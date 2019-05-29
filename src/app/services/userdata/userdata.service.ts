import {EventEmitter, Injectable, Output} from '@angular/core';

import {IAnnotation, ICompilation, ILDAPData, ILoginData, IModel, IUserData} from '../../interfaces/interfaces';
import {MessageService} from '../message/message.service';
import {MongohandlerService} from '../mongohandler/mongohandler.service';
import {ProcessingService} from '../processing/processing.service';

@Injectable({
  providedIn: 'root',
})
export class UserdataService {

  public isModelOwner: boolean;
  public isCollectionOwner: boolean;

  @Output() modelOwner: EventEmitter<boolean> = new EventEmitter();
  @Output() collectionOwner: EventEmitter<boolean> = new EventEmitter();

  public personalCollections: ICompilation[] = [];
  public userOwnedModels: IModel[] = [];
  public userOwnedFinishedModels: IModel[] = [];
  public userOwnedAnnotations: IAnnotation[] = [];

  public currentUserData: IUserData | ILDAPData = {
    fullname: 'Guest',
    username: 'guest',
    _id: this.mongoService.generateObjectId(),
  };

  public cachedLoginData: ILoginData = {
    password: '',
    username: '',
  };

  private loggedIn = false;

  constructor(private processingService: ProcessingService,
              private mongoService: MongohandlerService,
              private message: MessageService) {
    // this.currentUserData can either be IUserData or ILDAPData, so check if it's ILDAPData
    const isLDAPUser = (obj: any): obj is ILDAPData => {
      return obj.data !== undefined;
    };

    this.getUserData()
      .then(() => console.log('Logged in user with sessionID cookie', this.currentUserData))
      .catch(() => console.log('No session cookie. User not logged in'));

    this.processingService.loggedIn.subscribe(loggedIn => {
      this.loggedIn = loggedIn;
      if (loggedIn) {
        this.getUserData();
      }
    });

    this.processingService.Observables.actualModel.subscribe(actualModel => {
      if (actualModel._id && this.userOwnedModels.length && this.loggedIn) {
        this.checkOwnerState(actualModel._id);
      } else {
        this.isModelOwner = false;
        this.modelOwner.emit(false);
      }
    });

    this.processingService.Observables.actualCollection.subscribe(actualCollection => {
      if (!actualCollection) return;
      if (actualCollection._id && actualCollection.relatedOwner) {
        this.isCollectionOwner =
          (isLDAPUser(this.currentUserData) && this.currentUserData.data.compilation)
            ? this.currentUserData.data.compilation
              .find((comp: ICompilation) => comp._id === actualCollection._id) !== undefined
            : false;
      } else {
        this.isCollectionOwner = false;
      }
      this.collectionOwner.emit(this.isCollectionOwner);
    });
  }

  private async getUserData() {
    return new Promise((resolve, reject) => {
      this.mongoService.getCurrentUserData()
        .then(userData => {
          resolve(userData);
          if (userData && userData.message === 'Invalid session') {
            this.message.info('User is not logged in');
          } else if (!userData || !userData.data) {
            this.message.info('No valid userdata received');
          } else {
            this.currentUserData = userData;
            if (!userData.data) return;
            if (userData.data.model) {
              userData.data.model.forEach((model: IModel | null) => {
                if (model !== null && !this.userOwnedModels.find(_m => _m._id === model._id)) {
                  this.userOwnedModels.push(model);
                  if (model.finished) {
                    this.userOwnedFinishedModels.push(model);
                  }
                }
              });
            }
            if (userData.data.compilation) {
              userData.data.compilation.forEach((compilation: ICompilation | null) => {
                if (compilation !== null && !this.personalCollections.find(_c => _c._id === compilation._id)) {
                  this.personalCollections.push(compilation);
                }
              });
            }
            if (userData.data.annotation) {
              userData.data.annotation.forEach((annotation: IAnnotation | null) => {
                if (annotation !== null && !this.userOwnedAnnotations.find(_a => _a._id === annotation._id)) {
                  this.userOwnedAnnotations.push(annotation);
                }
              });
            }
          }
          console.log('Meine Modelle', this.userOwnedFinishedModels, 'compis', this.personalCollections, 'meine Annos', this.userOwnedAnnotations);
        },    error => {
          this.message.error('Connection to object server refused.');
          reject('Connection to object server refused.');
        });
    });
  }

  private checkOwnerState(identifier: string) {
    if (this.userOwnedModels.find(obj => obj && obj._id === identifier)) {
      this.isModelOwner = true;
      this.modelOwner.emit(true);
    } else {
      this.isModelOwner = false;
      this.modelOwner.emit(false);
    }
  }

  public isAnnotationOwner(annotation: IAnnotation): boolean {
    return annotation._id && this.loggedIn && this.currentUserData._id !== 'guest' ?
      this.currentUserData._id === annotation.creator._id : false;
  }

  public setcachedLoginData(pwd: string, user: string) {
    this.cachedLoginData.password = pwd;
    this.cachedLoginData.username = user;
  }

  public getUserDataForSocket(): any {
    if (this.currentUserData.fullname !== 'Guest') {
      return this.currentUserData;
    } else {
      // TODO better names for guests
      return {
        fullname: 'Guest',
        username: 'guest',
        _id: this.currentUserData._id,
      };
    }
  }
}
