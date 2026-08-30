/**
 * Vulnerability scanners hammer this site with WordPress/PHP probes
 * (`/kir.php`, `/wp-json/...`, `/.env`, ...). None of those can ever exist
 * here, so recognising them lets `hooks.server.ts` answer with a bare 404
 * instead of resolving a session and rendering the error page — and lets
 * `handleError` stay quiet so real failures remain visible in the logs.
 *
 * Kept deliberately narrow: only file types and path segments this stack
 * never serves. Real 404s from mistyped member links still render normally.
 */

/** Extensions this site never serves — a request for one is always a probe. */
const PROBE_EXTENSIONS: Record<string, true> = {
  asp: true,
  aspx: true,
  bak: true,
  cfm: true,
  cgi: true,
  conf: true,
  dll: true,
  exe: true,
  ini: true,
  jar: true,
  jsp: true,
  jspx: true,
  old: true,
  orig: true,
  php: true,
  php3: true,
  php4: true,
  php5: true,
  php7: true,
  phps: true,
  phtml: true,
  pl: true,
  sh: true,
  sql: true,
  swp: true,
  war: true,
};

/** Path segments that only appear in scans for other people's software. */
const PROBE_SEGMENTS: Record<string, true> = {
  actuator: true,
  autodiscover: true,
  "cgi-bin": true,
  ecp: true,
  jenkins: true,
  myadmin: true,
  owa: true,
  phpinfo: true,
  phpmyadmin: true,
  pma: true,
  solr: true,
  vendor: true,
  wordpress: true,
  "wp-admin": true,
  "wp-content": true,
  "wp-includes": true,
  "wp-json": true,
  xmlrpc: true,
};

/** The one dot-prefixed path that is legitimate (ACME, security.txt, ...). */
const ALLOWED_DOT_SEGMENT = ".well-known";

export function isProbePath(pathname: string): boolean {
  const segments = pathname.toLowerCase().split("/").filter(Boolean);
  if (segments.length === 0) return false;

  const last = segments[segments.length - 1];
  const dot = last.lastIndexOf(".");
  if (dot > 0 && PROBE_EXTENSIONS[last.slice(dot + 1)] === true) return true;

  return segments.some(
    (segment) =>
      PROBE_SEGMENTS[segment] === true ||
      (segment.startsWith(".") && segment !== ALLOWED_DOT_SEGMENT),
  );
}
