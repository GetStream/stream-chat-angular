import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ChangeDetectionStrategy } from '@angular/core';

import { IconPlaceholderComponent } from './icon-placeholder.component';
import { IconComponent } from '../icon.component';

describe('IconPlaceholderComponent', () => {
  let component: IconPlaceholderComponent;
  let fixture: ComponentFixture<IconPlaceholderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [IconPlaceholderComponent, IconComponent],
    })
      .overrideComponent(IconPlaceholderComponent, {
        set: { changeDetection: ChangeDetectionStrategy.Default },
      })
      .compileComponents();
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
    component.icon = 'action';
    component.ngOnChanges();
    fixture.detectChanges();

    const iconComponent = fixture.debugElement.query(
      By.directive(IconComponent),
    ).componentInstance as IconComponent;

    expect(iconComponent.icon).toBe('action');
  });

  it('should ipdate inputs', () => {
    component.icon = 'action';
    fixture.detectChanges();

    component.icon = 'arrow-down';
    component.ngOnChanges();
    fixture.detectChanges();

    let iconComponent = fixture.debugElement.query(By.directive(IconComponent))
      .componentInstance as IconComponent;

    expect(iconComponent.icon).toBe('arrow-down');

    component.ngOnChanges();
    fixture.detectChanges();

    iconComponent = fixture.debugElement.query(By.directive(IconComponent))
      .componentInstance as IconComponent;

    expect(iconComponent.icon).toBe('arrow-down');
  });
});
