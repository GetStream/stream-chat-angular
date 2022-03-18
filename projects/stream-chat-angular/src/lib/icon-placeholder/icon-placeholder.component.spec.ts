import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { IconComponent } from '../icon/icon.component';

import { IconPlaceholderComponent } from './icon-placeholder.component';

describe('IconPlaceholderComponent', () => {
  let component: IconPlaceholderComponent;
  let fixture: ComponentFixture<IconPlaceholderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [IconPlaceholderComponent, IconComponent],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(IconPlaceholderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should bind inputs', () => {
    component.icon = 'action-icon';
    component.size = 30;
    fixture.detectChanges();

    const iconComponent = fixture.debugElement.query(
      By.directive(IconComponent)
    ).componentInstance as IconComponent;

    expect(iconComponent.icon).toBe('action-icon');
    expect(iconComponent.size).toBe(30);
  });
});
