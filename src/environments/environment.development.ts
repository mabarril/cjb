export const environment = {
    production: false,
    supabaseUrl: (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env['VITE_SUPABASE_URL']) || 'https://swwzvxqfxbklhvbsmdlz.supabase.co',
    supabaseKey: (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env['VITE_SUPABASE_ANON_KEY']) || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3d3p2eHFmeGJrbGh2YnNtZGx6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4NjUyNjUsImV4cCI6MjA4ODQ0MTI2NX0.0AYfNXFAst1FZftjymBHJBaj43xXQoizkbJ7V23ZHlU'
};
