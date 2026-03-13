import { Directive, HostListener, Optional, Self, ElementRef } from '@angular/core';
import { NgControl } from '@angular/forms';

@Directive({
  selector: '[appUppercase]',
  standalone: true
})
export class UppercaseDirective {
  constructor(
    private el: ElementRef,
    @Optional() @Self() private control: NgControl
  ) {}

  @HostListener('input', ['$event'])
  onInput(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input) return;

    const start = input.selectionStart;
    const end = input.selectionEnd;

    const uppercased = input.value.toUpperCase();
    
    // Update the DOM element directly
    input.value = uppercased;
    
    if (start !== null && end !== null) {
      input.setSelectionRange(start, end);
    }
    
    // Notify forms API
    if (this.control && this.control.control) {
        this.control.control.setValue(uppercased, { emitEvent: false });
    }
  }
}
