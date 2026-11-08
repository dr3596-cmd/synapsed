import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

const PUBLIC_FILE = /\.(.*)$/;

export async function middleware(req: NextRequest) {
  // Add a small delay to allow session to load (helps with race conditions)
  const token = await getToken({ 
    req, 
    secret: process.env.AUTH_SECRET,
    secureCookie: process.env.NODE_ENV === 'production'
  });

  const { pathname } = req.nextUrl;

  // Skip static files and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.') ||
    PUBLIC_FILE.test(pathname)
  ) {
    return NextResponse.next();
  }

  // Allow access to sign-in and choose-role pages
  if (pathname === '/sign-in' || pathname === '/choose-role') {
    return NextResponse.next();
  }

  // Redirect unauthenticated users
  if (!token) {
    // Remember where the user was going (e.g. a class invite link) so sign-in can return there.
    const signInUrl = new URL('/sign-in', req.url);
    signInUrl.searchParams.set('callbackUrl', pathname + req.nextUrl.search);
    return NextResponse.redirect(signInUrl);
  }
 

  // Role-based route access
  const role = token.role;
  if (!role) {
    return NextResponse.redirect(new URL("/choose-role", req.url));
  }

  if (pathname.startsWith('/admin') && role !== 'ADMIN') {
    return NextResponse.redirect(new URL('/unauthorized', req.url));
  }
  if (pathname.startsWith('/class') && role !== 'ADMIN' && role !== 'PROFESSOR' && role !== 'STUDENT') {
    return NextResponse.redirect(new URL('/unauthorized', req.url));
  }

  if (pathname.startsWith('/teacher') && role !== 'ADMIN' && role !== 'PROFESSOR') {
    return NextResponse.redirect(new URL('/unauthorized', req.url));
  }

  if (pathname.startsWith('/student') && role !== 'ADMIN' && role !== 'STUDENT') {
    return NextResponse.redirect(new URL('/unauthorized', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/teacher/:path*', '/student/:path*'],
};