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
    component.size = 30;
    fixture.detectChanges();
    const icon = queryIcon('file');

    expect(icon).not.toBeNull();
    expect(icon?.clientWidth).toBe(component.size);
    expect(icon?.clientHeight).toBe(component.size);
  });

  it('should display reply icon', () => {
    component.icon = 'reply';
    fixture.detectChanges();

    expect(queryIcon('reply')).not.toBeNull();
  });

  it('should display close-no-outline icon', () => {
    component.icon = 'close-no-outline';
    fixture.detectChanges();

    expect(queryIcon('close-no-outline')).not.toBeNull();
  });

  it('should display reply-in-thread icon', () => {
    component.icon = 'reply-in-thread';
    fixture.detectChanges();

    expect(queryIcon('reply-in-thread')).not.toBeNull();
  });

  it('should display arrow-right icon', () => {
    component.icon = 'arrow-right';
    fixture.detectChanges();

    expect(queryIcon('arrow-right')).not.toBeNull();
  });

  it('should display arrow-left icon', () => {
    component.icon = 'arrow-left';
    fixture.detectChanges();

    expect(queryIcon('arrow-left')).not.toBeNull();
  });

  it('should display arrow-up icon', () => {
    component.icon = 'arrow-up';
    fixture.detectChanges();

    expect(queryIcon('arrow-up')).not.toBeNull();
  });

  it('should display arrow-down icon', () => {
    component.icon = 'arrow-down';
    fixture.detectChanges();

    expect(queryIcon('arrow-down')).not.toBeNull();
  });

  it('should display chat-bubble icon', () => {
    component.icon = 'chat-bubble';
    fixture.detectChanges();

    expect(queryIcon('chat-bubble')).not.toBeNull();
  });

  it('should display attach icon', () => {
    component.icon = 'attach';
    fixture.detectChanges();

    expect(queryIcon('attach')).not.toBeNull();
  });

  it('should display unspecified-filetype icon', () => {
    component.icon = 'unspecified-filetype';
    fixture.detectChanges();

    expect(queryIcon('unspecified-filetype')).not.toBeNull();
  });

  it('should display download icon', () => {
    component.icon = 'download';
    fixture.detectChanges();

    expect(queryIcon('download')).not.toBeNull();
  });

  it('should display error icon', () => {
    component.icon = 'error';
    fixture.detectChanges();

    expect(queryIcon('error')).not.toBeNull();
  });

  it('should not display anything if #icon is not provided', () => {
    expect(nativeElement.innerHTML).not.toContain('svg');
  });
});
