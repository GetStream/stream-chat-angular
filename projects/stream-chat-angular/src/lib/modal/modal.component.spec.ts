import { SimpleChange } from '@angular/core';
import {
  ComponentFixture,
  fakeAsync,
  TestBed,
  tick,
} from '@angular/core/testing';

import { ModalComponent } from './modal.component';

describe('ModalComponent', () => {
  let component: ModalComponent;
  let fixture: ComponentFixture<ModalComponent>;
  let queryModal: () => HTMLElement | null;
  let queryCloseButton: () => HTMLElement | null;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ModalComponent],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ModalComponent);
    component = fixture.componentInstance;
    const nativeElement = fixture.nativeElement as HTMLElement;
    queryModal = () => nativeElement.querySelector('[data-testid="modal"]');
    queryCloseButton = () =>
      nativeElement.querySelector('[data-testid="close"]');
    fixture.detectChanges();
  });

  it('should open modal', () => {
    component.isOpen = false;
    fixture.detectChanges();
    const modal = queryModal();

    expect(modal?.classList.contains('str-chat__modal--close')).toBeTrue();

    component.isOpen = true;
    fixture.detectChanges();

    expect(modal?.classList.contains('str-chat__modal--open')).toBeTrue();
  });

  it('should close modal', () => {
    component.isOpen = true;
    fixture.detectChanges();
    queryCloseButton()?.click();
    fixture.detectChanges();

    expect(
      queryModal()?.classList.contains('str-chat__modal--close')
    ).toBeTrue();
  });

  it('close if esc is pressed', () => {
    component.isOpen = true;
    component.ngOnChanges({ isOpen: {} as any as SimpleChange });
    fixture.detectChanges();
    const event = new KeyboardEvent('keyup', { key: 'Escape' });
    window?.dispatchEvent(event);
    fixture.detectChanges();

    expect(
      queryModal()?.classList.contains('str-chat__modal--close')
    ).toBeTrue();
  });

  it('should close if clicked outside of modal', fakeAsync(() => {
    let eventHandler: Function | undefined;
    spyOn(window, 'addEventListener').and.callFake(
      (_: string, handler: any) => {
        eventHandler = handler as Function;
      }
    );
    spyOn(window, 'removeEventListener');
    component.isOpen = true;
    component.ngOnChanges({ isOpen: {} as any as SimpleChange });
    tick();
    fixture.detectChanges();
    eventHandler!(queryModal());
    fixture.detectChanges();

    expect(
      queryModal()?.classList.contains('str-chat__modal--close')
    ).toBeTrue();

    expect(window.removeEventListener).toHaveBeenCalledWith(
      'click',
      jasmine.any(Function)
    );
  }));

  it('should remove outside click listener, if modal was closed from the outside', () => {
    spyOn(window, 'removeEventListener');
    component.isOpen = false;
    component.ngOnChanges({ isOpen: {} as any as SimpleChange });

    expect(window.removeEventListener).toHaveBeenCalledWith(
      'click',
      jasmine.any(Function)
    );
  });

  it('should emit if modal is closed', () => {
    const spy = jasmine.createSpy();
    component.isOpenChange.subscribe(spy);
    component.isOpen;
    component.close();

    expect(spy).toHaveBeenCalledWith(false);
  });

  it('should remove event listener if modal if closed from the outside', () => {
    spyOn(window, 'removeEventListener');
    component.isOpen = false;
    component.ngOnChanges({ isOpen: {} as any as SimpleChange });
    fixture.detectChanges();

    expect(window.removeEventListener).toHaveBeenCalledWith(
      'click',
      jasmine.any(Function)
    );

    expect(window.removeEventListener).toHaveBeenCalledWith(
      'keyup',
      jasmine.any(Function)
    );
  });
});
