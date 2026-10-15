/**
 * Supabase Client Configuration for Adams Platform
 * 
 * This file provides Supabase client instances for both client-side and server-side usage.
 * All queries will automatically use the adams schema.
 */

import { createClient } from '@supabase/supabase-js';

// Validate environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
}

if (!supabaseAnonKey) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable');
}

/**
 * Client-side Supabase client
 * Use this in React components and client-side code
 * Respects Row Level Security (RLS) policies
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  db: {
    schema: 'adams' as any, // Use adams schema for all queries
  },
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

/**
 * Server-side Supabase client with service role key
 * Use this in API routes and server-side code
 * Bypasses Row Level Security (RLS) policies
 * 
 * WARNING: Never expose this client to the browser!
 */
export const supabaseAdmin = createClient(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey,
  {
    db: {
      schema: 'adams' as any, // Use adams schema for all queries
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

/**
 * Helper function to create a Supabase client for server components
 * This is useful for Next.js 13+ Server Components
 */
export function createServerClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  return createClient(
    supabaseUrl!,
    serviceRoleKey || supabaseAnonKey!,
    {
      db: {
        schema: 'adams' as any,
      },
      auth: {
        persistSession: false,
      },
    }
  );
}

/**
 * Helper function to get current user
 */
export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error) {
    console.error('Error getting current user:', error);
    return null;
  }
  
  return user;
}

/**
 * Helper function to check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const user = await getCurrentUser();
  return user !== null;
}

/**
 * Helper function to sign out
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  
  if (error) {
    console.error('Error signing out:', error);
    throw error;
  }
}
