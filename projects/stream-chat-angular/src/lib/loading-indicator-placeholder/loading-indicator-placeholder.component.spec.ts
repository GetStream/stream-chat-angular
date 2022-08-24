import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { LoadingIndicatorComponent } from '../loading-indicator/loading-indicator.component';

import { LoadingIndicatorPlaceholderComponent } from './loading-indicator-placeholder.component';

describe('LoadingIndicatorPlaceholderComponent', () => {
  let component: LoadingIndicatorPlaceholderComponent;
  let fixture: ComponentFixture<LoadingIndicatorPlaceholderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [
        LoadingIndicatorPlaceholderComponent,
        LoadingIndicatorComponent,
      ],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(LoadingIndicatorPlaceholderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should bind inputs', () => {
    const loadingIndicatorComponent = fixture.debugElement.query(
      By.directive(LoadingIndicatorComponent)
    ).componentInstance as LoadingIndicatorComponent;

    expect(loadingIndicatorComponent.color).toBe(
      `var(--str-chat__loading-indicator-color, var(--str-chat__primary-color, '#006CFF'))`
    );

    expect(loadingIndicatorComponent.size).toBe(15);

    component.color = 'red';
    component.size = 23;
    fixture.detectChanges();

    expect(loadingIndicatorComponent.color).toBe('red');
    expect(loadingIndicatorComponent.size).toBe(23);
  });
});
