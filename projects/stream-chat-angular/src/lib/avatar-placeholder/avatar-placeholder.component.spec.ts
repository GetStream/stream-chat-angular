import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { AvatarComponent } from '../avatar/avatar.component';

import { AvatarPlaceholderComponent } from './avatar-placeholder.component';

describe('AvatarPlaceholderComponent', () => {
  let component: AvatarPlaceholderComponent;
  let fixture: ComponentFixture<AvatarPlaceholderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AvatarPlaceholderComponent, AvatarComponent],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AvatarPlaceholderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should bind inputs', () => {
    const avatar = fixture.debugElement.query(By.directive(AvatarComponent))
      .componentInstance as AvatarComponent;

    expect(avatar.size).toBe(32);

    component.imageUrl = 'imageUrl';
    component.name = 'name';
    component.size = 5;
    fixture.detectChanges();

    expect(avatar.imageUrl).toBe('imageUrl');
    expect(avatar.name).toBe('name');
    expect(avatar.size).toBe(5);
  });
});
