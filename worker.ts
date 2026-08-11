import svelteKitWorker from "./.svelte-kit/cloudflare/_worker.js";
import { getDirectoryEnv } from "./src/lib/server/env.ts";
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
    const unifiEnv = getUnifiEnv(env);
    if (!unifiEnv) {
      throw new Error("UNIFI_ACCESS_API_TOKEN is not configured");
    }

    try {
      const summary = await syncUnifiDirectory(directoryEnv, unifiEnv);
      console.log("UniFi directory sync completed", {
        scheduledTime: new Date(controller.scheduledTime).toISOString(),
        directoryUsers: summary.directoryUsers,
        alreadyPresent: summary.alreadyPresent,
        created: summary.created,
        assignedToGroups: summary.assignedToGroups,
      });
    } catch (error) {
      if (error instanceof UnifiDirectorySyncError) {
        console.error("UniFi directory sync completed with problems", {
          scheduledTime: new Date(controller.scheduledTime).toISOString(),
          ...error.summary,
        });
      }
      throw error;
    }
  },
} satisfies ExportedHandler<WorkerEnv>;
