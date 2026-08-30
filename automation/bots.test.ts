import assert from "node:assert/strict";
import test from "node:test";
import { isProbePath } from "../src/lib/server/bots.ts";

test("scanner probes are recognised", () => {
  for (const pathname of [
    "/kir.php",
    "/js/priv8.php",
    "/index/function.php",
    "/wp-json/acf/v3/options/a",
    "/wp-admin/setup-config.php",
    "/WP-CONTENT/uploads/shell.PHP",
    "/vendor/phpunit/eval-stdin.php",
    "/cgi-bin/luci",
    "/.env",
    "/.git/config",
    "/config.old",
    "/backup.sql",
    "/xmlrpc.php",
  ]) {
    assert.equal(isProbePath(pathname), true, pathname);
  }
});

test("real site paths are never treated as probes", () => {
  for (const pathname of [
    "/",
    "/committees/architectural-control",
    "/residents/logins",
    "/members/gate",
    "/api/auth/verify",
    "/robots.txt",
    "/sitemap-index.xml",
    "/uploads/2026-board-minutes.pdf",
    "/uploads/water-report.xlsx",
    "/favicon.ico",
    "/site.webmanifest",
    "/.well-known/security.txt",
    "/typo-that-should-render-a-404-page",
  ]) {
    assert.equal(isProbePath(pathname), false, pathname);
  }
});
