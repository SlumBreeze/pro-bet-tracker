import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ekdcafbqwrbvxulutszx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVrZGNhZmJxd3Jidnh1bHV0c3p4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUwNTkxMzcsImV4cCI6MjA4MDYzNTEzN30.NXmRyKHWeIxTUTtVgDRDpVRoC2hgPYMwRdEa9pgiHb4';

export const supabase = createClient(supabaseUrl, supabaseKey);