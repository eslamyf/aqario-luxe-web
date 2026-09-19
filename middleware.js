export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - assets (static files & translations)
     * - favicon.ico, sitemap.xml, robots.txt, llms.txt (metadata files)
     * - any static file with an extension (.js, .css, .json, .png, etc.)
     */
    '/((?!api|assets|favicon.ico|sitemap.xml|robots.txt|llms.txt|.*\\.(?:jpg|jpeg|gif|png|svg|ico|webp|avif|js|css|woff2|woff|ttf|json)$).*)',
  ],
};

export default async function middleware(request) {
  const url = new URL(request.url);
  let pathname = url.pathname;
  try {
    pathname = decodeURIComponent(pathname);
  } catch (_) {}

  // List of all valid Angular route prefixes defined in AppRoutingModule
  const validRoutePrefixes = [
    '/',
    '/properties',
    '/agents',
    '/become-agent',
    '/account',
    '/dashboard',
    '/profile',
    '/checkout',
    '/payment',
    '/subscribe',
    '/reset-password',
    '/verify-otp',
    '/kyc',
    '/admin'
  ];

  const isValidRoute = validRoutePrefixes.some(prefix => {
    if (prefix === '/') return pathname === '/' || pathname === '';
    return pathname === prefix || pathname.startsWith(prefix + '/');
  });

  if (isValidRoute) {
    // Valid route -> allow request to continue to Angular SPA index.html
    return;
  }

  // Invalid route -> fetch index.html from origin and return it with status 404!
  // This serves index.html with HTTP status 404 so Angular boots, mounts <app-nav>, <app-footer>,
  // respects the current theme, and activates the NotFoundComponent wildcard route.
  try {
    const indexUrl = new URL('/', request.url);
    const indexRes = await fetch(indexUrl);
    const indexHtml = await indexRes.text();

    return new Response(indexHtml, {
      status: 404,
      statusText: 'Not Found',
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'public, max-age=0, must-revalidate',
        'x-robots-tag': 'noindex, nofollow'
      }
    });
  } catch (err) {
    return new Response('Not Found', { status: 404 });
  }
}
