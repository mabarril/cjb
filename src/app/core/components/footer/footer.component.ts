import { Component, signal } from '@angular/core';
import packageJson from '../../../../../package.json';

@Component({
  selector: 'app-footer',
  standalone: true,
  templateUrl: './footer.component.html'
})
export class FooterComponent {
  protected readonly appVersion = signal(packageJson.version);
}
