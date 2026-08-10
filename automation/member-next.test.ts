import assert from "node:assert/strict";
import test from "node:test";
import { getSafeMemberNext } from "../src/lib/server/member-next.ts";

test("member return paths preserve announcement fragments", () => {
  assert.equal(
    getSafeMemberNext("/members/#announcement-3c6d6573736167653e"),
    "/members/#announcement-3c6d6573736167653e",
  );
  assert.equal(
    getSafeMemberNext("/members/directory/?view=neighbors"),
    "/members/directory/?view=neighbors",
  );
});

test("member return paths reject external and public destinations", () => {
  assert.equal(getSafeMemberNext("https://example.com/members/"), "/members/");
  assert.equal(getSafeMemberNext("//example.com/members/"), "/members/");
  assert.equal(getSafeMemberNext("/contact-us/"), "/members/");
});
