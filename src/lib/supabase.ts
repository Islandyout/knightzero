import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url=import.meta.env.VITE_SUPABASE_URL as string|undefined;
const key=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string|undefined;

export const onlineConfigured=Boolean(url&&key);
export const supabase:SupabaseClient|null=onlineConfigured?createClient(url as string,key as string,{auth:{persistSession:true,autoRefreshToken:true}}):null;

export async function ensureGuestSession(){
  if(!supabase)return null;
  const {data:{session}}=await supabase.auth.getSession();
  if(session)return session;
  const {data,error}=await supabase.auth.signInAnonymously();
  if(error)throw error;
  return data.session;
}

export async function createChallenge(initialSeconds:number,incrementSeconds:number,rated=false){
  if(!supabase)throw new Error('Supabase is not configured');
  const session=await ensureGuestSession();
  if(!session)throw new Error('Unable to create a session');
  const {data,error}=await supabase.from('challenges').insert({challenger:session.user.id,rated,initial_seconds:initialSeconds,increment_seconds:incrementSeconds,status:'open'}).select().single();
  if(error)throw error;
  return data;
}
