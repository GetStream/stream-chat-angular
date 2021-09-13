import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StreamChatAngularComponent } from './stream-chat-angular.component';

describe('StreamChatAngularComponent', () => {
  let component: StreamChatAngularComponent;
  let fixture: ComponentFixture<StreamChatAngularComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ StreamChatAngularComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(StreamChatAngularComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
