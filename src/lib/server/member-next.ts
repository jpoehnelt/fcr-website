const DEFAULT_MEMBER_NEXT = "/members/";
const LOCAL_ORIGIN = "https://falls-creekranch.invalid";

export function getSafeMemberNext(
  value: string | null | undefined,
): string {
  if (!value) return DEFAULT_MEMBER_NEXT;

  try {
    const url = new URL(value, LOCAL_ORIGIN);
    const memberPath =
      url.pathname === "/members" || url.pathname.startsWith("/members/");
    if (url.origin !== LOCAL_ORIGIN || !memberPath) {
      return DEFAULT_MEMBER_NEXT;
    }

    const pathname = url.pathname === "/members" ? "/members/" : url.pathname;
    return `${pathname}${url.search}${url.hash}`;
  } catch {
    return DEFAULT_MEMBER_NEXT;
  }
}
