import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PresencaService, Session } from '../../../core/presenca/presenca.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-agenda',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './agenda.component.html'
})
export class AgendaComponent implements OnInit {
  private presencaService = inject(PresencaService);
  private router = inject(Router);

  upcomingSessions = signal<Session[]>([]);
  isLoading = signal(true);
  errorMessage = signal('');

  ngOnInit() {
    this.loadAgenda();
  }

  loadAgenda() {
    this.isLoading.set(true);
    this.presencaService.getUpcomingSessions().subscribe({
      next: (data) => {
        this.upcomingSessions.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.errorMessage.set('Erro ao carregar a agenda.');
        this.isLoading.set(false);
        console.error(err);
      }
    });
  }

  goBack() {
    this.router.navigate(['/dashboard']);
  }

  goToDashboard() {
    this.router.navigate(['/dashboard']);
  }

  goToProfile() {
    this.router.navigate(['/perfil']);
  }
}
