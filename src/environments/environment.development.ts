export const environment = {
    production: false,
    supabaseUrl: import.meta.env['VITE_SUPABASE_URL'] || '',
    supabaseKey: import.meta.env['VITE_SUPABASE_ANON_KEY'] || ''
};
