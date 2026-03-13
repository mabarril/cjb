import { Component, inject, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PresencaService, AttendanceWithSession, Session } from '../../../core/presenca/presenca.service';
import { SupabaseService, Profile } from '../../../core/supabase/supabase.service';
import { AuthService } from '../../../core/auth/auth.service';
import { Router, ActivatedRoute } from '@angular/router';
import { BrowserQRCodeReader, IScannerControls } from '@zxing/browser';
import { RealtimeChannel } from '@supabase/supabase-js';

@Component({
    selector: 'app-dashboard',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit, OnDestroy {
    private supabaseService = inject(SupabaseService);
    private presencaService = inject(PresencaService);
    private authService = inject(AuthService);
    private router = inject(Router);
    private route = inject(ActivatedRoute);

    profile = signal<Profile | null>(null);
    isAdmin = computed(() => this.profile()?.role === 'admin');
    accessDenied = signal(false);
    isLoading = signal(true);
    isStatsLoading = signal(true);

    // Real attendance data
    attendances = signal<AttendanceWithSession[]>([]);
    activeSession = signal<Session | null>(null);

    // Computed stats from real data
    presencas = computed(() => {
        const currentYear = new Date().getFullYear();
        return this.attendances().filter(a => {
            if (a.status !== 'presente') return false;
            const attYear = new Date(a.scanned_at).getFullYear();
            return attYear === currentYear;
        }).length;
    });

    totalFinalizedSessions = signal<number>(0);
    
    // Faltas = Ensaios finalizados no ano - Presenças no ano
    faltas = computed(() => Math.max(0, this.totalFinalizedSessions() - this.presencas()));
    
    recentAttendances = computed(() => this.attendances().slice(0, 5));

    // Intelligence: Show scanner only if there is an active session AND user is not present in it
    showScannerButton = computed(() => {
        const session = this.activeSession();
        if (!session) return false;

        // Check if user already has an attendance for this specific active session
        const alreadyPresent = this.attendances().some(a => a.session?.id === session.id);
        return !alreadyPresent;
    });

    frequencia = computed(() => {
        const total = this.totalFinalizedSessions();
        const p = total === 0 ? 100 : Math.round((this.presencas() / total) * 100);
        return {
            valor: p,
            cor: p >= 75 ? 'text-emerald-500' : p >= 50 ? 'text-amber-500' : 'text-rose-500'
        };
    });

    // Scanner State
    isScanning = signal(false);
    scannerError = signal('');
    scannerSuccess = signal('');
    private codeReader = new BrowserQRCodeReader();
    private scannerControls: IScannerControls | null = null;
    private realtimeChannel: RealtimeChannel | null = null;
    private sessionChannel: RealtimeChannel | null = null;

    ngOnInit() {
        // Check for access denied redirect from admin guard
        this.route.queryParams.subscribe(params => {
            if (params['access'] === 'denied') {
                this.accessDenied.set(true);
                setTimeout(() => this.accessDenied.set(false), 4000);
                this.router.navigate([], { queryParams: {}, replaceUrl: true });
            }
        });

        this.supabaseService.profile$.subscribe(prof => {
            if (prof) {
                if (prof.status === 'pending' || prof.status === 'rejected') {
                    this.router.navigate(['/login']);
                } else {
                    this.profile.set(prof);
                    this.isLoading.set(false);
                    // Load real data and subscribe to realtime
                    this.loadTotalFinalizedSessions();
                    this.loadAttendances(prof.id);
                    this.loadActiveSession();
                    this.subscribeToAttendances(prof.id);
                    this.subscribeToSessions();
                }
            }
        });
    }

    private loadAttendances(userId: string) {
        this.isStatsLoading.set(true);
        this.presencaService.getUserAttendances(userId).subscribe({
            next: (data) => {
                this.attendances.set(data);
                this.isStatsLoading.set(false);
            },
            error: (err) => {
                console.error('Erro ao carregar histórico:', err);
                this.isStatsLoading.set(false);
            }
        });
    }

    private loadTotalFinalizedSessions() {
        this.presencaService.getFinalizedSessionsCountThisYear().subscribe(count => {
            this.totalFinalizedSessions.set(count);
        });
    }

    private loadActiveSession() {
        this.presencaService.getActiveSession().subscribe(session => {
            this.activeSession.set(session);
        });
    }

    private subscribeToAttendances(userId: string) {
        this.realtimeChannel = this.presencaService.subscribeToUserAttendances(userId, () => {
            // Reload data when any change arrives via Realtime
            this.loadAttendances(userId);
        });
    }

    private subscribeToSessions() {
        // Listen for session status changes (activation/finalization)
        this.sessionChannel = this.supabaseService.client
            .channel('sessions_status')
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'sessions'
                },
                () => {
                    this.loadActiveSession();
                    this.loadTotalFinalizedSessions(); // Se uma sessão for finalizada, atualiza o count
                }
            )
            .subscribe();
    }

    goToAdmin() {
        this.router.navigate(['/admin']);
    }

    goToProfile() {
        this.router.navigate(['/perfil']);
    }

    ngOnDestroy() {
        this.stopScanner();
        // Unsubscribe from Realtime channels to avoid memory leaks
        if (this.realtimeChannel) {
            this.supabaseService.client.removeChannel(this.realtimeChannel);
        }
        if (this.sessionChannel) {
            this.supabaseService.client.removeChannel(this.sessionChannel);
        }
    }

    async logout() {
        await this.authService.signOut().toPromise();
        this.router.navigate(['/login']);
    }

    scanQRCode() {
        this.isScanning.set(true);
        this.scannerError.set('');
        this.scannerSuccess.set('');

        setTimeout(async () => {
            try {
                const videoElement = document.getElementById('cameraPreview') as HTMLVideoElement;

                if (!videoElement) {
                    this.scannerError.set("Erro interno: elemento de vídeo não encontrado.");
                    this.isScanning.set(false);
                    return;
                }

                this.scannerControls = await this.codeReader.decodeFromVideoDevice(undefined, videoElement, (result, _error, controls) => {
                    if (result) {
                        controls.stop();
                        this.handleScannedToken(result.getText());
                    }
                });
            } catch (err) {
                console.error("Erro ao iniciar câmera: ", err);
                this.scannerError.set("Não foi possível acessar a câmera. Verifique as permissões do navegador.");
                this.isScanning.set(false);
            }
        }, 0);
    }

    stopScanner() {
        if (this.scannerControls) {
            this.scannerControls.stop();
            this.scannerControls = null;
        }
        this.isScanning.set(false);
    }

    private handleScannedToken(token: string) {
        if (!this.profile()) return;

        this.isLoading.set(true);
        this.presencaService.registerAttendance(token, this.profile()!.id).subscribe({
            next: () => {
                this.stopScanner();
                this.isLoading.set(false);
                this.scannerSuccess.set("Presença registrada com sucesso! Ótimo ensaio!");
                // Realtime will auto-update the stats; no need for manual increment
                setTimeout(() => this.scannerSuccess.set(''), 5000);
            },
            error: (err) => {
                this.stopScanner();
                this.isLoading.set(false);
                this.scannerError.set(err.message || "Erro ao registrar. Tente novamente.");
            }
        });
    }
}
