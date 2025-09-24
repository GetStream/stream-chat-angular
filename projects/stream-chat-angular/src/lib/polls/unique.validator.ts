import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export function createUniqueValidator(
  isUnique: (v: string) => boolean
): ValidatorFn {
  return (control: AbstractControl<string>): ValidationErrors | null => {
    const value = control.value;

    if (!value) {
      return null;
    }

    if (!isUnique(value)) {
      return { duplicate: true };
    }

    return null;
  };
}
