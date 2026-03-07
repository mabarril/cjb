import { Component, inject, OnInit, signal, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PresencaService, Session } from '../../../core/presenca/presenca.service';
import * as QRCode from 'qrcode';
import { Router } from '@angular/router';

@Component({
    selector: 'app-display',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './display.component.html',
})
export class DisplayComponent implements OnInit, OnDestroy {
    private presencaService = inject(PresencaService);
    private router = inject(Router);

    session = signal<Session | null>(null);
    qrCodeSvg = signal<string>('');
    isLoading = signal(true);

    // Realtime
    activeCoristas = signal(0);
    private subscription: any;

    ngOnInit() {
        this.checkForActiveSession();
    }

    ngOnDestroy() {
        if (this.subscription) {
            this.presencaService['supabaseService'].client.removeChannel(this.subscription);
        }
    }

    checkForActiveSession() {
        this.presencaService.getActiveSession().subscribe({
            next: async (session) => {
                if (session) {
                    this.session.set(session);

                    // 1. Carrega contagem inicial
                    this.loadInitialCount(session.id);
                    // 2. Inscreve em updates realtime na tabela attendances
                    this.setupRealtime(session.id);

                    try {
                        // Generate QR SVG
                        const svgString = await QRCode.toString(session.qr_token, {
                            type: 'svg',
                            errorCorrectionLevel: 'H',
                            color: {
                                dark: '#312e81',  // indigo-900
                                light: '#00000000' // transparent background
                            }
                        });
                        this.qrCodeSvg.set(svgString);
                    } catch (err) {
                        console.error("QR Edit Erro:", err);
                    }
                    this.isLoading.set(false);
                } else {
                    this.isLoading.set(false);
                }
            },
            error: (err) => {
                console.error(err);
                this.isLoading.set(false);
            }
        });
    }

    private loadInitialCount(sessionId: string) {
        this.presencaService.getAttendeesCount(sessionId).subscribe(count => {
            this.activeCoristas.set(count);
        });
    }

    private setupRealtime(sessionId: string) {
        this.subscription = this.presencaService['supabaseService'].client.channel('public:attendances')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'attendances', filter: `session_id=eq.${sessionId}` }, payload => {
                console.log('Nova Presença Detectada:', payload);
                this.activeCoristas.update(val => val + 1);
            })
            .subscribe();
    }

    backToAdmin() {
        this.router.navigate(['/admin']);
    }
}
