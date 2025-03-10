import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ChangeDetectionStrategy } from '@angular/core';

import { MessageActionComponent } from './message-action.component';

describe('MessageActionComponent', () => {
  let component: MessageActionComponent;
  let fixture: ComponentFixture<MessageActionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MessageActionComponent],
    })
      .overrideComponent(MessageActionComponent, {
        set: { changeDetection: ChangeDetectionStrategy.Default },
      })
      .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(MessageActionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
