import { TestBed } from '@angular/core/testing';
import { ChannelListToggleService } from './channel-list-toggle.service';

describe('ChannelListToggleService', () => {
  let service: ChannelListToggleService;
  let addEventListenerSpy: jasmine.Spy;
  let removeEventListenerSpy: jasmine.Spy;

  beforeEach(() => {
    service = TestBed.inject(ChannelListToggleService);
    addEventListenerSpy = spyOn(window, 'addEventListener').and.callFake(
      () => {}
    );
    removeEventListenerSpy = spyOn(window, 'removeEventListener').and.callFake(
      () => {}
    );
  });

  it('should toggle open state', () => {
    service.close();
    let isOpen;
    service.isOpen$.subscribe((i) => (isOpen = i));

    expect(isOpen).toBeFalse();

    service.open();

    expect(isOpen).toBeTrue();
  });

  it('should toggle menu', () => {
    service.open();
    const spy = jasmine.createSpy();
    service.isOpen$.subscribe(spy);
    service.open();
    spy.calls.reset();
    service.toggle();

    expect(spy).toHaveBeenCalledWith(false);
  });

  it('should set state to closed, if channel is selected', () => {
    spyOnProperty(window, 'innerWidth').and.returnValue(300);
    service.open();
    const spy = jasmine.createSpy();
    service.isOpen$.subscribe(spy);
    spy.calls.reset();
    service.channelSelected();

    expect(spy).toHaveBeenCalledOnceWith(false);
  });

  it(`shouldn't emit the same state twice`, () => {
    const spy = jasmine.createSpy();
    service.isOpen$.subscribe(spy);
    spy.calls.reset();

    service.open();
    service.open();

    expect(spy).toHaveBeenCalledOnceWith(true);
  });

  it('should watch for outside clicks, if menu is opened', () => {
    spyOnProperty(window, 'innerWidth').and.returnValue(300);
    service.setMenuElement({} as HTMLElement);
    service.open();

    expect(addEventListenerSpy).toHaveBeenCalledWith(
      'click',
      jasmine.any(Function)
    );

    addEventListenerSpy.calls.reset();
    service.close();

    expect(addEventListenerSpy).not.toHaveBeenCalled();
  });

  it('should stop watching for outside clicks, if menu is closed', () => {
    spyOnProperty(window, 'innerWidth').and.returnValue(300);
    service.setMenuElement({} as HTMLElement);
    service.open();
    service.close();

    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      'click',
      jasmine.any(Function)
    );
  });
});
