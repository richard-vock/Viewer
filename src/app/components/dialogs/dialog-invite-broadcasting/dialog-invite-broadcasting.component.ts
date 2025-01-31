import { Component } from '@angular/core';

import { ProcessingService } from '../../../services/processing/processing.service';

import { ICompilation } from 'src/common';

@Component({
  selector: 'app-dialog-invite-broadcasting',
  templateUrl: './dialog-invite-broadcasting.component.html',
  styleUrls: ['./dialog-invite-broadcasting.component.scss'],
})
export class DialogInviteBroadcastingComponent {
  public text =
    'Hi! Do you like new innovative things? Come and join me on Kompakkt and ' +
    'let us use the collaborative Annotationmode! Join me on: ';

  public baseURL = 'https://blacklodge.hki.uni-koeln.de/builds/Kompakkt/live/?compilation=';
  public defaultURL = 'https://blacklodge.hki.uni-koeln.de/builds/Kompakkt/live/';
  public collectionId: string | undefined;

  public compilation: ICompilation | undefined;

  constructor(public processing: ProcessingService) {
    this.processing.compilation$.subscribe(compilation => (this.compilation = compilation));
  }

  copyInputMessage(inputElement: HTMLTextAreaElement) {
    inputElement.select();
    document.execCommand('copy');
    inputElement.setSelectionRange(0, 0);
  }
}
