// Hotlink protection for static assets served from this Vite site.
// Runs before the filesystem/static cache on Vercel (Routing Middleware, Edge).
// Blocks third-party sites from hotlinking images/JSON while allowing:
//   - empty/missing referer (direct visits, curl, download tools)
//   - same-site referers (gpt-image2.canghe.ai and its subdomains/preview)
// Every blocked attempt is logged with client IP so abuse can be traced.

const ALLOWED_REFERRER_HOSTS = [
  'gpt-image2.canghe.ai',
  'awesome-gpt-image-2.vercel.app',
  'localhost',
  '127.0.0.1',
];

const PROTECTED_PREFIXES = ['/images/', '/cases.json', '/assets/', '/gpt-image-2-5/'];

export default function middleware(request) {
  const url = new URL(request.url);
  const pathname = url.pathname;

  if (!PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return undefined;
  }

  const referer = request.headers.get('referer') || '';
  if (!referer) {
    return undefined;
  }

  let refererHostname = null;
  try {
    refererHostname = new URL(referer).hostname;
  } catch (error) {
    refererHostname = null;
  }

  const allowed =
    refererHostname &&
    ALLOWED_REFERRER_HOSTS.some(
      (host) => refererHostname === host || refererHostname.endsWith('.' + host)
    );

  if (allowed) {
    return undefined;
  }

  const ip = (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
  const ua = (request.headers.get('user-agent') || '').slice(0, 100);
  console.log(
    `[hotlink-block] ip=${ip} path=${pathname} referer=${refererHostname || '(invalid)'} ua=${ua}`
  );

  return new Response('403 Forbidden', {
    status: 403,
    headers: { 'Cache-Control': 'no-store' },
  });
}

export const config = {
  matcher: ['/images/:path*', '/cases.json', '/assets/:path*', '/gpt-image-2-5/:path*'],
};
