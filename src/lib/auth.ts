import { createClient } from '@/lib/supabase/server';
import type { UserRole } from '@/types/database.types';

/**
 * Get current user session
 */
export async function getCurrentUser() {
  const supabase = await createClient();
  
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error || !session) {
    return null;
  }

  return session.user;
}

/**
 * Get user role
 */
export async function getUserRole(userId: string): Promise<UserRole | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    return null;
  }

  return data.role as UserRole;
}

/**
 * Check if user is admin
 */
export async function isAdmin(): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;

  const role = await getUserRole(user.id);
  return role === 'admin';
}

/**
 * Check if user has editor or admin role
 */
export async function canEdit(): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;

  const role = await getUserRole(user.id);
  return role === 'admin' || role === 'editor';
}

/**
 * Get user profile
 */
export async function getUserProfile(userId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    return null;
  }

  return data;
}

/**
 * Require authentication - throw error if not authenticated
 */
export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Unauthorized');
  }
  return user;
}

/**
 * Require admin - throw error if not admin
 */
export async function requireAdmin() {
  const user = await requireAuth();
  const role = await getUserRole(user.id);
  
  if (role !== 'admin') {
    throw new Error('Forbidden - Admin access required');
  }
  
  return user;
}
