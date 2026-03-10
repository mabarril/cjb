import { Injectable, inject } from '@angular/core';
import { SupabaseService, Profile } from '../supabase/supabase.service';
import { from, Observable, map } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class AdminService {
    private supabaseService = inject(SupabaseService);

    getPendingCoristas(): Observable<Profile[]> {
        return from(
            this.supabaseService.client
                .from('profiles')
                .select('*')
                .eq('status', 'pending')
                .order('created_at', { ascending: false })
        ).pipe(
            map(res => {
                if (res.error) throw res.error;
                return res.data as Profile[];
            })
        );
    }

    approveCorista(userId: string): Observable<void> {
        return from(
            this.supabaseService.client
                .from('profiles')
                .update({ status: 'approved' })
                .eq('id', userId)
        ).pipe(
            map(res => {
                if (res.error) throw res.error;
                return;
            })
        );
    }

    rejectCorista(userId: string): Observable<void> {
        return from(
            this.supabaseService.client
                .from('profiles')
                .update({ status: 'rejected' })
                .eq('id', userId)
        ).pipe(
            map(res => {
                if (res.error) throw res.error;
                return;
            })
        );
    }

    getCoristas(): Observable<Profile[]> {
        return from(
            this.supabaseService.client
                .from('profiles')
                .select('*')
                .order('full_name', { ascending: true })
        ).pipe(
            map(res => {
                if (res.error) throw res.error;
                return res.data as Profile[];
            })
        );
    }

    updateCoristaProfile(userId: string, updates: Partial<Profile>): Observable<void> {
        return from(
            this.supabaseService.client
                .from('profiles')
                .update(updates)
                .eq('id', userId)
        ).pipe(
            map(res => {
                if (res.error) throw res.error;
                return;
            })
        );
    }

    deleteCorista(userId: string): Observable<void> {
        // Soft delete/inactivation by setting status to a rejected/inactive state or role change
        // Based on the user review note, we use 'rejected' as soft-delete logic for now.
        return from(
            this.supabaseService.client
                .from('profiles')
                .update({ status: 'rejected' })
                .eq('id', userId)
        ).pipe(
            map(res => {
                if (res.error) throw res.error;
                return;
            })
        );
    }
}
