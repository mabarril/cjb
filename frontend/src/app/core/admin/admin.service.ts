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
}
