import type { DirectoryEnv } from "./env.ts";
import {
  getUnifiDirectory,
  type UnifiDirectory,
  type UnifiDirectoryIssue,
} from "./directory.ts";
import {
  assignUsersToUserGroup,
  createUnifiUser,
  listUserGroupMemberIds,
  listUserGroups,
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
  assignedToGroups: number;
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
 * normalized email, and adds each user to the Access group matching the
 * Sheet role. This is deliberately add-only: existing memberships are not
 * removed, and users absent from the Sheet are not disabled or removed.
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
      assignedToGroups: 0,
      issues: [
        ...directory.issues,
        { row: 1, reason: "directory contained no eligible users" },
      ],
      failures: [],
    });
  }

  const accessUsers = await listUsers(unifiEnv);
  const accessUserByEmail = new Map(
    accessUsers.map((user) => [user.email, user]),
  );
  const missing = directory.users.filter(
    (user) => !accessUserByEmail.has(user.email),
  );
  const failures: UnifiDirectorySyncFailure[] = [];
  const groups = await listUserGroups(unifiEnv);
  const groupByRole = new Map<string, (typeof groups)[number]>();

  for (const role of new Set(directory.users.map((user) => user.role))) {
    const matching = groups.filter(
      (group) => group.name.trim().toLowerCase() === role.toLowerCase(),
    );
    if (matching.length !== 1) {
      const row = directory.users.find((user) => user.role === role)!.row;
      failures.push({
        row,
        reason:
          matching.length === 0
            ? `UniFi Access user group "${role}" was not found`
            : `UniFi Access has multiple user groups named "${role}"`,
      });
      continue;
    }
    groupByRole.set(role, matching[0]);
  }

  // Do not create another unassigned user when Access group configuration is
  // incomplete. The next cron run can recover after an admin fixes the group.
  if (failures.length) {
    throw new UnifiDirectorySyncError({
      directoryUsers: directory.users.length,
      alreadyPresent: directory.users.length - missing.length,
      created: 0,
      assignedToGroups: 0,
      issues: directory.issues,
      failures,
    });
  }

  let created = 0;
  for (const user of missing) {
    try {
      const createdUser = await createUnifiUser(unifiEnv, user);
      accessUserByEmail.set(user.email, createdUser);
      created += 1;
    } catch (error) {
      failures.push({
        row: user.row,
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  let assignedToGroups = 0;
  for (const [role, group] of groupByRole) {
    const roleUsers = directory.users.filter((user) => user.role === role);
    try {
      const memberIds = new Set(
        await listUserGroupMemberIds(unifiEnv, group.id),
      );
      const userIds = roleUsers
        .map((user) => accessUserByEmail.get(user.email)?.id)
        .filter((id): id is string => id !== undefined && !memberIds.has(id));
      await assignUsersToUserGroup(unifiEnv, group.id, userIds);
      assignedToGroups += userIds.length;
    } catch (error) {
      failures.push({
        row: roleUsers[0]!.row,
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const summary: UnifiDirectorySyncSummary = {
    directoryUsers: directory.users.length,
    alreadyPresent: directory.users.length - missing.length,
    created,
    assignedToGroups,
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
