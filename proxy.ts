import authConfig from './auth.config';
import NextAuth from 'next-auth';

const { auth  } = NextAuth(authConfig);

export default auth;

// Configure which routes require authentication
export const config = {
  matcher: [
    // Protect these routes
    '/my-bets/:path*',
    '/transactions/:path*',
    '/settings/:path*',
    '/',
    // Exclude public routes and static files
    '/((?!api/auth|_next/static|_next/image|favicon.ico|login|signup|forgot-password|verify-email|$).*)',
  ],
};

