import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupabaseService, Profile } from '../../../core/supabase/supabase.service';
import { Router } from '@angular/router';
import { NgxMaskDirective } from 'ngx-mask';
import { UppercaseDirective } from '../../../core/directives/uppercase.directive';

@Component({
    selector: 'app-perfil',
    standalone: true,
    imports: [CommonModule, FormsModule, NgxMaskDirective, UppercaseDirective],
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
