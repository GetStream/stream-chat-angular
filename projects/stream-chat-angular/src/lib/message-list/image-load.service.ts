import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ImageLoadService {
  imageLoad$ = new Subject<void>();

  constructor() {}
}
