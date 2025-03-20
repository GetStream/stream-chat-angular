import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Channel } from 'stream-chat';
import { AvatarComponent } from '../avatar/avatar.component';

import { AvatarPlaceholderComponent } from './avatar-placeholder.component';
import { ChangeDetectionStrategy } from '@angular/core';

describe('AvatarPlaceholderComponent', () => {
  let component: AvatarPlaceholderComponent;
  let fixture: ComponentFixture<AvatarPlaceholderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AvatarPlaceholderComponent, AvatarComponent],
    })
      .overrideComponent(AvatarPlaceholderComponent, {
        set: { changeDetection: ChangeDetectionStrategy.Default },
      })
      .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AvatarPlaceholderComponent);
    component = fixture.componentInstance;
    component.ngOnChanges();
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should bind inputs', () => {
    const avatar = fixture.debugElement.query(By.directive(AvatarComponent))
      .componentInstance as AvatarComponent;

    component.imageUrl = 'imageUrl';
    component.name = 'name';
    component.type = 'user';
    component.location = 'autocomplete-item';
    const user = { id: 'user-id' };
    component.user = user;
    component.ngOnChanges();
    fixture.detectChanges();

    expect(avatar.imageUrl).toBe('imageUrl');
    expect(avatar.name).toBe('name');
    expect(avatar.type).toBe('user');
    expect(avatar.location).toBe('autocomplete-item');
    expect(avatar.user).toBe(user);

    component.type = 'channel';
    const channel = { id: 'channel-id' } as Channel;
    component.channel = channel;
    component.ngOnChanges();
    fixture.detectChanges();

    expect(avatar.type).toEqual('channel');
    expect(avatar.channel).toEqual(channel);
  });
});
