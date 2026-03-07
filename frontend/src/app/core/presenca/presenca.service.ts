import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../supabase/supabase.service';
import { from, Observable } from 'rxjs';

export interface Session {
    id: string;
    title: string;
    scheduled_at: string;
    location: string;
    status: 'agendado' | 'ativo' | 'finalizado';
    qr_token: string;
}

@Injectable({
    providedIn: 'root'
})
export class PresencaService {
    private supabaseService = inject(SupabaseService);

    // --- Funções do Regente/Admin ---

    startSession(title: string, location: string): Observable<Session> {
        // 1. Finaliza qualquer sessão ativa anterior
        return from(this.supabaseService.client
            .from('sessions')
            .update({ status: 'finalizado' })
            .eq('status', 'ativo')
            .then(async () => {
                // 2. Cria a nova sessão 
                const token = crypto.randomUUID(); // Token único
                const { data, error } = await this.supabaseService.client
                    .from('sessions')
                    .insert({
                        title,
                        location,
                        status: 'ativo',
                        scheduled_at: new Date().toISOString(),
                        qr_token: token
                    })
                    .select()
                    .single();

                if (error) throw error;
                return data as Session;
            })
        );
    }

    getActiveSession(): Observable<Session | null> {
        return from(
            this.supabaseService.client
                .from('sessions')
                .select('*')
                .eq('status', 'ativo')
                .maybeSingle()
                .then(res => res.data as Session | null)
        );
    }

    getAttendeesCount(sessionId: string): Observable<number> {
        return from(
            this.supabaseService.client
                .from('attendances')
                .select('*', { count: 'exact', head: true }) // head: true evita puxar as linhas atoa
                .eq('session_id', sessionId)
                .then(res => res.count || 0)
        );
    }

    // --- Funções do Corista ---

    registerAttendance(qrToken: string, userId: string): Observable<any> {
        return from(
            // 1. Pega o ID da sessão ativa a partir do Token
            this.supabaseService.client
                .from('sessions')
                .select('id')
                .eq('qr_token', qrToken)
                .eq('status', 'ativo')
                .maybeSingle()
                .then(async (sessionRes) => {
                    if (sessionRes.error || !sessionRes.data) {
                        throw new Error("QR Code inválido ou ensaio não está mais ativo.");
                    }

                    // 2. Insere a presença
                    const { error: attError } = await this.supabaseService.client
                        .from('attendances')
                        .insert({
                            session_id: sessionRes.data.id,
                            user_id: userId,
                            status: 'presente'
                        });

                    if (attError) {
                        // Trata erro de UNIQUE constraint (já marcou presença)
                        if (attError.code === '23505') {
                            throw new Error("Você já registrou presença neste ensaio!");
                        }
                        throw attError;
                    }
                    return { success: true };
                })
        );
    }
}
