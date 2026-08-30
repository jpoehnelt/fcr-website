import svelteKitWorker from "./.svelte-kit/cloudflare/_worker.js";
import {
  getDirectoryEnv,
  getEmailEnv,
} from "./src/lib/server/env.ts";
import { getUnifiEnv } from "./src/lib/server/unifi.ts";
import {
  syncUnifiDirectory,
  UnifiDirectorySyncError,
} from "./src/lib/server/unifi-directory-sync.ts";

type WorkerEnv = Record<string, unknown> & { ASSETS: Fetcher };

export default {
  fetch(request, env, context) {
    return svelteKitWorker.fetch(request, env, context);
  },

  async scheduled(controller, env) {
    const directoryEnv = getDirectoryEnv(env);
    const emailEnv = getEmailEnv(env);
    const unifiEnv = getUnifiEnv(env);
    if (!unifiEnv) {
      throw new Error("UNIFI_ACCESS_API_TOKEN is not configured");
    }

    try {
      const summary = await syncUnifiDirectory(
        directoryEnv,
        unifiEnv,
        emailEnv,
      );
      console.log("UniFi directory sync completed", {
        scheduledTime: new Date(controller.scheduledTime).toISOString(),
        directoryUsers: summary.directoryUsers,
        alreadyPresent: summary.alreadyPresent,
        created: summary.created,
        assignedToGroups: summary.assignedToGroups,
        pinEmailAllowlistActive:
          emailEnv.GATE_PIN_EMAIL_ALLOWLIST !== undefined,
        pinsEmailed: summary.pinsEmailed,
        // Sheet rows skipped for bad data. Informational: an admin fixes
        // these in the Sheet, and the next run picks them up.
        skippedRows: summary.issues.length,
        issues: summary.issues,
      });
    } catch (error) {
      if (error instanceof UnifiDirectorySyncError) {
        console.error("UniFi directory sync failed", {
          scheduledTime: new Date(controller.scheduledTime).toISOString(),
          ...error.summary,
        });
      }
      throw error;
    }
  },
} satisfies ExportedHandler<WorkerEnv>;
