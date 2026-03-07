import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupabaseService, Profile } from '../../../core/supabase/supabase.service';
import { Router } from '@angular/router';

@Component({
    selector: 'app-perfil',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './perfil.component.html',
})
export class PerfilComponent implements OnInit {
    private supabaseService = inject(SupabaseService);
    private router = inject(Router);

    profile = signal<Profile | null>(null);
    isLoading = signal(true);
    isSaving = signal(false);
    uploadError = signal('');

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

    onCpfChange(value: string) {
        if (!value) {
            this.cpf = '';
            return;
        }
        let v = value.replace(/\D/g, '').substring(0, 11);
        if (v.length <= 3) {
            this.cpf = v;
        } else if (v.length <= 6) {
            this.cpf = `${v.substring(0, 3)}.${v.substring(3)}`;
        } else if (v.length <= 9) {
            this.cpf = `${v.substring(0, 3)}.${v.substring(3, 6)}.${v.substring(6)}`;
        } else {
            this.cpf = `${v.substring(0, 3)}.${v.substring(3, 6)}.${v.substring(6, 9)}-${v.substring(9)}`;
        }
    }

    onCelularChange(value: string) {
        if (!value) {
            this.celular = '';
            return;
        }
        let v = value.replace(/\D/g, '').substring(0, 11);
        if (v.length <= 2) {
            this.celular = v.length === 0 ? '' : `(${v}`;
        } else if (v.length <= 6) {
            this.celular = `(${v.substring(0, 2)}) ${v.substring(2)}`;
        } else if (v.length <= 10) {
            this.celular = `(${v.substring(0, 2)}) ${v.substring(2, 6)}-${v.substring(6)}`;
        } else {
            this.celular = `(${v.substring(0, 2)}) ${v.substring(2, 7)}-${v.substring(7)}`;
        }
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
