import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../supabase/supabase.service';
import { from, Observable } from 'rxjs';
import { AuthTokenResponsePassword, WeakPassword } from '@supabase/supabase-js';

export interface SignUpData {
    email: string;
    password: string;
    username: string;
    full_name: string;
    voice_part: 'Soprano' | 'Contralto' | 'Tenor' | 'Baixo' | 'Regência';
}

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private readonly supabaseService = inject(SupabaseService);

    signIn(email: string, password: string): Observable<AuthTokenResponsePassword> {
        return from(
            this.supabaseService.client.auth.signInWithPassword({
                email,
                password
            })
        );
    }

    signUp(data: SignUpData) {
        // 1. We create the auth user
        return from(
            this.supabaseService.client.auth.signUp({
                email: data.email,
                password: data.password,
                options: {
                    data: {
                        // These will go to auth.users raw_user_meta_data
                        username: data.username,
                        full_name: data.full_name,
                        voice_part: data.voice_part
                    }
                }
            }).then((response) => {
                if (response.error) throw response.error;

                // A tabela 'profiles' será preenchida automaticamente por um Trigger
                // no Supabase após a inserção em 'auth.users', mantendo tudo seguro (RLS bypassed on DB side).
                return response;
            })
        );
    }

    signOut() {
        return from(this.supabaseService.client.auth.signOut());
    }

    resetPasswordForEmail(email: string) {
        return from(
            this.supabaseService.client.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/login`
            })
        );
    }

    updateUserPassword(newPassword: string) {
        return from(
            this.supabaseService.client.auth.updateUser({
                password: newPassword
            })
        );
    }
}
