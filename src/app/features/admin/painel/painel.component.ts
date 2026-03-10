import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { AdminService } from '../../../core/admin/admin.service';
import { Profile, SupabaseService } from '../../../core/supabase/supabase.service';
import { AuthService } from '../../../core/auth/auth.service';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { PresencaService, Session, AttendanceWithProfile } from '../../../core/presenca/presenca.service';

@Component({
    selector: 'app-painel',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './painel.component.html',
})
export class PainelComponent implements OnInit {
    private adminService = inject(AdminService);
    private authService = inject(AuthService);
    private supabaseService = inject(SupabaseService);
    private presencaService = inject(PresencaService);
    private router = inject(Router);

    pendingCoristas = signal<Profile[]>([]);
    isLoading = signal(true);

    // Status counts
    counts = signal<Record<string, number>>({
        agendado: 0,
        ativo: 0,
        finalizado: 0
    });

    // Selections
    selectedStatus = signal<'agendado' | 'ativo' | 'finalizado' | null>(null);
    allSessions = signal<Session[]>([]);

    filteredSessions = computed(() => {
        const s = this.selectedStatus();
        if (!s) return [];
        return this.allSessions().filter(session => session.status === s);
    });

    selectedSession = signal<Session | null>(null);
    attendees = signal<AttendanceWithProfile[]>([]);
    isLoadingAttendees = signal(false);

    ngOnInit() {
        // Check if user is actually admin
        this.supabaseService.profile$.subscribe(profile => {
            if (profile && profile.role !== 'admin') {
                this.router.navigate(['/dashboard']);
            } else if (profile && profile.role === 'admin') {
                this.loadData();
            }
        });
    }

    loadData() {
        this.isLoading.set(true);
        this.loadPendingCoristas();
        this.loadCounts();
        this.loadAllSessions();
    }

    loadPendingCoristas() {
        this.adminService.getPendingCoristas().subscribe({
            next: (coristas) => {
                this.pendingCoristas.set(coristas);
                this.checkLoadingState();
            },
            error: (err) => {
                console.error("Erro ao carregar pendentes:", err);
                this.checkLoadingState();
            }
        });
    }

    loadCounts() {
        this.presencaService.getSessionsCountByStatus().subscribe({
            next: (data) => {
                this.counts.set(data);
                this.checkLoadingState();
            },
            error: (err) => {
                console.error("Erro ao carregar contagem:", err);
                this.checkLoadingState();
            }
        });
    }

    loadAllSessions() {
        this.presencaService.getAllSessions().subscribe({
            next: (data) => {
                this.allSessions.set(data);
                this.checkLoadingState();
            },
            error: (err) => {
                console.error("Erro ao carregar sessões:", err);
                this.checkLoadingState();
            }
        });
    }

    private checkLoadingState() {
        // In a real app we'd use forkJoin for this, but keeping it simple
        this.isLoading.set(false);
    }

    selectStatus(status: 'agendado' | 'ativo' | 'finalizado') {
        this.selectedStatus.set(status);
        this.selectedSession.set(null);
        this.attendees.set([]);
    }

    selectSession(session: Session) {
        this.selectedSession.set(session);
        this.loadAttendees(session.id);
    }

    loadAttendees(sessionId: string) {
        this.isLoadingAttendees.set(true);
        this.presencaService.getSessionAttendees(sessionId).subscribe({
            next: (data) => {
                this.attendees.set(data);
                this.isLoadingAttendees.set(false);
            },
            error: (err) => {
                console.error("Erro ao carregar presentes:", err);
                this.isLoadingAttendees.set(false);
            }
        });
    }

    approve(id: string) {
        this.adminService.approveCorista(id).subscribe({
            next: () => {
                this.pendingCoristas.update(list => list.filter(c => c.id !== id));
            },
            error: (err) => console.error("Erro ao aprovar:", err)
        });
    }

    reject(id: string) {
        this.adminService.rejectCorista(id).subscribe({
            next: () => {
                this.pendingCoristas.update(list => list.filter(c => c.id !== id));
            },
            error: (err) => console.error("Erro ao reprovar:", err)
        });
    }

    goToEnsaios() {
        this.router.navigate(['/admin/ensaios']);
    }

    goToCoristas() {
        this.router.navigate(['/admin/coristas']);
    }

    goToDashboard() {
        this.router.navigate(['/dashboard']);
    }

    async logout() {
        await this.authService.signOut().toPromise();
        this.router.navigate(['/login']);
    }

    getStatusLabel(status: string): string {
        switch (status) {
            case 'agendado': return 'Agendados';
            case 'ativo': return 'Ativos';
            case 'finalizado': return 'Encerrados';
            default: return status;
        }
    }
}
