import {Injectable} from '@angular/core';
import {Annotation} from 'src/app/interfaces/annotation2/annotation2';
import {DataService} from '../data/data.service';
import {BabylonService} from '../babylon/babylon.service';
import {ActionService} from '../action/action.service';
import {MessageService} from '../message/message.service';
import {MongohandlerService} from '../mongohandler/mongohandler.service';
import {AnnotationmarkerService} from '../annotationmarker/annotationmarker.service';
import {ActionManager} from 'babylonjs';
import PouchDB from 'pouchdb';
import * as BABYLON from 'babylonjs';
import {LoadModelService} from '../load-model/load-model.service';
import {environment} from '../../../environments/environment';
import { SocketService } from '../socket/socket.service';

/**
 * @author Zoe Schubert
 * @author Jan G. Wieners
 */

@Injectable({
  providedIn: 'root'
})

// 2.
// SOCKET.IO
// -----------------------------------------------------------------------------------------------------------------------
// HTML ELEMENTE 

              // -- LOGIN // AUSTRITT  (BUTTON)
              // -- FILTER (BEI LOGGED-IN)
                      // USER-LISTE 
                                // USER-X (Aus-/Einblenden)


// 3.
// -----------------------------------------------------------------------------------------------------------------------
// BABYLON ELEMENTE  

        // CREATE MARKER 
              // --  "public collaboratorsAnnotations: Annotation[];"
                      // -- MARKER-FARBEN 
                              // (NACH USER-ID)

    

export class AnnotationService {

  // SOCKET_VARIABLES
  // IN-SOCKET (Boolean)
  public inSocket: boolean;
  // SOCKET-ANNOTATIONS_OF_COLLABORATORS
  public collaboratorsAnnotations: Annotation[];
  
  public annotations: Annotation[];
  private unsortedAnnotations: Annotation[];
  private allAnnotations: Annotation[];
  private modelName: string;
  private currentModel: any;
  private currentCompilation: any;
  private actualModelMeshes: BABYLON.Mesh[];
  private isDefaultLoad: boolean;

  constructor(private babylonService: BabylonService,
              private dataService: DataService,
              private actionService: ActionService,
              private annotationmarkerService: AnnotationmarkerService,
              private loadModelService: LoadModelService,
              private mongo: MongohandlerService,
              private message: MessageService,
              public socketService: SocketService) 
  {

    // 1.
    // EVENTS 
    
    // (EVENT-NAMEN)
      // -- createAnnotation
      // -- editAnnotation
      // -- deleteAnnotation
      // -- changeRanking
      // -- newUser
      // -- lostConnection
      // -- onlineCollaborators (needed (see changeRoom) ???)
      // -- changeRoom
    
    // 1.1  
    // EVENT SENDEN                                                                                     // this.socketService.socket.emit(eventName, data);
                    // 1.1.1
                    // - Annotation erstellen
                                          // this.socketService.socket.emit(eventName, data);
                                          // emit "createAnnotation"
                    // 1.1.2
                    // - Annotation bearbeiten (und aufs Auge klicken)
                                          // this.socketService.socket.emit(eventName, data);
                                          // emit "editAnnotation"
                    // 1.1.3
                    // - Ranking der Annotation ändern
                                          // this.socketService.socket.emit(eventName, data);
                                          // emit "changeRanking"
                    // 1.1.4
                    // - Löschen der Annotation
                                          // this.socketService.socket.emit(eventName, data);
                                          // emit "deleteAnnotation"
                    // 1.1.5
                    // -- Verbinden (Raum)
                                          // this.socketService.socket.emit(eventName, data);
                                          // emit "changeRoom" (for miself)
                                          // emit "newUser" (für andere)
                    // 1.1.6
                    // -- Verbindung trennen (Raum)
                                          // this.socketService.socket.emit(eventName, data);
                                          // emit "lostConnection"
                    // 1.1.7
                    // -- Wählen eines anderen Modells/Collection       ---  Verbindung trennen (alter Raum) --> Verbinden (neuer Raum)
                                          // this.socketService.socket.emit(eventName, data);
                                          // emit "changeRoom"


    // 1.2
    // EVENT EMPFANGEN                                                                                 // this.socketService.socket.fromEvent('eventName').subscribe(result => console.log(result));
                    // 1.2.1
                    // -- Wenn man dem Raum beitritt
                                            // emit "onlineCollaborators"
                                            // get "fromEvent('onlineCollaborators').subscribe(data)"
                    // 1.2.2
                    // -- Wenn eine Person eine Annotation erstellt
                                            // get "fromEvent('createAnnotation').subscribe(data)"
                                            // push "data" (Person-Annotation) to 'collaboratorsAnnotations'
                    // 1.2.3
                    // -- Wenn eine Person eine Annotation bearbeitet
                                            // get "fromEvent('editAnnotation').subscribe(data)"
                                            // delete "data-id" & push "data" (Person-Annotation) from & to 'collaboratorsAnnotations'
                    // 1.2.4
                    // -- Wenn eine Person eine Annotaiton löscht
                                            // get "fromEvent('deleteAnnotation').subscribe(data)"
                                            // delete "data" (Person-Annotation) from 'collaboratorsAnnotations'
                    // 1.2.5
                    // -- Wenn eine Person das Ranking bearbeitet
                                            // get "fromEvent('changeRanking').subscribe(data)"
                                            // get "data" (new ranking Person-Annotations) to 'collaboratorsAnnotations' 
                    // 1.2.6 
                    // -- Wenn eine Person die Verbindung verliert
                                            // get "fromEvent('lostConnection').subscribe(data)"
                                            // delete "data" (Person-Annotations) from 'collaboratorsAnnotations'
                    // 1.2.7
                    // -- Wenn eine neue Person dazu kommt
                                            // get "fromEvent('newUser').subscribe(data)"
                                            // push "data" (Person-AnnotationS) to 'collaboratorsAnnotations'
                    // 1.2.8
                    // -- Wenn eine Person den Raum verlässt
                                            // get "fromEvent('changeRoom').subscribe(data)"
                                            // delete "data" (Person-Annotations) from 'collaboratorsAnnotations'
                  
    
    this.socketService.socket.emit('message', 'Hellooo!');

    // IN-SOCKET
    this.inSocket = false;
    // SOCKET_ROOM -- ANNOTATIONS OF COLLABORATORS
    this.collaboratorsAnnotations = [];
                     
    this.annotations = [];
    this.loadModelService.Observables.actualModel.subscribe(actualModel => {
      this.modelName = actualModel.name;
      this.currentModel = actualModel;
    });
    this.loadModelService.Observables.actualCollection.subscribe(actualCompilation => {
      this.currentCompilation = actualCompilation;
    });
    this.loadModelService.Observables.actualModelMeshes.subscribe(actualModelMeshes => {
      this.actualModelMeshes = actualModelMeshes;
      this.loadAnnotations();
    });
    this.loadModelService.defaultLoad.subscribe(defaultLoad => {
      this.isDefaultLoad = defaultLoad;
    });


    // this.socketService.socket.fromEvent('message').subscribe(result => { 
    //   console.log(result);
    // });
    this.socketService.socket.on('message', result => { 
      console.log(result);
    });

    // 1.2.1
    // -- Wenn man dem Raum beitritt
    this.socketService.socket.on('onlineCollaborators', result => { 
      console.log(result);
      for (const annotation of result){
        this.collaboratorsAnnotations.push(annotation);
      }
      // CREATE ANNOTATIONMARKERS FÜR ELEMENTE DER COLLABORATORS  ===> UM EINZELNE BENUTZER-ID ERWEITERN FÜR FARBE (BENUTZER-FARBEN ???)
    });
    
    // 1.2.2
    // -- Wenn eine Person eine Annotation erstellt
    this.socketService.socket.on('createAnnotation', result => { 
      this.collaboratorsAnnotations.push(result);
    });
    
    // 1.2.3
    // -- Wenn eine Person eine Annotation bearbeitet
    this.socketService.socket.on('editAnnotation', result => { 
      const index: number = this.collaboratorsAnnotations.indexOf(result);
      if (index !== -1) {
        this.collaboratorsAnnotations[index] = result;
      }
    });

    // 1.2.4
    // -- Wenn eine Person eine Annotation löscht
    this.socketService.socket.on('deleteAnnotation', result => { 
      const index: number = this.collaboratorsAnnotations.indexOf(result);
      if (index !== -1) {
        this.collaboratorsAnnotations.splice(index, 1);
      }
    });

    // 1.2.5
    // -- Wenn eine Person das Ranking bearbeitet
    this.socketService.socket.on('changeRanking', result => { 
      let i = 0;
      for (const annotation of this.collaboratorsAnnotations){       
        for (let j=0; j < result[0].length; j++){
          if (result[0][j] === annotation._id){
            this.collaboratorsAnnotations[i].ranking = result[1][j];
          }
        }
        i++;
      }        
    });

    // 1.2.6 
    // -- Wenn eine Person die Verbindung verliert
    this.socketService.socket.on('lostConnection', result => { 
      console.log(result);
      // Delete all user's annotations? ||| or draw markrs gray?
    });

    // 1.2.7
    // -- Wenn eine neue Person dazu kommt
    this.socketService.socket.on('newUser', result => { 
      for (const annotation of result){
        this.collaboratorsAnnotations.push(annotation);
      }
    });

    // 1.2.8
    // -- Wenn eine Person den Raum verlässt
    this.socketService.socket.on('changeRoom', result => { 
      
      let i=0;
      for (const annotation of this.collaboratorsAnnotations){
        if (annotation.creator._id === result){
          this.collaboratorsAnnotations.splice(i, 1);
        }
        i++;
      }
    });

  }

  // 1.1.5
  // -- Verbinden (Raum)            // EINTRITT ÜBER HTML-ELEMENT
  public async loginToSocket(){
    this.inSocket = true; 
    this.socketService.socket.connect();
    this.socketService.socket.emit('message', 'onlineCollaborators');                                         
    this.socketService.socket.emit('onlineCollaborators', [this.currentModel, this.currentCompilation]);      // to me only
    this.socketService.socket.emit('message', 'newUser');                                                     
    this.socketService.socket.emit('newUser', this.annotations); // broadcast
  }


  // 1.1.6
  // -- Verbindung trennen (Raum)                 // ---------- VERBINDUNGSABBRUNCH PRÜFEN ---------- GIBTS SCHON (!?!)
  public async lostConnectionSocket(){
    this.inSocket = false; 
    if (!this.inSocket){
      this.socketService.socket.emit('message', 'lostConnection User:' + this.loadModelService.currentUserData._id);
      this.socketService.socket.emit('message', 'disconnect User:' + this.loadModelService.currentUserData._id);
      this.socketService.socket.emit('lostConnection', this.loadModelService.currentUserData._id);
      this.socketService.socket.disconnect();
    }
  }

  // 1.1.7
  // -- Wenn eine Person den Raum verlässt          // ---------- MODEL-WECHSEL PRÜFEN ---------- GIBTS SCHON (!?!)
  public async changeModelSocket(){
    if (this.inSocket){
      this.socketService.socket.emit('message', 'changeRoom');
      this.socketService.socket.emit('changeRoom', this.loadModelService.currentUserData._id);  // broadcast
      this.loginToSocket();
    }
  }



  public async loadAnnotations() {

    BABYLON.Tags.AddTagsTo(this.actualModelMeshes, this.currentModel._id);

    // In diesem Array sollten alle Annotationen in der richtigen Reihenfolge liegen, die visuell für das aktuelle
    // Model relevant sind, zu Beginn also erstmal keine
    this.annotations = [];

    // Hier werden die Annotationen unsortiert rein geworfen, wenn sie aus der Datenbank kommen
    this.unsortedAnnotations = [];

    // Alle Marker, die eventuell vom vorherigen Modell noch da sind, sollen gelöscht werden
    await this.annotationmarkerService.deleteAllMarker();

    // Beim Laden eines Mdoells, werden alle in der PuchDB vorhandenen Annotationen in
    // das Array "allAnnotations" geladen
    if (this.isDefaultLoad === false) {
      await this.getAnnotations();
    } else {
      this.allAnnotations = [];
      this.allAnnotations.push(this.createDefaultAnnotation());
    }

    // Die Annotationen, die sich auf das aktuelle Model beziehen (also als relatedModel den Namen
    // des aktuellen Models aufweisen, werden raus gesucht und in das Array für unsortierte Annotationen
    // gepusht, da sie dort liegen ohne visuelle Elemente zu erzeugen
    await this.getActualAnnotations(this.currentModel._id);

    // Jetzt sollen die Annotationen sortiert werden und in der richtigen Reihenfolge in das Array geschrieben werden
    // Achtung: dann gibt es auch direkt einen visuellen Output durch die Components!
    // Da die Labels erst im nächsten Schritt gezeichnet werden, hängen die Fenster der Annotationen dann kurz ohne Position
    // in der oberen linken Ecke.
    // Die Labels werden gezeichnet und die Fenster haben nun einen Orientierungspunkt
    await this.sortAnnotations();

    // Das neu geladene Modell wird annotierbar, ist aber noch nicht klickbar -> das soll erst passieren,
    // wenn der Edit-Mode aufgerufen wird
    this.initializeAnnotationMode();

  }


  private async getAnnotations() {

    this.allAnnotations = [];
    this.allAnnotations = await this.fetchData();
    this.annotationmarkerService.toggleCreatorPopup('');
  }


  private async getActualAnnotations(modelName: string) {

    for (const annotation of this.allAnnotations) {
      if (annotation.target.source.relatedModel === modelName) {
        this.unsortedAnnotations.push(annotation);
      }
    }
  }

  private async sortAnnotations() {

    this.annotations = this.unsortedAnnotations;
    this.unsortedAnnotations = this.annotations.slice(0);
    this.annotations.splice(0, this.annotations.length);
    this.annotations = this.unsortedAnnotations.slice(0);

    await this.annotations.sort((leftSide, rightSide): number => {
      if (+leftSide.ranking < +rightSide.ranking) {
        return -1;
      }
      if (+leftSide.ranking > +rightSide.ranking) {
        return 1;
      }
      return 0;
    });
    // THIS.ANNOTATIONS SIND GELADEN // SORTIERTE ANNOTATIONS DES BENUTZERS (LOCAL POUCH-DB) FÜR DAS JEWEILIGE MODEL
    for (const annotation of this.annotations) {
      // VISUAL OUTPUT (MARKER)
      this.annotationmarkerService.createAnnotationMarker(annotation);
    }
  }


  // Die Annotationsfunktionalität wird zum aktuellen Modell hinzugefügt
  public initializeAnnotationMode() {
    this.actualModelMeshes.forEach(mesh => {
      this.actionService.createActionManager(mesh, ActionManager.OnDoublePickTrigger, this.createNewAnnotation.bind(this));
    });
    this.annotationMode(false);
  }


  // Das aktuelle Modell wird anklickbar und damit annotierbar
  public annotationMode(value: boolean) {
    this.actualModelMeshes.forEach(mesh => {
      this.actionService.pickableModel(mesh, value); 
    });
  }

  public async createNewAnnotation(result: any) {

    const camera = <BABYLON.ArcRotateCamera> this.babylonService.getActiveCamera();

    // Fetch userData if not existing
    if (!this.loadModelService.currentUserData) await this.loadModelService.getUserData();
    this.loadModelService.currentUserData = this.loadModelService.getUserData();
    // Inform user if userData still doesn't exist
    if (!this.loadModelService.currentUserData) {
      this.message.error(`Login check failed. Try again`);
      return;
    }

    this.babylonService.createPreviewScreenshot(400).then(async detailScreenshot => {
      // TODO: Detect if user is offline
      let generatedId: string = this.mongo.generateObjectId();
      await this.mongo.getUnusedObjectId().then(id => generatedId = id).catch(e => console.error(e));
      const newAnnotation: Annotation = {
        validated: false,
        _id: generatedId,
        identifier: generatedId,
        ranking: this.annotations.length + 1,
        creator: {
          type: 'person',
          name: this.loadModelService.currentUserData.fullname,
          _id: this.loadModelService.currentUserData._id,
        },
        created: new Date().toISOString(),
        generator: {
          type: 'software',
          name: environment.version,
          _id: this.loadModelService.currentUserData._id,
          homepage: 'https://github.com/DH-Cologne/Kompakkt',
        },
        motivation: 'defaultMotivation',
        // TODO: Overwrite when updating annotation
        lastModifiedBy: {
          type: 'person',
          name: this.loadModelService.currentUserData.fullname,
          _id: this.loadModelService.currentUserData._id,
        },
        body: {
          type: 'annotation',
          content: {
            type: 'text',
            title: '',
            description: '',
            relatedPerspective: {
              camera: camera.id,
              vector: {
                x: camera.alpha,
                y: camera.beta,
                z: camera.radius
              },
              preview: detailScreenshot
            }
          }
        },
        target: {
          source: {
            relatedModel: this.currentModel._id,
            relatedCompilation: (this.currentCompilation) ? this.currentCompilation._id : '',
          },
          selector: {
            referencePoint: {
              x: result.pickedPoint.x,
              y: result.pickedPoint.y,
              z: result.pickedPoint.z
            },
            referenceNormal: {
              x: result.getNormal(true, true).x,
              y: result.getNormal(true, true).y,
              z: result.getNormal(true, true).z
            }
          }
        }
      };
      this.add(newAnnotation);
      this.annotationmarkerService.createAnnotationMarker(newAnnotation);
      // set created annotation as is_open in annotationmarker.service ((on double click) created annotation)
      this.annotationmarkerService.toggleCreatorPopup(newAnnotation._id);

    });
  }
  
  private add(annotation): void {
    this.dataService.database.put(annotation);
    this.annotations.push(annotation);
    this.allAnnotations.push(annotation);

    // 1.1.1
    // - Annotation erstellen 
    if (this.socketService.socket){
      this.socketService.socket.emit('message', 'Annotation erstellen!');
      this.socketService.socket.emit("createAnnotation", annotation);
    }

  }

  public exportAnnotations() {
    return JSON.stringify(this.annotations);
  }

  public deleteAllAnnotations() {
    this.annotationmarkerService.deleteAllMarker();
    this.annotations.length = 0;
    this.allAnnotations.length = 0;
    this.dataService.database.destroy().then(() => {
      this.dataService.database = new PouchDB('annotationdb');
    });
  }

  public async importAnnotations(annotationsFile) {

    const annotations = JSON.parse(annotationsFile);
    this.unsortedAnnotations.length = 0;
    await this.annotationmarkerService.deleteAllMarker();
    for (const annotation of annotations) {
      this.unsortedAnnotations.push(annotation);
      this.annotationmarkerService.createAnnotationMarker(annotation);
    }
    this.dataService.database.bulkDocs(this.unsortedAnnotations);
    await this.sortAnnotations();
  }

  private async fetchData(): Promise<Array<any>> {
    
    return new Promise<any>((resolve, reject) => {

      const annotationList: Array<any> = [];
      this.dataService.fetch().then(result => {
    
        const rows = result.rows;
        for (const row of rows) {
          annotationList.push(row.doc);
        }
        resolve(annotationList);
      }, error => {
        reject(error);
      });
    });
  }

  public deleteAnnotation(annotation: Annotation) {
                          
    this.annotationmarkerService.deleteMarker(annotation._id);
    this.dataService.delete(annotation._id);
    const index: number = this.annotations.indexOf(annotation);

    if (index !== -1) {
      this.annotations.splice(index, 1);
    }
    const indexb: number = this.allAnnotations.indexOf(annotation);
    if (indexb !== -1) {
      this.allAnnotations.splice(indexb, 1);
    }

    // 1.1.4
    // - Löschen der Annotation
    if (this.socketService.socket){ 
      this.socketService.socket.emit('message', 'Annotation löschen!');
      this.socketService.socket.emit('deleteAnnotation', annotation._id);
    }

    this.changedRankingPositions();
  }


  public changedRankingPositions() {
  
    let i = 0;
    for (const annotation of this.annotations) {
      annotation.ranking = i + 1;
      this.annotationmarkerService.deleteMarker(annotation._id);
      this.annotationmarkerService.createAnnotationMarker(annotation);
      this.dataService.updateAnnotationRanking(annotation._id, annotation.ranking);
      i++;
    }

    // 1.1.3
    // - Ranking der Annotation ändern
    if (this.socketService.socket){
      this.socketService.socket.emit('message', 'Ranking bearbeiten!');
      let IdArray = new Array();
      let RankingArray = new Array();
      let IdandRankingArray = new Array();
      for (const annotation of this.annotations) {
        IdArray.push(annotation._id);
        RankingArray.push(annotation.ranking);
      }
      // IdandRankingArray.push(this.loadModelService.currentUserData._id);
      IdandRankingArray.push(IdArray);
      IdandRankingArray.push(RankingArray);
      // Send ID's & Ranking of annotations 
      this.socketService.socket.emit("changeRanking", IdandRankingArray);
    }
        
  }


  public createDefaultAnnotation(): Annotation {
     return {
      validated: true,
      _id: 'DefaultAnnotation',
      identifier: 'DefaultAnnotation',
      ranking: 1,
      creator: {
        type: 'Person',
        name: 'Get User Name',
        _id: 'userID',
      },
      created: '2019-01-18T22:05:31.230Z',
      generator: {
        type: 'Person',
        name: 'Get User Name',
        _id: 'Get User ID',
      },
      generated: 'Creation-Timestamp by Server',
      motivation: 'defaultMotivation',
      lastModificationDate: 'Last-Manipulation-Timestamp by Server',
      lastModifiedBy: {
        type: 'Person',
        name: 'Get User Name',
        _id: 'Get User ID',
      },
      body: {
        type: 'annotation',
        content: {
          type: 'text',
          title: 'Welcome to Kompakkt',
          description: 'Hi! I am an annotation of this cool logo. Please feel free to add a friend for me by clicking on the edit button in the corner on the right bottom and double click this 3D logo!',
          relatedPerspective: {
            camera: 'ArcRoatateCamera',
            vector: {
              x: 2.7065021761026817,
              y: 1.3419080619941322,
              z: 90.44884111420268
            },
           preview: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAZAAAADhCAYAAADmtuMcAAARU0lEQVR4Xu3de6xVZXoH4BcvXHQAPTJIlQxy08Y60yZYcNTUZESmGpUQgplJo41FJbaxamIijvWSpilNTKPRKS1/VGOdmGomBsJAGsdEg/iHo9UBagIKhJuCIhe5FhFp1poOOVwOZ5+1v3POXvt7VmJictb3ru993pXzc629wQHhIECAAAECFQQGVFhjCQECBAgQCAHiJiBAgACBSgICpBKbRQQIECAgQNwDBAgQIFBJQIBUYrOIAAECBASIe4AAAQIEKgkIkEpsFhEgQICAAHEPECBAgEAlAQFSic0iAgQIEBAg7gECBAgQqCQgQCqxWUSAAAECAsQ9QIAAAQKVBARIJTaLCBAgQECAuAcIECBAoJKAAKnEZhEBAgQICBD3AAECBAhUEhAgldgsIkCAAAEB4h4gQIAAgUoCAqQSm0UECBAgIEDcAwQIECBQSUCAVGKziAABAgQEiHuAAAECBCoJCJBKbBYRIECAgABxDxAgQIBAJQEBUonNIgIECBAQIO4BAgQIEKgkIEAqsVlEgAABAgLEPUCAAAEClQQGTJo06WillRYRIECAQNYCAiTr8WueAAEC1QUESHU7KwkQIJC1gADJevyaJ0CAQHUBAVLdzkoCBAhkLSBAsh6/5gkQIFBdQIBUt7OSAAECWQsIkKzHr3kCBAhUFxAg1e2sJECAQNYCAiTr8WueAAEC1QUESHU7KwkQIJC1gADJevyaJ0CAQHUBAVLdzkoCBAhkLSBAsh6/5gkQIFBdQIBUt7OSAAECWQsIkKzHr3kCBAhUFxAg1e2sJECAQNYCAiTr8WueAAEC1QUESHU7KwkQIJC1gADJevyaJ0CAQHUBAVLdzkoCBAhkLSBAsh6/5gkQIFBdQIBUt7OSAAECWQsIkKzHr3kCBAhUFxAg1e2sJECAQNYCAiTr8WueAAEC1QUESHU7KwkQIJC1gADJevyaJ0CAQHUBAVLdzkoCBAhkLSBAsh6/5gkQIFBdQIBUt7OyTQWmTZsW48ePj3Xr1sXrr7/epl1qi0DzAgKkeUMV2kxgwYIFxzqaM2dOm3WnHQLpBARIOkuV2kRAgLTJILXR6wICpNeJXaBuAgKkbhOz3/4SECD9Je+6LSsgQFp2NDbWYgICpMUGYjv9LyBA+n8GdlAPAQFSjznZZR8KCJA+xHapWgsIkFqPz+Z7Q0CA9Iaqmu0oIEDacap6akpAgDTFZ3FGAgIko2FrtTEBAdKYk7MICBD3AIETBASIW4JAYwICpDEnZ2UkIEAyGrZWmxIQIE3xWdyOAgKkHaeqp94QECC9oapmrQUESK3HZ/N9KCBA+hDbpeohIEDqMSe77H8BAdL/M7CDFhMQIC02ENtpWQEB0rKjsbH+EhAg/SXvunUTECB1m5j99rqAAOl1YhdoEwEB0iaD1EY6AQGSzlKl9hYQIO09X91VEBAgFdAsyVJAgGQ5dk2fTkCAuD8INCYgQBpzclZGAgIko2FrtSkBAdIUn8XtKCBA2nGqeuoNAQHSG6pq1lpAgNR6fDbfhwICpA+xXaoeAgKkHnOyy/4XECD9PwM7aDEBAdJiA7GdlhUQIC07GhvrLwEB0l/yrls3AQFSt4nZb68LCJBeJ3aBNhEQIG0ySG2kExAg6SxVam8BAdLe89VdBQEBUgHNkiwFBEiWY9f06QQEiPuDQGMCAqQxJ2dlJCBAMhq2VpsSECBN8VncrgKXXHJJbNiwoV3b0xeBJAICJAmjIgQIEMhPQIDkN3MdEyBAIImAAEnCqAgBAgTyExAg+c1cxwQIEEgiIECSMCpCgACB/AQESH4z13EXAmPGjIlZs2bFqFGjYuDAgbF37974+OOPY9WqVfHBBx9wI0DgBAEB4pbISmDs2LFx9dVXxxVXXBEdHR1N9X706NHYtWtX+c+mTZvinXfeic2bNzdV02ICdRIQIHWalr02JDBs2LCYOnVq7N+/P957773YuXNnua7zHxDsrtDabQdjwqgh3Z3W0M+LfSxcuDCWLVvW0PlOIlAXAQFSl0nZZ8MC8+bNa/jpYv0XB+Off7U53l+/N458e7Tba4wcNjDGjhwcfzLmO3H998+PcSMbC5mlS5fGokWLuq3vBAJ1EhAgdZqWvTYk0JMAOVXBvQePxJqtB2LVpn2xfM1XsWLjvjh30Jkx7QcdMXPKd+MPLzqnoX10Pumll16K5cuX93idBQRaWUCAtPJ07K2SQOcAeeGtrbFx+//GpHFDY/KEYXHh8IGVavZk0fxffxpvrNwVc6d/r7xmcQiQngg6ty4CAqQuk7LPhgUee+yxGD16dHn+v/760/j3N7d2ubYIlivHDY0f/6AjvjdicMPXKE78dOehWPLhjvjVBzvis12HTlo7/68uPRYgTz/9dKxevbpH9Z1MoNUFBEirT8j+eizw0EMPxcSJExsKkNMVH90xKH546fCYNHZoTPyDIfHGql3xy3e/iO17Dje0p//82z869kG8AGmIzEk1ExAgNRuY7XYvkCpAur/S6c/oHCCPPvpofPnll82WtJ5ASwkIkJYah82kEOgcIP+1Ymf83SvrU5TtcY3Xf/bH0fGds8t1AqTHfBbUQECA1GBIttgzAQHSMy9nE6gqIECqylnXsgKtGCBz5sxpWS8bI1BVQIBUlbOuZQXuvPPOuOqqq8r99ecrrPf/8cpjRgKkZW8XG2tCQIA0gWdpawoIkNaci121n4AAab+ZZt9RygCZMvG8+OXca2LAgAGx5DdbYs6//bZhX08gDVM5saYCAqSmg7PtrgVSBsijM8bEjD/97rGLXfmz9xumFyANUzmxpgICpKaDs+3GAuQ3a/fEXz//cWWuzgGy+8A3MfUfPIFUxrSw7QQESNuNVEPTp0+Pm266qYQQIO4HAr0nIEB6z1blfhJIGSDzZ18ak8f/7i9E9ATSTwN12ZYVECAtOxobqyogQKrKWUegZwICpGdezq6BgACpwZBssS0EBEhbjFETnQUEiPuBQN8ICJC+cXaVPhS4/vrr47bbbiuv2OyH6J0/Ayn+x1Qzn/6fhjvxNd6GqZxYUwEBUtPB2XbXAtdcc03ccccd5Qlrtx2Mnzz7UWUuAVKZzsIMBARIBkPOrUUBktvE9dtfAgKkv+Rdt9cEBEiv0SpM4DgBAeKGaDuB3wfIWWedFSNGjY5H/mNlvPRGtT+Nvuih78fFHYNKo0Y+A/mLH02MXzz8o/L8TZs2xfbt28t/P9Xfxjt8+PD46quv2s5fQ/kICJB8Zp1Np52fQIqmhwwZEhdddFGcd955pcHf/+K/418WfxRf7D7YrUnnAPlk28H46Sk+T7ntz8bHK49OLWvt2rUr1q8/+f+AeGKAPPDAA9HR0RGXXXZZnH/++bFx48ZYtmxZLF68OHbv3t3tvpxAoBUEBEgrTMEeeiQwevTouOuuu+Lmm2+OQ4cOxWeffRYvvPBCLF26tKxT/Pzhhx+OgQMHdln34osvjhEjRkTxlLJmy+74m58vj2Urt8bhI98et6ZzgKzYuC9mL1hd/nz6Dy+JhU/+uPz3PXv2xCeffHLStdauXRtPPfXUKfdQBMipjnPPPTcmTJgQw4YNK/f26quvlsGyefPmHhk5mUBfCAiQvlB2jaYEzjjjjJgyZUo899xzZZ19+/bFmjVrjv9Fv2jRsQA58WJTp06NadOmRfHKqKtj8ODBMXbs2PJppfir2+cv/ij+6ZXfxs//cuyxV1jrtx+KWX9+dVli//79sXr178Kk87Fz58548skny2A73VGE23XXXRcTJ048bdAVNYq9jRs3rtx/YVEEysKFC4VKU3eVxSkEBEgKRTWSC4waNSrmzp0b1157bRw+fDi2bNkSxS/nUx2ff/55PP744w3vofhlPHv27PIJ5HTHmDFjYuvWrfH111+Xp51zzjlx4MCBk5bs3bs3HnnkkXKfzR433HBDQ6FSXGf8+PHla7kzzzwz1q1bFwsWLCg/c+kuvJrdo/UEfi8gQNwLLSEwaNCgmDVrVhSvdo4ePRrFL+VTvRYqNvvNN9/EkiVLunziqNJQ8dRQhFbx9NHIUezx5ZdfLp8GevMoPh+58cYb44ILLiiDorujeIoaOnRo+fprw4YNpdOHH354LAS7W+/nBHoiIEB6ouXcpALFL7o333yzrHnkyJEyMIpXQ6c6iqeA++67L+n1T1fs9ttvL1+bnX322ced9u6778bzzz/fZ/s41YWKz0luueWWGDlyZPlKq7ujeNIqwrEIoCL4XnzxxXj77bfj22+P/7ynuzp+TuBEAQHinugzgeK/7u+55564++67y2sWr56KV1NdHdu2bYsnnniiz/ZX5wsVQTdjxozy22aNHEUIFh/+Owg0IyBAmtGztluByZMnx7PPPlu+UimOFStWlK+gujrmz58fK1euLP9L2VFdoAjr4ttot95660lPUUXVZ555pnpxKwn8v4AAcSskFyg+oL733nvLusWH0MWTxOlelzz44IOn/HA6+cYyL1i8wrrwwgvLMC/+kKODQLMCAqRZQetPEii+Mjtz5swuZd5666147bXXfFvIvUOg5gICpOYDbMXtX3755XH//fcft7V58+aV3wpyECDQPgICpH1m2VKdFN8OKr6CumPHjpbal80QIJBOQICks1SJAAECWQkIkKzGrVkCBAikExAg6SxVIkCAQFYCAiSrcWuWAAEC6QQESDpLlQgQIJCVgADJatyaJUCAQDoBAZLOUiUCBAhkJSBAshq3ZgkQIJBOQICks1SJAAECWQkIkKzGrVkCBAikExAg6SxVIkCAQFYCAiSrcWuWAAEC6QQESDpLlQgQIJCVgADJatyaJUCAQDoBAZLOUiUCBAhkJSBAshq3ZgkQIJBOQICks1SJAAECWQkIkKzGrVkCBAikExAg6SxVIkCAQFYCAiSrcWuWAAEC6QQESDpLlQgQIJCVgADJatyaJUCAQDoBAZLOUiUCBAhkJSBAshq3ZgkQIJBOQICks1SJAAECWQkIkKzGrVkCBAikExAg6SxVIkCAQFYCAiSrcWuWAAEC6QQESDpLlQgQIJCVgADJatyaJUCAQDoBAZLOUiUCBAhkJSBAshq3ZgkQIJBOQICks1SJAAECWQkIkKzGrVkCBAikExAg6SxVIkCAQFYCAiSrcWuWAAEC6QQESDpLlQgQIJCVgADJatyaJUCAQDoBAZLOUiUCBAhkJSBAshq3ZgkQIJBOQICks1SJAAECWQkIkKzGrVkCBAikExAg6SxVIkCAQFYCAiSrcWuWAAEC6QQESDpLlQgQIJCVgADJatyaJUCAQDoBAZLOUiUCBAhkJSBAshq3ZgkQIJBOQICks1SJAAECWQkIkKzGrVkCBAikExAg6SxVIkCAQFYCAiSrcWuWAAEC6QQESDpLlQgQIJCVgADJatyaJUCAQDoBAZLOUiUCBAhkJSBAshq3ZgkQIJBOQICks1SJAAECWQkIkKzGrVkCBAikExAg6SxVIkCAQFYCAiSrcWuWAAEC6QQGpCulEgECBAjkJCBAcpq2XgkQIJBQQIAkxFSKAAECOQkIkJymrVcCBAgkFBAgCTGVIkCAQE4CAiSnaeuVAAECCQUESEJMpQgQIJCTgADJadp6JUCAQEIBAZIQUykCBAjkJCBAcpq2XgkQIJBQQIAkxFSKAAECOQkIkJymrVcCBAgkFBAgCTGVIkCAQE4CAiSnaeuVAAECCQUESEJMpQgQIJCTgADJadp6JUCAQEIBAZIQUykCBAjkJCBAcpq2XgkQIJBQQIAkxFSKAAECOQkIkJymrVcCBAgkFBAgCTGVIkCAQE4CAiSnaeuVAAECCQUESEJMpQgQIJCTgADJadp6JUCAQEIBAZIQUykCBAjkJCBAcpq2XgkQIJBQQIAkxFSKAAECOQkIkJymrVcCBAgkFBAgCTGVIkCAQE4C/weLi1NGQXXHbQAAAABJRU5ErkJggg==',
          }
        }
      },
      target: {
        source: {
          relatedModel: 'Cube',
        },
        selector: {
          referencePoint: {
            x: -10.204414220764392,
            y: 10.142734374740286,
            z: -3.9197811803792177
          },
          referenceNormal: {
            x: -0.8949183602315889,
            y: 0.011999712324764563,
            z: -0.44606853220612525
          }
        }
      }
    };
  }

}
