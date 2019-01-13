import {Injectable} from '@angular/core';
import {Model} from '../../interfaces/model/model.interface';
import {MongohandlerService} from '../mongohandler/mongohandler.service';
import {BehaviorSubject} from 'rxjs';
import {LoadModelService} from '../load-model/load-model.service';
import {MessageService} from '../message/message.service';

@Injectable({
  providedIn: 'root'
})

export class CatalogueService {

  private Subjects = {
    models: new BehaviorSubject<Model[]>(Array<Model>()),
    collections: new BehaviorSubject<any[]>(Array<any>()),
  };

  public Observables = {
    models: this.Subjects.models.asObservable(),
    collections: this.Subjects.collections.asObservable(),
  };

  private isFirstLoad = true;

  constructor(private mongohandlerService: MongohandlerService,
              private loadModelService: LoadModelService,
              private message: MessageService) {
  }

  public bootstrap(): void {

    if (this.isFirstLoad) {

      const url_split = location.href.split('?');

      if (url_split.length <= 1) {
        this.isFirstLoad = false;
        this.loadModelService.loadDefaultModelData();
        this.fetchCollectionsData();
        this.fetchModelsData();
      }

      if (url_split.length > 1) {

        const equal_split = url_split[1].split('=');

        if (equal_split.length > 1) {

          const query = equal_split[1];
          const category = equal_split[0];

          // TODO: Cases for audio, video and image
          switch (category) {

            case 'model':
              this.loadModelService.fetchModelData({
                _id: 'PreviewModel',
                name: 'PreviewModel',
                finished: false,
                online: false,
                files: [
                  query
                ],
                processed: {
                  time: {
                    start: '',
                    end: '',
                    total: ''
                  },
                  low: query,
                  medium: query,
                  high: query,
                  raw: query
                }
              });
              this.isFirstLoad = false;
              break;

            case 'compilation':
              this.isFirstLoad = false;
              this.loadModelService.fetchCollectionData(query);
              break;

            default:
              this.isFirstLoad = false;
              console.log('No valid query passed. Loading default model.');
              this.loadModelService.loadDefaultModelData();
          }
        } else {
          console.log('No valid query passed. Loading default model.');
          this.isFirstLoad = false;
          this.loadModelService.loadDefaultModelData();
        }
      }
    } else {
      console.log('Page has already been initially loaded.');
    }
  }

  private fetchCollectionsData() {
    this.mongohandlerService.getAllCompilations().subscribe(compilation => {
      this.Subjects.collections.next(compilation);
    }, error => {
      this.message.error('Connection to object server refused.');
    });
  }

  private fetchModelsData() {
    this.mongohandlerService.getAllModels().subscribe(model => {
      this.Subjects.models.next(model);
    }, error => {
      this.message.error('Connection to object server refused.');
    });
  }

  public selectCollection(collection: any) {
    this.loadModelService.updateActiveCollection(collection);
    this.loadModelService.loadSelectedModelfromCollection(collection.models[0]);
  }

  public selectModel(model: Model, collection: boolean) {
    if (collection) {
      this.loadModelService.loadSelectedModelfromCollection(model);
    } else {
      this.loadModelService.loadSelectedModelfromModels(model);
    }
  }

  /**
   * @function selectCollectionByID looks up a collection by a given identifier
   *
   * @param {string} identifierCollection,
   * @returns {boolean} collection has been found
   */
  public selectCollectionByID(identifierCollection: string): boolean {
    // Check if collection has been initially loaded and is available in collections
    const collection = this.Observables.collections.source['value'].find(i => i._id === identifierCollection);
    // If collection has not been loaded during initial load
    if (collection === undefined) {
      // try to find it on the server
      this.mongohandlerService.getCompilation(identifierCollection).subscribe(compilation => {
        // collection is available on server
        if (compilation['_id']) {
          // add it to collections
          this.Subjects.collections.next(compilation);
          // load collection
          this.selectCollection(compilation);
          return true;
        } else {
          // collection ist nicht erreichbar
          return false;
        }
      }, error => {
        this.message.error('Connection to object server refused.');
        return false;
      });
      // collection is available in collections and will be loaded
    } else {
      this.selectCollection(collection);
      return true;
    }
  }

  public selectModelbyID(identifierModel: string): boolean {
    const model = this.Observables.models.source['value'].find(i => i._id === identifierModel);
    if (model === undefined) {
      this.mongohandlerService.getModel(identifierModel).subscribe(actualModel => {
        if (actualModel['_id']) {
          this.Subjects.models.next(actualModel);
          this.selectModel(actualModel, false);
          return true;
        } else {
          return false;
        }
      }, error => {
        this.message.error('Connection to object server refused.');
        return false;
      });
    } else {
      this.selectModel(model, false);
      return true;
    }
  }

}
