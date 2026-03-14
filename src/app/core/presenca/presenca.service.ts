import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../supabase/supabase.service';
import { from, Observable } from 'rxjs';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface Session {
    id: string;
    title: string;
    scheduled_at: string;
    end_at?: string | null;
    location: string;
    status: 'agendado' | 'ativo' | 'finalizado';
    qr_token: string;
    created_at?: string;
}

export interface SessionFormData {
    title: string;
    location: string;
    scheduled_at: string;
    end_at?: string | null;
}

export interface AttendanceWithSession {
    id: string;
    scanned_at: string;
    status: 'presente' | 'ausente' | 'atrasado';
    session: {
        id: string;
        title: string;
        scheduled_at: string;
    } | null;
}

export interface AttendanceWithProfile {
    id: string;
    user_id: string;
    scanned_at: string;
    status: 'presente' | 'ausente' | 'atrasado';
    profile: {
        username: string;
        full_name: string;
        voice_part: string;
    } | null;
}

@Injectable({
    providedIn: 'root'
})
export class PresencaService {
    private supabaseService = inject(SupabaseService);

    // --- CRUD de Ensaios ---

    getAllSessions(): Observable<Session[]> {
        return from(
            this.supabaseService.client
                .from('sessions')
                .select('*')
                .order('scheduled_at', { ascending: false })
                .then(res => {
                    if (res.error) throw res.error;
                    return res.data as Session[];
                })
        );
    }

    getUpcomingSessions(): Observable<Session[]> {
        return from(
            this.supabaseService.client
                .from('sessions')
                .select('*')
                .in('status', ['agendado', 'ativo'])
                .order('scheduled_at', { ascending: true })
                .then(res => {
                    if (res.error) throw res.error;
                    return res.data as Session[];
                })
        );
    }

    createSession(data: SessionFormData): Observable<Session> {
        return from(
            this.supabaseService.client
                .from('sessions')
                .insert({
                    title: data.title,
                    location: data.location,
                    scheduled_at: data.scheduled_at,
                    end_at: data.end_at || null,
                    status: 'agendado',
                    qr_token: crypto.randomUUID()
                })
                .select()
                .single()
                .then(res => {
                    if (res.error) throw res.error;
                    return res.data as Session;
                })
        );
    }

    updateSession(id: string, data: Partial<SessionFormData>): Observable<Session> {
        return from(
            this.supabaseService.client
                .from('sessions')
                .update({
                    title: data.title,
                    location: data.location,
                    scheduled_at: data.scheduled_at,
                    end_at: data.end_at || null,
                })
                .eq('id', id)
                .select()
                .single()
                .then(res => {
                    if (res.error) throw res.error;
                    return res.data as Session;
                })
        );
    }

    activateSession(id: string): Observable<Session> {
        return from(
            // 1. Finaliza qualquer sessão ativa anterior
            this.supabaseService.client
                .from('sessions')
                .update({ status: 'finalizado' })
                .eq('status', 'ativo')
                .then(async () => {
                    // 2. Ativa a sessão escolhida
                    const res = await this.supabaseService.client
                        .from('sessions')
                        .update({ status: 'ativo' })
                        .eq('id', id)
                        .select()
                        .single();
                    if (res.error) throw res.error;
                    return res.data as Session;
                })
        );
    }

    finalizeSession(id: string): Observable<void> {
        return from(
            this.supabaseService.client
                .from('sessions')
                .update({ status: 'finalizado' })
                .eq('id', id)
                .then(res => {
                    if (res.error) throw res.error;
                })
        );
    }



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

    registerAttendanceManually(sessionId: string, userId: string): Observable<any> {
        return from(
            this.supabaseService.client
                .from('attendances')
                .insert({
                    session_id: sessionId,
                    user_id: userId,
                    status: 'presente'
                })
                .then(res => {
                    if (res.error) {
                        if (res.error.code === '23505') {
                            throw new Error("Presença já registrada para este corista.");
                        }
                        throw res.error;
                    }
                    return { success: true };
                })
        );
    }

    // --- Histórico do Corista ---

    getUserAttendances(userId: string): Observable<AttendanceWithSession[]> {
        return from(
            this.supabaseService.client
                .from('attendances')
                .select(`
                    id,
                    scanned_at,
                    status,
                    session:sessions ( id, title, scheduled_at )
                `)
                .eq('user_id', userId)
                .order('scanned_at', { ascending: false })
                .then(res => {
                    if (res.error) throw res.error;
                    // Supabase returns joined table as array; normalize to single object
                    return (res.data as any[]).map(row => ({
                        ...row,
                        session: Array.isArray(row.session) ? row.session[0] ?? null : row.session
                    })) as AttendanceWithSession[];
                })
        );
    }

    subscribeToUserAttendances(userId: string, callback: () => void): RealtimeChannel {
        return this.supabaseService.client
            .channel(`attendances:user:${userId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'attendances',
                    filter: `user_id=eq.${userId}`
                },
                () => callback()
            )
            .subscribe();
    }

    getSessionAttendees(sessionId: string): Observable<AttendanceWithProfile[]> {
        return from(
            this.supabaseService.client
                .from('attendances')
                .select(`
                    id,
                    user_id,
                    scanned_at,
                    status,
                    profile:profiles ( username, full_name, voice_part )
                `)
                .eq('session_id', sessionId)
                .order('scanned_at', { ascending: false })
                .then(res => {
                    if (res.error) throw res.error;
                    return (res.data as any[]).map(row => ({
                        ...row,
                        profile: Array.isArray(row.profile) ? row.profile[0] ?? null : row.profile
                    })) as AttendanceWithProfile[];
                })
        );
    }

    getSessionsCountByStatus(): Observable<Record<string, number>> {
        return from(
            this.supabaseService.client
                .from('sessions')
                .select('status')
                .then(res => {
                    if (res.error) throw res.error;
                    const counts: Record<string, number> = {
                        agendado: 0,
                        ativo: 0,
                        finalizado: 0
                    };
                    res.data.forEach((s: any) => {
                        if (counts[s.status] !== undefined) {
                            counts[s.status]++;
                        }
                    });
                    return counts;
                })
        );
    }

    getFinalizedSessionsCountThisYear(): Observable<number> {
        const currentYear = new Date().getFullYear();
        const startOfYear = new Date(currentYear, 0, 1).toISOString();
        const endOfYear = new Date(currentYear, 11, 31, 23, 59, 59).toISOString();

        return from(
            this.supabaseService.client
                .from('sessions')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'finalizado')
                .gte('scheduled_at', startOfYear)
                .lte('scheduled_at', endOfYear)
                .then(res => res.count || 0)
        );
    }
}
