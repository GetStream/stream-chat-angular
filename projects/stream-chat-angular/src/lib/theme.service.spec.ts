import { TestBed } from '@angular/core/testing';

import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  let service: ThemeService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ThemeService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should set dark theme variables', () => {
    spyOn(document.documentElement.style, 'setProperty');
    service.theme$.next('dark');

    expect(document.documentElement.style.setProperty).toHaveBeenCalledWith(
      jasmine.any(String),
      jasmine.any(String)
    );
  });

  it('should set light theme variables', () => {
    spyOn(document.documentElement.style, 'setProperty');
    service.theme$.next('light');

    expect(document.documentElement.style.setProperty).toHaveBeenCalledWith(
      jasmine.any(String),
      null
    );
  });

  it('should set custom dark theme variables', () => {
    spyOn(document.documentElement.style, 'setProperty');
    service.customDarkThemeVariables = { '--white-snow': '#ffffff' };
    service.theme$.next('dark');

    expect(document.documentElement.style.setProperty).toHaveBeenCalledWith(
      '--white-snow',
      '#ffffff'
    );
  });

  it('should set custom light theme variables', () => {
    spyOn(document.documentElement.style, 'setProperty');
    service.customLightThemeVariables = { '--white-snow': 'white' };
    service.theme$.next('light');

    expect(document.documentElement.style.setProperty).toHaveBeenCalledWith(
      '--white-snow',
      'white'
    );
  });

  it('should delete previously set custom light theme properties (theme is currently inactive)', () => {
    service.theme$.next('dark');
    spyOn(document.documentElement.style, 'setProperty');
    service.customLightThemeVariables = { '--white-snow': 'white' };
    service.customLightThemeVariables = { '--grey': 'darkgrey' };
    service.theme$.next('light');

    expect(document.documentElement.style.setProperty).toHaveBeenCalledWith(
      '--white-snow',
      null
    );
  });

  it('should delete previously set custom dark theme properties (theme is currently active)', () => {
    service.theme$.next('dark');
    spyOn(document.documentElement.style, 'setProperty');
    service.customDarkThemeVariables = { '--white-snow': 'black' };
    service.customDarkThemeVariables = { '--grey': 'darkgrey' };

    expect(document.documentElement.style.setProperty).toHaveBeenCalledWith(
      '--white-snow',
      null
    );
  });

  it('should merge custom dark properties with the default ones', () => {
    spyOn(document.documentElement.style, 'setProperty');
    service.customDarkThemeVariables = { '--grey': 'darkgrey' };
    service.theme$.next('dark');

    expect(document.documentElement.style.setProperty).toHaveBeenCalledWith(
      '--button-text',
      '#005fff'
    );
  });

  it('should apply changes to current theme immediately', () => {
    spyOn(document.documentElement.style, 'setProperty');
    service.customLightThemeVariables = { '--white-snow': 'white' };

    expect(document.documentElement.style.setProperty).toHaveBeenCalledWith(
      '--white-snow',
      'white'
    );
  });

  it('should apply changes to inactive theme when theme becomes active', () => {
    spyOn(document.documentElement.style, 'setProperty');
    service.customDarkThemeVariables = { '--white-snow': 'black' };
    service.theme$.next('dark');

    expect(document.documentElement.style.setProperty).toHaveBeenCalledWith(
      '--white-snow',
      'black'
    );
  });
});
