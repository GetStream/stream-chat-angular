import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Icon, IconComponent } from './icon.component';

describe('IconComponent', () => {
  let component: IconComponent;
  let fixture: ComponentFixture<IconComponent>;
  let nativeElement: HTMLElement;
  let queryIcon: (icon: Icon) => HTMLElement | null;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [IconComponent],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(IconComponent);
    component = fixture.componentInstance;
    nativeElement = fixture.nativeElement as HTMLElement;
    queryIcon = (icon) => nativeElement.querySelector(`[data-testid=${icon}]`);
    fixture.detectChanges();
  });

  it('should display action icon', () => {
    component.icon = 'action-icon';
    fixture.detectChanges();

    expect(queryIcon('action-icon')).not.toBeNull();
  });

  it('should display delivered icon', () => {
    component.icon = 'delivered-icon';
    fixture.detectChanges();

    expect(queryIcon('delivered-icon')).not.toBeNull();
  });

  it('should display reaction icon', () => {
    component.icon = 'reaction-icon';
    fixture.detectChanges();

    expect(queryIcon('reaction-icon')).not.toBeNull();
  });

  it('should display connection error icon', () => {
    component.icon = 'connection-error';
    fixture.detectChanges();

    expect(queryIcon('connection-error')).not.toBeNull();
  });

  it('should display send icon', () => {
    component.icon = 'send';
    fixture.detectChanges();

    expect(queryIcon('send')).not.toBeNull();
  });

  it('should display file upload icon', () => {
    component.icon = 'file-upload';
    fixture.detectChanges();

    expect(queryIcon('file-upload')).not.toBeNull();
  });

  it('should display retry icon', () => {
    component.icon = 'retry';
    fixture.detectChanges();

    expect(queryIcon('retry')).not.toBeNull();
  });

  it('should display close icon', () => {
    component.icon = 'close';
    fixture.detectChanges();

    expect(queryIcon('close')).not.toBeNull();
  });

  it('should display file icon', () => {
    component.icon = 'file';
    fixture.detectChanges();

    expect(queryIcon('file')).not.toBeNull();
  });

  it('should not display anything if #icon is not provided', () => {
    expect(nativeElement.innerHTML).not.toContain('svg');
  });
});
