import type { DirectoryEnv } from "./env.ts";
import {
  getUnifiDirectory,
  type UnifiDirectory,
  type UnifiDirectoryIssue,
} from "./directory.ts";
import {
  createUnifiUser,
  listUsers,
  type UnifiEnv,
} from "./unifi.ts";

export interface UnifiDirectorySyncFailure {
  row: number;
  reason: string;
}

export interface UnifiDirectorySyncSummary {
  directoryUsers: number;
  alreadyPresent: number;
  created: number;
  issues: UnifiDirectoryIssue[];
  failures: UnifiDirectorySyncFailure[];
}

export class UnifiDirectorySyncError extends Error {
  constructor(readonly summary: UnifiDirectorySyncSummary) {
    const problemCount = summary.issues.length + summary.failures.length;
    super(`UniFi directory sync finished with ${problemCount} problem(s)`);
    this.name = "UnifiDirectorySyncError";
  }
}

/**
 * Adds every eligible Sheet resident missing from Access, matched by
 * normalized email. This is deliberately add-only: users already in Access
 * are not edited, and users absent from the Sheet are not disabled or removed.
 */
export async function reconcileUnifiDirectory(
  directory: UnifiDirectory,
  unifiEnv: UnifiEnv,
): Promise<UnifiDirectorySyncSummary> {
  if (!directory.users.length) {
    throw new UnifiDirectorySyncError({
      directoryUsers: 0,
      alreadyPresent: 0,
      created: 0,
      issues: [
        ...directory.issues,
        { row: 1, reason: "directory contained no eligible users" },
      ],
      failures: [],
    });
  }

  const accessUsers = await listUsers(unifiEnv);
  const accessEmails = new Set(accessUsers.map((user) => user.email));
  const missing = directory.users.filter(
    (user) => !accessEmails.has(user.email),
  );
  const failures: UnifiDirectorySyncFailure[] = [];
  let created = 0;

  // Keep writes sequential. The directory is small, and avoiding a burst of
  // create requests makes Access rate limiting and partial failures clearer.
  for (const user of missing) {
    try {
      await createUnifiUser(unifiEnv, user);
      created += 1;
    } catch (error) {
      failures.push({
        row: user.row,
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const summary: UnifiDirectorySyncSummary = {
    directoryUsers: directory.users.length,
    alreadyPresent: directory.users.length - missing.length,
    created,
    issues: directory.issues,
    failures,
  };
  if (summary.issues.length || summary.failures.length) {
    throw new UnifiDirectorySyncError(summary);
  }
  return summary;
}

/** Loads the Sheet and performs one add-only Access reconciliation. */
export async function syncUnifiDirectory(
  directoryEnv: DirectoryEnv,
  unifiEnv: UnifiEnv,
): Promise<UnifiDirectorySyncSummary> {
  return reconcileUnifiDirectory(
    await getUnifiDirectory(directoryEnv),
    unifiEnv,
  );
}
