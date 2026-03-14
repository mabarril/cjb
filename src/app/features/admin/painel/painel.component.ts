import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { AdminService } from '../../../core/admin/admin.service';
import { Profile, SupabaseService } from '../../../core/supabase/supabase.service';
import { AuthService } from '../../../core/auth/auth.service';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { PresencaService, Session, AttendanceWithProfile } from '../../../core/presenca/presenca.service';

export interface VoicePartStat {
    label: string;
    count: number;
    color: string;
    percentage: number;
}

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
    showManualModal = signal(false);
    searchQuery = signal('');
    allActiveCoristas = signal<Profile[]>([]);

    // Birthdays
    selectedMonth = signal<number>(new Date().getMonth() + 1);
    birthdays = signal<Profile[]>([]);
    isLoadingBirthdays = signal(false);

    // Coristas Stats
    totalCoristas = signal<number>(0);
    voicePartStats = signal<VoicePartStat[]>([]);
    isLoadingStats = signal(false);

    pieChartStyle = computed(() => {
        const stats = this.voicePartStats();
        if (stats.length === 0) return 'conic-gradient(#e2e8f0 0% 100%)';

        let currentPercent = 0;
        const gradientParts = stats.map(stat => {
            const start = currentPercent;
            currentPercent += stat.percentage;
            return `${stat.color} ${start}% ${currentPercent}%`;
        });

        return `conic-gradient(${gradientParts.join(', ')})`;
    });

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

    availableCoristas = computed(() => {
        const active = this.allActiveCoristas();
        const currentAttendeesIds = this.attendees().map(a => a.user_id);
        const query = this.searchQuery().toLowerCase();

        return active
            .filter(c => !currentAttendeesIds.includes(c.id))
            .filter(c => 
                c.username.toLowerCase().includes(query) || 
                c.full_name?.toLowerCase().includes(query)
            );
    });

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
        this.loadBirthdays();
        this.loadCoristasStats();
        this.loadAllActiveCoristas();
    }

    loadAllActiveCoristas() {
        this.adminService.getCoristas().subscribe({
            next: (coristas) => {
                this.allActiveCoristas.set(coristas.filter(c => c.status === 'approved'));
            }
        });
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

    loadBirthdays() {
        this.isLoadingBirthdays.set(true);
        this.adminService.getCoristas().subscribe({
            next: (coristas) => {
                const monthStr = this.selectedMonth().toString().padStart(2, '0');
                
                const filtered = coristas.filter(c => {
                    if (c.status !== 'approved' || !c.data_nascimento) return false;
                    const parts = c.data_nascimento.split('-'); // Expected format: YYYY-MM-DD
                    if (parts.length >= 2) {
                        return parts[1] === monthStr;
                    }
                    return false;
                }).sort((a, b) => {
                    const dayA = parseInt(a.data_nascimento!.split('-')[2]);
                    const dayB = parseInt(b.data_nascimento!.split('-')[2]);
                    return dayA - dayB; // Sort by day ASC
                });

                this.birthdays.set(filtered);
                this.isLoadingBirthdays.set(false);
            },
            error: (err) => {
                console.error("Erro ao carregar aniversariantes:", err);
                this.isLoadingBirthdays.set(false);
            }
        });
    }

    changeMonth(event: Event) {
        const selectElement = event.target as HTMLSelectElement;
        this.selectedMonth.set(parseInt(selectElement.value, 10));
        this.loadBirthdays();
    }

    loadCoristasStats() {
        this.isLoadingStats.set(true);
        this.adminService.getCoristas().subscribe({
            next: (coristas) => {
                // Filter only approved coristas
                const activeCoristas = coristas.filter(c => c.status === 'approved' && c.role === 'corista' && c.voice_part !== 'Regência');
                
                this.totalCoristas.set(activeCoristas.length);

                if (activeCoristas.length === 0) {
                    this.voicePartStats.set([]);
                    this.isLoadingStats.set(false);
                    return;
                }

                const counts = {
                    'Soprano': 0,
                    'Contralto': 0,
                    'Tenor': 0,
                    'Baixo': 0
                };

                activeCoristas.forEach(c => {
                    if (c.voice_part && counts.hasOwnProperty(c.voice_part)) {
                        counts[c.voice_part as keyof typeof counts]++;
                    }
                });

                const total = this.totalCoristas();
                const stats: VoicePartStat[] = [
                    { label: 'Soprano', count: counts['Soprano'], color: '#f43f5e', percentage: (counts['Soprano'] / total) * 100 }, // Rose-500
                    { label: 'Contralto', count: counts['Contralto'], color: '#f59e0b', percentage: (counts['Contralto'] / total) * 100 }, // Amber-500
                    { label: 'Tenor', count: counts['Tenor'], color: '#0ea5e9', percentage: (counts['Tenor'] / total) * 100 }, // Sky-500
                    { label: 'Baixo', count: counts['Baixo'], color: '#6366f1', percentage: (counts['Baixo'] / total) * 100 }, // Indigo-500
                ].filter(s => s.count > 0); // Only keep parts with at least 1 person

                this.voicePartStats.set(stats);
                this.isLoadingStats.set(false);
            },
            error: (err) => {
                console.error("Erro ao carregar estatísticas do coro:", err);
                this.isLoadingStats.set(false);
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


    openManualModal() {
        this.searchQuery.set('');
        this.showManualModal.set(true);
    }

    closeManualModal() {
        this.showManualModal.set(false);
    }

    registerManualPresence(userId: string) {
        const session = this.selectedSession();
        if (!session) return;

        this.presencaService.registerAttendanceManually(session.id, userId).subscribe({
            next: () => {
                this.loadAttendees(session.id);
                // We keep modal open if they want to add more, or close? 
                // Let's keep it open but maybe clear search
                this.searchQuery.set('');
            },
            error: (err) => alert(err.message)
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
