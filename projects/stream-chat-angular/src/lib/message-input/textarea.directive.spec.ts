import {
  ComponentRef,
  EventEmitter,
  OnChanges,
  SimpleChange,
  ViewContainerRef,
} from '@angular/core';
import { UserResponse } from 'stream-chat';
import { TextareaDirective } from './textarea.directive';
import { TextareaInterface } from './textarea.interface';

describe('TextareaDirective', () => {
  let mockComponent: TextareaInterface & OnChanges;
  let directive: TextareaDirective;

  describe('with textarea component', () => {
    beforeEach(() => {
      directive = new TextareaDirective({} as ViewContainerRef);
      mockComponent = {
        value: '',
        inputMode: 'desktop',
        autoFocus: false,
        valueChange: new EventEmitter<string>(),
        send: new EventEmitter<void>(),
        ngOnChanges: () => {},
      };
      directive.componentRef = {
        instance: mockComponent,
      } as ComponentRef<TextareaInterface & OnChanges>;
    });

    it('should pass on #value', () => {
      directive.value = 'this is my message';
      directive.ngOnChanges({ value: {} as any as SimpleChange });

      expect(mockComponent.value).toEqual('this is my message');
    });

    it('should emit when component emits #valueChange', () => {
      const spy = jasmine.createSpy();
      directive.valueChange.subscribe(spy);
      directive.ngOnChanges({ componentRef: {} as any as SimpleChange });
      mockComponent.valueChange.next('Hi');

      expect(spy).toHaveBeenCalledWith('Hi');
    });

    it('should emit when component emits #send', () => {
      const spy = jasmine.createSpy();
      directive.send.subscribe(spy);
      directive.ngOnChanges({ componentRef: {} as any as SimpleChange });
      mockComponent.send.next();

      expect(spy).toHaveBeenCalledWith(undefined);
    });
  });

  describe('with autocomplete textarea component', () => {
    beforeEach(() => {
      directive = new TextareaDirective({} as ViewContainerRef);
      mockComponent = {
        value: '',
        inputMode: 'desktop',
        autoFocus: false,
        valueChange: new EventEmitter<string>(),
        send: new EventEmitter<void>(),
        userMentions: new EventEmitter<UserResponse[]>(),
        ngOnChanges: () => {},
      };
      directive.componentRef = {
        instance: mockComponent,
      } as ComponentRef<TextareaInterface & OnChanges>;
    });

    it('should emit when component emits #userMentions', () => {
      const spy = jasmine.createSpy();
      directive.userMentions.subscribe(spy);
      directive.ngOnChanges({ componentRef: {} as any as SimpleChange });
      mockComponent.userMentions!.next([]);

      expect(spy).toHaveBeenCalledWith([]);
    });

    it('should pass on #areMentionsEnabled', () => {
      directive.areMentionsEnabled = false;
      spyOn(mockComponent, 'ngOnChanges');
      directive.ngOnChanges({ areMentionsEnabled: {} as any as SimpleChange });

      expect(mockComponent.areMentionsEnabled).toBeFalse();
      expect(mockComponent.ngOnChanges).toHaveBeenCalledWith(
        jasmine.any(Object)
      );
    });

    it('should pass on #inputMode', () => {
      directive.inputMode = 'mobile';
      spyOn(mockComponent, 'ngOnChanges');
      directive.ngOnChanges({ inputMode: {} as any as SimpleChange });

      expect(mockComponent.inputMode).toBe('mobile');
      expect(mockComponent.ngOnChanges).toHaveBeenCalledWith(
        jasmine.any(Object)
      );
    });

    it('should pass on #autoFocus', () => {
      directive.autoFocus = true;
      spyOn(mockComponent, 'ngOnChanges');
      directive.ngOnChanges({ autoFocus: {} as any as SimpleChange });

      expect(mockComponent.autoFocus).toBe(true);
      expect(mockComponent.ngOnChanges).toHaveBeenCalledWith(
        jasmine.any(Object)
      );
    });
  });
});
