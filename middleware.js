export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - assets (static files)
     * - favicon.ico, sitemap.xml, robots.txt, llms.txt (metadata files)
     * - any static file with an extension (.js, .css, .json, .png, etc.)
     */
    '/((?!api|assets|favicon.ico|sitemap.xml|robots.txt|llms.txt|.*\\.(?:jpg|jpeg|gif|png|svg|ico|webp|avif|js|css|woff2|woff|ttf|json)$).*)',
  ],
};

export default function middleware(request) {
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

  // Invalid route -> return true HTTP 404 directly from the Edge
  const html404 = `<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8">
  <title>404 — الصفحة غير موجودة | AQARIO LUXE</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #070a13;
      color: #f8fafc;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      text-align: center;
      padding: 2rem;
    }
    .container {
      max-width: 520px;
      background: rgba(15, 23, 42, 0.75);
      border: 1px solid #1e293b;
      border-radius: 20px;
      padding: 3rem 2rem;
      backdrop-filter: blur(16px);
      box-shadow: 0 20px 50px rgba(0,0,0,0.5);
    }
    .code {
      font-size: 5.5rem;
      font-weight: 800;
      background: linear-gradient(135deg, #c5a880 0%, #e2c9a5 50%, #6366f1 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      line-height: 1;
      margin-bottom: 1rem;
    }
    h1 {
      font-size: 1.6rem;
      font-weight: 700;
      margin-bottom: 0.8rem;
      color: #f8fafc;
    }
    p {
      color: #94a3b8;
      font-size: 1rem;
      line-height: 1.6;
      margin-bottom: 2rem;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      background: linear-gradient(135deg, #c5a880 0%, #9a7b56 100%);
      color: #070a13;
      font-weight: 700;
      padding: 0.8rem 1.8rem;
      border-radius: 12px;
      text-decoration: none;
      transition: all 0.2s;
    }
    .btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(197, 168, 128, 0.35);
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="code">404</div>
    <h1>الصفحة غير موجودة</h1>
    <p>عذراً، المسار الذي تحاول الوصول إليه غير موجود على منصة AQARIO LUXE.</p>
    <a href="/" class="btn">العودة للرئيسية</a>
  </div>
</body>
</html>`;

  return new Response(html404, {
    status: 404,
    statusText: 'Not Found',
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'public, max-age=0, must-revalidate',
      'x-robots-tag': 'noindex, nofollow'
    }
  });
}
