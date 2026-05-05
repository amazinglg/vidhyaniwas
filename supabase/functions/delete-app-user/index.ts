import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return new Response(JSON.stringify({ error: 'Missing authorization' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const url = Deno.env.get('SUPABASE_URL')!;
    const anon = Deno.env.get('SUPABASE_ANON_KEY')!;
    const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const userClient = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const { target_user_id } = await req.json();
    if (!target_user_id) return new Response(JSON.stringify({ error: 'target_user_id is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    if (target_user_id === user.id) return new Response(JSON.stringify({ error: 'You cannot delete yourself' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const { data: role } = await userClient.from('user_roles').select('role').eq('user_id', user.id).eq('role', 'master_admin').maybeSingle();
    if (!role) return new Response(JSON.stringify({ error: 'Only Master Administrator can delete users' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const admin = createClient(url, service);
    const { data: targetRole } = await admin.from('user_roles').select('role').eq('user_id', target_user_id).eq('role', 'master_admin').maybeSingle();
    if (targetRole) return new Response(JSON.stringify({ error: 'Master Administrator cannot be deleted' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const { error: cleanupError } = await userClient.rpc('cleanup_deleted_app_user', { _target_user_id: target_user_id });
    if (cleanupError) return new Response(JSON.stringify({ error: cleanupError.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const { error: authError } = await admin.auth.admin.deleteUser(target_user_id);
    if (authError) return new Response(JSON.stringify({ error: authError.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
