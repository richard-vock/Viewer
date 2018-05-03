import {BrowserModule} from '@angular/platform-browser';
import {NgModule} from '@angular/core';

import {NgbModule} from '@ng-bootstrap/ng-bootstrap';

import {AppComponent} from './app.component';
import {SceneComponent} from './components/scene/scene.component';
import {MenuComponent} from './menu/menu.component';
import {AnnotationsComponent} from './components/annotations/annotations.component';

import {CameraService} from './services/camera/camera.service';
import {BabylonService} from './services/engine/babylon.service';
import {SkyboxService} from './services/skybox/skybox.service';
import {LanguageService} from './services/language/language.service';
import {DataService} from './services/data/data.service';

@NgModule({
  declarations: [
    AppComponent,
    SceneComponent,
    MenuComponent,
    AnnotationsComponent
  ],
  imports: [
    BrowserModule,
    NgbModule.forRoot()
  ],
  providers: [
    SkyboxService,
    AnnotationsComponent,
    CameraService,
    BabylonService,
    LanguageService,
    DataService
  ],
  bootstrap: [AppComponent]
})
export class AppModule {
}
