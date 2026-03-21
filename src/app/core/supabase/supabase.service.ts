import { Injectable } from '@angular/core';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';
import { BehaviorSubject, from, Observable } from 'rxjs';

export interface Profile {
    id: string;
    username: string;
    full_name: string;
    rg?: string | null;
    orgao_emissor?: string | null;
    cpf?: string | null;
    data_nascimento?: string | null;
    endereco?: string | null;
    celular?: string | null;
    voice_part: 'Soprano' | 'Contralto' | 'Tenor' | 'Baixo' | 'Regência' | null;
    role: 'corista' | 'admin' | 'chefe_de_naipe';
    status: 'pending' | 'approved' | 'rejected';
    avatar_url: string | null;
}

@Injectable({
    providedIn: 'root'
})
export class SupabaseService {
    private supabase: SupabaseClient;
    private currentUser = new BehaviorSubject<User | null>(null);
    private currentProfile = new BehaviorSubject<Profile | null>(null);

    constructor() {
        this.supabase = createClient(environment.supabaseUrl, environment.supabaseKey);

        // Check active session on load
        this.supabase.auth.getSession().then(({ data }) => {
            if (data.session?.user) {
                this.currentUser.next(data.session.user);
                this.loadProfile(data.session.user.id);
            }
        });

        // Listen to auth changes
        this.supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
                const user = session?.user || null;
                this.currentUser.next(user);
                if (user) this.loadProfile(user.id);
            } else if (event === 'SIGNED_OUT') {
                this.currentUser.next(null);
                this.currentProfile.next(null);
            }
        });
    }

    get client(): SupabaseClient {
        return this.supabase;
    }

    get user$(): Observable<User | null> {
        return this.currentUser.asObservable();
    }

    get profile$(): Observable<Profile | null> {
        return this.currentProfile.asObservable();
    }

    async loadProfile(userId: string) {
        const { data, error } = await this.supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .maybeSingle();

        if (error) {
            console.error("Erro ao carregar profile:", error);
        } else if (data) {
            this.currentProfile.next(data as Profile);
        } else {
            console.warn("Perfil não encontrado na tabela 'profiles' para este usuário.");
        }
    }

    updateProfile(userId: string, updates: Partial<Profile>): Observable<Profile> {
        return from(
            this.supabase
                .from('profiles')
                .update(updates)
                .eq('id', userId)
                .select()
                .single()
                .then(res => {
                    if (res.error) throw res.error;
                    this.currentProfile.next(res.data as Profile);
                    return res.data as Profile;
                })
        );
    }

    uploadAvatar(userId: string, file: File): Observable<string> {
        const fileExt = file.name.split('.').pop();
        const fileName = `${userId}-${Math.random()}.${fileExt}`;
        const filePath = `${fileName}`;

        return from(
            this.supabase.storage
                .from('avatars')
                .upload(filePath, file)
                .then(async (res) => {
                    if (res.error) throw res.error;

                    const { data } = this.supabase.storage
                        .from('avatars')
                        .getPublicUrl(filePath);

                    return data.publicUrl;
                })
        );
    }
}
