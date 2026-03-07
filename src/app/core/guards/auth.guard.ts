import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SupabaseService } from '../supabase/supabase.service';
import { from, map, switchMap } from 'rxjs';

export const authGuard: CanActivateFn = () => {
    const router = inject(Router);
    const supabaseService = inject(SupabaseService);

    return from(supabaseService.client.auth.getSession()).pipe(
        map(({ data }) => {
            if (data.session) {
                return true;
            }
            return router.createUrlTree(['/login']);
        })
    );
};
