import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupabaseService, Profile } from '../../../core/supabase/supabase.service';
import { Router } from '@angular/router';
import { NgxMaskDirective } from 'ngx-mask';
import { UppercaseDirective } from '../../../core/directives/uppercase.directive';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
    selector: 'app-perfil',
    standalone: true,
    imports: [CommonModule, FormsModule, NgxMaskDirective, UppercaseDirective],
    templateUrl: './perfil.component.html',
})
export class PerfilComponent implements OnInit {
    private supabaseService = inject(SupabaseService);
    private authService = inject(AuthService);
    private router = inject(Router);

    profile = signal<Profile | null>(null);
    isLoading = signal(true);
    isSaving = signal(false);
    isChangingPassword = signal(false);
    uploadError = signal('');
    passwordMessage = signal('');

    // Form fields
    fullName = '';
    username = '';
    voicePart: Profile['voice_part'] = null;
    rg = '';
    orgao_emissor = '';
    cpf = '';
    data_nascimento = '';
    endereco = '';
    celular = '';

    // Password fields
    newPassword = '';
    confirmNewPassword = '';

    // Avatar preview
    previewUrl: string | null = null;
    selectedFile: File | null = null;

    ngOnInit() {
        this.supabaseService.profile$.subscribe(prof => {
            if (prof) {
                this.profile.set(prof);
                this.fullName = prof.full_name;
                this.username = prof.username;
                this.voicePart = prof.voice_part;
                this.rg = prof.rg || '';
                this.orgao_emissor = prof.orgao_emissor || '';
                this.cpf = prof.cpf || '';
                this.data_nascimento = prof.data_nascimento || '';
                this.endereco = prof.endereco || '';
                this.celular = prof.celular || '';
                this.previewUrl = prof.avatar_url;
                this.isLoading.set(false);
            }
        });
    }

    goBack() {
        this.router.navigate(['/dashboard']);
    }
    
    goToAgenda() {
        this.router.navigate(['/agenda']);
    }

    onFileSelected(event: any) {
        const file = event.target.files[0];
        if (file) {
            this.selectedFile = file;
            const reader = new FileReader();
            reader.onload = (e) => {
                this.previewUrl = e.target?.result as string;
            };
            reader.readAsDataURL(file);
        }
    }

    toggleChangePassword() {
        this.isChangingPassword.set(!this.isChangingPassword());
        this.passwordMessage.set('');
        this.newPassword = '';
        this.confirmNewPassword = '';
    }

    updatePassword() {
        this.passwordMessage.set('');
        
        if (this.newPassword.length < 6) {
            this.passwordMessage.set('A nova senha deve ter no mínimo 6 caracteres.');
            return;
        }

        if (this.newPassword !== this.confirmNewPassword) {
            this.passwordMessage.set('As senhas não coincidem.');
            return;
        }

        this.isSaving.set(true);
        this.authService.updateUserPassword(this.newPassword).subscribe({
            next: (res) => {
                this.isSaving.set(false);
                if (res.error) {
                    this.passwordMessage.set(res.error.message);
                } else {
                    this.passwordMessage.set('Senha atualizada com sucesso!');
                    setTimeout(() => this.toggleChangePassword(), 2000); // Close after 2s
                }
            },
            error: (err) => {
                this.isSaving.set(false);
                this.passwordMessage.set('Erro ao atualizar senha.');
            }
        });
    }

    async saveChanges() {
        if (!this.profile()) return;

        this.isSaving.set(true);
        this.uploadError.set('');

        try {
            let avatarUrl = this.profile()!.avatar_url;

            // 1. Upload avatar if selected
            if (this.selectedFile) {
                avatarUrl = await this.supabaseService.uploadAvatar(this.profile()!.id, this.selectedFile).toPromise() || avatarUrl;
            }

            // 2. Update profile
            const updates: Partial<Profile> = {
                full_name: this.fullName,
                username: this.username,
                voice_part: this.voicePart,
                rg: this.rg,
                orgao_emissor: this.orgao_emissor,
                cpf: this.cpf,
                data_nascimento: this.data_nascimento,
                endereco: this.endereco,
                celular: this.celular,
                avatar_url: avatarUrl
            };

            await this.supabaseService.updateProfile(this.profile()!.id, updates).toPromise();

            this.isSaving.set(false);
            // Optional: Show success toast or navigate back
            this.goBack();
        } catch (err: any) {
            console.error('Erro ao salvar perfil:', err);
            this.uploadError.set(err.message || 'Erro ao salvar alterações.');
            this.isSaving.set(false);
        }
    }
}
