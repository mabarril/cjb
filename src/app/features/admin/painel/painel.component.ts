import { Component, inject, OnInit, signal } from '@angular/core';
import { AdminService } from '../../../core/admin/admin.service';
import { Profile, SupabaseService } from '../../../core/supabase/supabase.service';
import { AuthService } from '../../../core/auth/auth.service';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

import { PresencaService } from '../../../core/presenca/presenca.service';

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
    isGeneratingQR = signal(false);

    ngOnInit() {
        // Check if user is actually admin
        this.supabaseService.profile$.subscribe(profile => {
            if (profile && profile.role !== 'admin') {
                this.router.navigate(['/dashboard']);
            } else if (profile && profile.role === 'admin') {
                this.loadPendingCoristas();
            }
        });
    }

    loadPendingCoristas() {
        this.isLoading.set(true);
        this.adminService.getPendingCoristas().subscribe({
            next: (coristas) => {
                this.pendingCoristas.set(coristas);
                this.isLoading.set(false);
            },
            error: (err) => {
                console.error("Erro ao carregar pendentes:", err);
                this.isLoading.set(false);
            }
        });
    }

    approve(id: string) {
        this.adminService.approveCorista(id).subscribe({
            next: () => {
                // Remove from list locally
                this.pendingCoristas.update(list => list.filter(c => c.id !== id));
            },
            error: (err) => console.error("Erro ao aprovar:", err)
        });
    }

    reject(id: string) {
        this.adminService.rejectCorista(id).subscribe({
            next: () => {
                // Remove from list locally
                this.pendingCoristas.update(list => list.filter(c => c.id !== id));
            },
            error: (err) => console.error("Erro ao reprovar:", err)
        });
    }

    iniciarEnsaio() {
        alert("Foi clicado! Teste bruto do angular");
        console.log("Botão Iniciar Ensaio Clicado!");
        this.isGeneratingQR.set(true);
        // Para simplificar no MVP, usando default values
        this.presencaService.startSession("Ensaio Coral Jovem", "IBS - Asa Sul").subscribe({
            next: (session) => {
                this.isGeneratingQR.set(false);
                this.router.navigate(['/projecao']);
            },
            error: (err) => {
                console.error("DEBUG INICIAR ENSAIO:", err);
                alert("Erro ao iniciar ensaio! Detalhes no console. " + (err.message || ''));
                this.isGeneratingQR.set(false);
            }
        });
    }

    async logout() {
        await this.authService.signOut().toPromise();
        this.router.navigate(['/login']);
    }
}
