import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PresencaService, Session } from '../../../core/presenca/presenca.service';
import { SupabaseService, Profile } from '../../../core/supabase/supabase.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-agenda',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './agenda.component.html'
})
export class AgendaComponent implements OnInit {
  private presencaService = inject(PresencaService);
  private supabaseService = inject(SupabaseService);
  private router = inject(Router);

  upcomingSessions = signal<Session[]>([]);
  isLoading = signal(true);
  errorMessage = signal('');
  showPastSessions = signal(false);
  
  profile = signal<Profile | null>(null);
  isAdmin = computed(() => this.profile()?.role === 'admin' || this.profile()?.role === 'chefe_de_naipe');

  ngOnInit() {
    this.supabaseService.profile$.subscribe(prof => {
      if (prof) this.profile.set(prof);
    });
    this.loadAgenda();
  }

  loadAgenda() {
    this.isLoading.set(true);
    this.presencaService.getAgendaSessions(this.showPastSessions()).subscribe({
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

  togglePastSessions() {
    this.showPastSessions.update(v => !v);
    this.loadAgenda();
  }

  // Helper para formatar o mês sem ponto
  getMonthAbbr(date: string): string {
    const month = new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(new Date(date));
    return month.replace('.', '').toUpperCase();
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

  goToAdmin() {
    this.router.navigate(['/admin']);
  }
}
