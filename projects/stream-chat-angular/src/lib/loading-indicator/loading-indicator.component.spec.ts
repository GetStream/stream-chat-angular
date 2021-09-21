import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LoadingIndicatorComponent } from './loading-indicator.component';

describe('LoadingIndicatorComponent', () => {
  let component: LoadingIndicatorComponent;
  let fixture: ComponentFixture<LoadingIndicatorComponent>;
  let nativeElement: HTMLElement;
  let queryContainer: () => SVGElement | null;
  let queryStopColor: () => SVGStopElement | null;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [LoadingIndicatorComponent],
    });
    fixture = TestBed.createComponent(LoadingIndicatorComponent);
    component = fixture.componentInstance;
    nativeElement = fixture.nativeElement as HTMLElement;
    queryContainer = () =>
      nativeElement.querySelector('[data-testid=loading-indicator]');
    queryStopColor = () =>
      nativeElement.querySelector('[data-testid=stop-color]');
  });

  it('should display loading indicator', () => {
    fixture.detectChanges();
    const container = queryContainer();

    expect(container).not.toBeNull();
    expect(container!.clientWidth).toBe(component.size);
    expect(container!.clientHeight).toBe(component.size);
  });

  it('should display loading indicator with provided #size and #color', () => {
    const size = 20;
    const color = '#b19d97';
    const rgbColor = 'rgb(177, 157, 151)';
    component.size = size;
    component.color = color;
    fixture.detectChanges();
    const container = queryContainer();
    const stopColor = queryStopColor();

    expect(container!.clientWidth).toBe(size);
    expect(container!.clientHeight).toBe(size);

    expect(stopColor?.style.stopColor).toBe(rgbColor);
  });
});
