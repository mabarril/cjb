import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SupabaseService } from '../supabase/supabase.service';
import { map, filter, take } from 'rxjs';

export const adminGuard: CanActivateFn = () => {
    const router = inject(Router);
    const supabaseService = inject(SupabaseService);

    return supabaseService.profile$.pipe(
        // Wait until profile is loaded (not null)
        filter(profile => profile !== null),
        take(1),
        map(profile => {
            if (profile?.role === 'admin' || profile?.role === 'chefe_de_naipe') {
                return true;
            }
            // Redirect coristas to their dashboard with an access denied flag
            return router.createUrlTree(['/dashboard'], {
                queryParams: { access: 'denied' }
            });
        })
    );
};
