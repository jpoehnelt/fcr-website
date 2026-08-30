import type { DirectoryEnv, EmailEnv } from "./env.ts";
import {
  MAX_RESEND_BATCH_SIZE,
  sendGatePinEmailBatch,
} from "./email.ts";
import {
  getUnifiDirectory,
  type UnifiDirectory,
  type UnifiDirectoryIssue,
} from "./directory.ts";
import {
  assignUsersToUserGroup,
  assignPinCode,
  createUnifiUser,
  getAccessProfile,
  listUserGroupMemberIds,
  listUserGroups,
  listUsers,
  unassignPinCode,
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
  pinsEmailed: number;
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
 * Users without a PIN receive a newly generated one by email. Existing PINs
 * are preserved because the Access API does not expose their plaintext value.
 */
export async function reconcileUnifiDirectory(
  directory: UnifiDirectory,
  unifiEnv: UnifiEnv,
  emailEnv: EmailEnv,
): Promise<UnifiDirectorySyncSummary> {
  if (!directory.users.length) {
    throw new UnifiDirectorySyncError({
      directoryUsers: 0,
      alreadyPresent: 0,
      created: 0,
      assignedToGroups: 0,
      pinsEmailed: 0,
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
      pinsEmailed: 0,
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

  let pinsEmailed = 0;
  const pinEmailAllowlist = emailEnv.GATE_PIN_EMAIL_ALLOWLIST
    ? new Set(
        emailEnv.GATE_PIN_EMAIL_ALLOWLIST.split(",")
          .map((email) => email.trim().toLowerCase())
          .filter(Boolean),
      )
    : null;
  if (failures.length === 0) {
    const pendingEmails: Array<{
      row: number;
      userId: string;
      to: string;
      pin: string;
    }> = [];

    for (const directoryUser of directory.users) {
      if (
        pinEmailAllowlist &&
        !pinEmailAllowlist.has(directoryUser.email)
      ) {
        continue;
      }
      const accessUser = accessUserByEmail.get(directoryUser.email);
      if (!accessUser || accessUser.hasPin === true) continue;
      if (accessUser.hasPin === null) {
        try {
          if ((await getAccessProfile(unifiEnv, accessUser.id)).hasPin) {
            continue;
          }
        } catch (error) {
          failures.push({
            row: directoryUser.row,
            reason: `gate PIN status check failed: ${
              error instanceof Error ? error.message : String(error)
            }`,
          });
          continue;
        }
      }

      try {
        pendingEmails.push({
          row: directoryUser.row,
          userId: accessUser.id,
          to: directoryUser.email,
          pin: await assignPinCode(unifiEnv, accessUser.id),
        });
      } catch (error) {
        failures.push({
          row: directoryUser.row,
          reason: `gate PIN generation failed: ${
            error instanceof Error ? error.message : String(error)
          }`,
        });
      }
    }

    for (
      let offset = 0;
      offset < pendingEmails.length;
      offset += MAX_RESEND_BATCH_SIZE
    ) {
      const batch = pendingEmails.slice(
        offset,
        offset + MAX_RESEND_BATCH_SIZE,
      );
      try {
        await sendGatePinEmailBatch(
          emailEnv,
          batch.map(({ to, pin }) => ({ to, pin })),
        );
        pinsEmailed += batch.length;
      } catch (emailError) {
        for (const delivery of batch) {
          let rollbackError: unknown;
          try {
            await unassignPinCode(unifiEnv, delivery.userId);
          } catch (error) {
            rollbackError = error;
          }
          const emailReason =
            emailError instanceof Error
              ? emailError.message
              : String(emailError);
          failures.push({
            row: delivery.row,
            reason: rollbackError
              ? `gate PIN email failed (${emailReason}) and PIN rollback failed: ${
                  rollbackError instanceof Error
                    ? rollbackError.message
                    : String(rollbackError)
                }`
              : `gate PIN email failed: ${emailReason}`,
          });
        }
      }
    }
  }

  const summary: UnifiDirectorySyncSummary = {
    directoryUsers: directory.users.length,
    alreadyPresent: directory.users.length - missing.length,
    created,
    assignedToGroups,
    pinsEmailed,
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
  emailEnv: EmailEnv,
): Promise<UnifiDirectorySyncSummary> {
  return reconcileUnifiDirectory(
    await getUnifiDirectory(directoryEnv),
    unifiEnv,
    emailEnv,
  );
}
