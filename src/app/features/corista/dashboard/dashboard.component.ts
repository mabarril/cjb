import { Component, inject, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PresencaService } from '../../../core/presenca/presenca.service';
import { SupabaseService, Profile } from '../../../core/supabase/supabase.service';
import { AuthService } from '../../../core/auth/auth.service';
import { Router, ActivatedRoute } from '@angular/router';
import { BrowserQRCodeReader, IScannerControls } from '@zxing/browser';

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

    // Scanner State
    isScanning = signal(false);
    scannerError = signal('');
    scannerSuccess = signal('');
    private codeReader = new BrowserQRCodeReader();
    private scannerControls: IScannerControls | null = null;

    // Mocks por enquanto. Serão substituídos por histórico real baseado na data
    stats = signal({
        presencas: 8,
        faltas: 2
    });

    get frequencia() {
        const total = this.stats().presencas + this.stats().faltas;
        const p = total === 0 ? 0 : Math.round((this.stats().presencas / total) * 100);
        return {
            valor: p,
            cor: p >= 75 ? 'text-emerald-500' : p >= 50 ? 'text-amber-500' : 'text-rose-500'
        };
    }

    ngOnInit() {
        // Check for access denied redirect from admin guard
        this.route.queryParams.subscribe(params => {
            if (params['access'] === 'denied') {
                this.accessDenied.set(true);
                setTimeout(() => this.accessDenied.set(false), 4000);
                // Clean the URL without triggering navigation
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
                }
            }
        });
    }

    goToAdmin() {
        this.router.navigate(['/admin']);
    }

    ngOnDestroy() {
        this.stopScanner();
    }

    async logout() {
        await this.authService.signOut().toPromise();
        this.router.navigate(['/login']);
    }

    scanQRCode() {
        this.isScanning.set(true);
        this.scannerError.set('');
        this.scannerSuccess.set('');

        // Aguarda o próximo tick do event loop para o Angular renderizar
        // o bloco @if(isScanning()) e o elemento <video> existir no DOM
        setTimeout(async () => {
            try {
                const videoElement = document.getElementById('cameraPreview') as HTMLVideoElement;

                if (!videoElement) {
                    this.scannerError.set("Erro interno: elemento de vídeo não encontrado.");
                    this.isScanning.set(false);
                    return;
                }

                // Starts continuous scanning from the default selected camera
                this.scannerControls = await this.codeReader.decodeFromVideoDevice(undefined, videoElement, (result, _error, controls) => {
                    if (result) {
                        // Parar leitura instantaneamente para não flodar o backend
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

                // Incrementa mockado por enquanto para dar feedback
                this.stats.update(s => ({ ...s, presencas: s.presencas + 1 }));

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
