import {
  AbstractControl,
  FormArray,
  FormControl,
  ValidatorFn,
} from '@angular/forms';

export function atLeastOneOption(): ValidatorFn {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (control: AbstractControl<any, any>) => {
    const formArray = control as FormArray<FormControl<string | null>>;
    const hasAtLeastOne = formArray.value.some((item) => !!item);
    return hasAtLeastOne ? null : { atLeastOne: true };
  };
}

export function maximumNumberOfVotes(
  canHaveMultipleVotes: FormControl<boolean>
): ValidatorFn {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (control: AbstractControl<any, any>) => {
    const formControl = control as FormControl<number | null>;
    return canHaveMultipleVotes.value && !formControl.value
      ? { maximumNumberOfVotes: true }
      : null;
  };
}
