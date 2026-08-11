import { error, json } from "@sveltejs/kit";
import { loadGateDashboard } from "$lib/server/gate-dashboard";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ locals, platform, setHeaders }) => {
  const email = locals.user?.email;
  if (!email) error(401, "Authentication required");

  setHeaders({ "cache-control": "private, no-store" });
  return json(await loadGateDashboard(platform?.env, email));
};
