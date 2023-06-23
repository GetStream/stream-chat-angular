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
    component.ngOnChanges();
    fixture.detectChanges();

    const iconComponent = fixture.debugElement.query(
      By.directive(IconComponent)
    ).componentInstance as IconComponent;

    expect(iconComponent.icon).toBe('action-icon');
    expect(iconComponent.size).toBe(30);
  });

  it('should ipdate inputs', () => {
    component.icon = 'action-icon';
    component.size = 30;
    fixture.detectChanges();

    component.icon = 'arrow-down';
    component.ngOnChanges();
    fixture.detectChanges();

    let iconComponent = fixture.debugElement.query(By.directive(IconComponent))
      .componentInstance as IconComponent;

    expect(iconComponent.icon).toBe('arrow-down');
    expect(iconComponent.size).toBe(30);

    component.size = 25;
    component.ngOnChanges();
    fixture.detectChanges();

    iconComponent = fixture.debugElement.query(By.directive(IconComponent))
      .componentInstance as IconComponent;

    expect(iconComponent.icon).toBe('arrow-down');
    expect(iconComponent.size).toBe(25);
  });
});
