import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastContainerComponent } from './shared/components/toast-container/toast-container.component';
import { NavigationComponent } from './shared/components/navigation/navigation.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ToastContainerComponent, NavigationComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {}
