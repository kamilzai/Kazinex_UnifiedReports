import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function middleware(request: NextRequest) {
  const supabase = await createClient();
  
  // Get the pathname
  const path = request.nextUrl.pathname;

  // Check if user is authenticated
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Protected routes
  const isAdminRoute = path.startsWith('/admin');
  const isReportsRoute = path.startsWith('/reports');
  const isAuthRoute = path.startsWith('/auth');

  // Redirect to login if not authenticated and trying to access protected routes
  if (!session && (isAdminRoute || isReportsRoute)) {
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  // Redirect to home if authenticated and trying to access auth routes
  if (session && isAuthRoute) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Check admin access for /admin routes
  if (isAdminRoute && session) {
    const { data: userRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', session.user.id)
      .single();

    if (userRole?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
