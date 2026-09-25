// lib/supabase.ts throws at module scope when these are missing, and the data
// layer imports it transitively. Tests never reach the network — they either
// mock lib/tasks/api or exercise pure logic — so dummy values are enough.
process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
