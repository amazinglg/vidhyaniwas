// Helper to invoke the send-push edge function from the client.
// Fire-and-forget — UI flows shouldn't block waiting for delivery.
import { supabase } from '@/integrations/supabase/client';

type Audience =
  | { kind: 'all' }
  | { kind: 'admins' }
  | { kind: 'users'; userIds: string[] }
  | { kind: 'residents'; residentIds: string[] };

export interface TriggerPushArgs {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  audience: Audience;
  excludeUserId?: string;
}

export async function triggerPush(args: TriggerPushArgs): Promise<void> {
  try {
    await supabase.functions.invoke('send-push', { body: args });
  } catch (e) {
    // Never let push failures break the user-facing flow
    console.warn('[triggerPush] failed:', e);
  }
}
