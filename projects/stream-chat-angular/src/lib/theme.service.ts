import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type Theme = 'light' | 'dark';

/**
 * The `ThemeService` can be used to change the theme of the chat UI and to customize the theme. Our [theming guide](../theming/introduction.mdx) gives a complete overview about the topic.
 */
@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  /**
   * A Subject that can be used to get or set the currently active theme.
   */
  theme$ = new BehaviorSubject<Theme | string>('light');
  /**
   * Stream chat theme version - this is used internally by some UI components of the SDK, integrators shouldn't need to use this variable
   */
  themeVersion: '1' | '2';
  private _customLightThemeVariables: { [key: string]: string } | undefined;
  private _customDarkThemeVariables: { [key: string]: string } | undefined;
  private defaultDarkModeVariables = {
    '--bg-gradient-end': '#101214',
    '--bg-gradient-start': '#070a0d',
    '--black': '#ffffff',
    '--blue-alice': '#00193d',
    '--border': '#141924',
    '--button-background': '#ffffff',
    '--button-text': '#005fff',
    '--grey': '#7a7a7a',
    '--grey-gainsboro': '#2d2f2f',
    '--grey-whisper': '#1c1e22',
    '--modal-shadow': '#000000',
    '--overlay': '#00000066', // 66 = 40% opacity
    '--overlay-dark': '#ffffffcc', // CC = 80% opacity
    '--shadow-icon': '#00000080', // 80 = 50% opacity
    '--targetedMessageBackground': '#302d22',
    '--transparent': 'transparent',
    '--white': '#101418',
    '--white-smoke': '#13151b',
    '--white-snow': '#070a0d',
  };
  private variablesToDelete: { [key: string]: string }[] = [];

  constructor() {
    this.theme$.subscribe((theme) => {
      const darkVariables = this.customDarkThemeVariables
        ? { ...this.defaultDarkModeVariables, ...this.customDarkThemeVariables }
        : this.defaultDarkModeVariables;
      const lightVariables = this.customLightThemeVariables
        ? this.customLightThemeVariables
        : {};
      this.variablesToDelete.forEach((variables) =>
        this.deleteVariables(variables)
      );
      if (theme === 'dark') {
        this.deleteVariables(lightVariables);
        this.setVariables(darkVariables);
      } else {
        this.deleteVariables(darkVariables);
        this.setVariables(lightVariables);
      }
    });

    this.themeVersion = (getComputedStyle(document.documentElement)
      .getPropertyValue('--str-chat__theme-version')
      .replace(' ', '') || '1') as '1' | '2';
  }

  /**
   * A getter that returns the currently set custom light theme variables.
   * @deprecated Only use with [theme v1](../concepts/theming-and-css.mdx)
   * @returns An object where the keys are theme variables, and the values are the currently set CSS values.
   */
  get customLightThemeVariables() {
    return this._customLightThemeVariables;
  }

  /**
   * A setter that can be used to overwrite the values of the CSS theme variables of the light theme.
   * @deprecated Only use with [theme v1](../concepts/theming-and-css.mdx)
   * @param variables An object where the keys are theme variables, and the values are CSS values.
   */
  set customLightThemeVariables(
    variables: { [key: string]: string } | undefined
  ) {
    const prevVariables = this.customLightThemeVariables;
    if (prevVariables) {
      this.variablesToDelete.push(prevVariables);
    }
    this._customLightThemeVariables = variables;
    if (this.theme$.getValue() === 'light') {
      this.theme$.next('light');
    }
  }

  /**
   * A getter that returns the currently set custom dark theme variables.
   * @deprecated Only use with [theme v1](../concepts/theming-and-css.mdx)
   * @returns An object where the keys are theme variables, and the values are the currently set CSS values.
   */
  get customDarkThemeVariables() {
    return this._customDarkThemeVariables;
  }

  /**
   * A setter that can be used to overwrite the values of the CSS theme variables of the dark theme.
   * @deprecated Only use with [theme v1](../concepts/theming-and-css.mdx)
   * @param variables An object where the keys are theme variables, and the values are CSS values.
   */
  set customDarkThemeVariables(
    variables: { [key: string]: string } | undefined
  ) {
    const prevVariables = this.customDarkThemeVariables;
    if (prevVariables) {
      this.variablesToDelete.push(prevVariables);
    }
    this._customDarkThemeVariables = variables;
    if (this.theme$.getValue() === 'dark') {
      this.theme$.next('dark');
    }
  }

  private deleteVariables(variables: { [key: string]: string } | undefined) {
    if (!variables) {
      return;
    }
    Object.keys(variables).forEach((key) =>
      document.documentElement.style.setProperty(key, null)
    );
  }

  private setVariables(variables: { [key: string]: string } | undefined) {
    if (!variables) {
      return;
    }
    Object.keys(variables).forEach((key) =>
      document.documentElement.style.setProperty(key, variables[key])
    );
  }
}
