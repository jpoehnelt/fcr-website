/**
 * Look up emails in the resident directory Google Sheet.
 *
 * Reads with the same service account as `automation/`, but talks to the
 * Sheets REST API directly so it can run inside the Cloudflare Worker (the
 * `googleapis` package is too Node-dependent for that runtime).
 */
import type { DirectoryEnv } from "./env.ts";
import {
  parseResidentDirectoryRows,
  type ResidentDirectoryEntry,
} from "../resident-directory.ts";
import { getSheetValues } from "./google-sheets.ts";

/**
 * Where the addresses live: column A of the `emails` tab. Override with
 * GOOGLE_SHEET_RANGE if the directory ever moves. Fetching one column
 * keeps the rest of the residents' details out of the Worker entirely.
 */
const DEFAULT_RANGE = "emails!A:A";
const MEMBER_DIRECTORY_RANGE = "Directory!A:K";
const UNIFI_DIRECTORY_RANGE = "Directory!A:K";


export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Picks the column holding addresses. Prefers a header naming it, so a
 * wider range still works, and falls back to the first column — which is
 * the default range's only column.
 *
 * A header cell containing "@" is treated as data, not a header, so a
 * sheet with no header row doesn't silently drop its first resident.
 */
function locateEmails(rows: string[][]): { column: number; body: string[][] } {
  const headerColumn = rows[0].findIndex(
    (cell) => cell.toLowerCase().includes("email") && !cell.includes("@"),
  );
  return headerColumn === -1
    ? { column: 0, body: rows }
    : { column: headerColumn, body: rows.slice(1) };
}

/**
 * Whether the address was found, and how many the sheet actually yielded.
 * The count is what distinguishes "this person isn't a resident" from
 * "we read the wrong range and saw nothing at all".
 */
export interface DirectoryLookup {
  found: boolean;
  scanned: number;
  range: string;
}

/**
 * Looks the email up in the directory sheet.
 */
export async function isEmailInDirectory(
  env: DirectoryEnv,
  email: string,
): Promise<DirectoryLookup> {
  const configuredRange = env.GOOGLE_SHEET_RANGE || DEFAULT_RANGE;
  const rows = await getSheetValues(
    env,
    env.GOOGLE_SHEET_ID,
    configuredRange,
  );
  if (!rows.length) {
    return { found: false, scanned: 0, range: configuredRange };
  }

  const { column, body } = locateEmails(rows);
  const target = normalizeEmail(email);
  const addresses = body
    .map((row) => normalizeEmail(row[column] ?? ""))
    .filter(Boolean);
  return {
    found: addresses.includes(target),
    scanned: addresses.length,
    range: configuredRange,
  };
}

/**
 * Returns only fields residents elected to share. The parser drops private
 * email and phone values before this data can cross the server boundary.
 */
export async function getResidentDirectory(
  env: DirectoryEnv,
): Promise<ResidentDirectoryEntry[]> {
  const rows = await getSheetValues(
    env,
    env.GOOGLE_SHEET_ID,
    MEMBER_DIRECTORY_RANGE,
  );
  return parseResidentDirectoryRows(rows);
}

export interface UnifiDirectoryUser {
  row: number;
  email: string;
  firstName: string;
  lastName: string;
}

export interface UnifiDirectoryIssue {
  row: number;
  reason: string;
}

export interface UnifiDirectory {
  users: UnifiDirectoryUser[];
  issues: UnifiDirectoryIssue[];
}

export class UnifiDirectorySchemaError extends Error {
  constructor(readonly missingColumns: string[]) {
    super(
      `Directory sheet is missing UniFi columns: ${missingColumns.join(", ")}`,
    );
    this.name = "UnifiDirectorySchemaError";
  }
}

const UNIFI_COLUMNS = ["email", "first", "last", "role"] as const;
const UNIFI_ROLES: Record<string, true> = { resident: true, tenant: true };
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


/**
 * Reads the private identity fields required to create Access users.
 * Only residents and tenants are gate-eligible; sharing preferences apply
 * to the member-facing directory, not this server-only reconciliation.
 */
export function parseUnifiDirectoryRows(rows: unknown[][]): UnifiDirectory {
  if (!rows.length) return { users: [], issues: [] };

  const headers = rows[0].map((value) =>
    (typeof value === "string" ? value.trim() : "").toLowerCase(),
  );
  const indexes = new Map(headers.map((header, index) => [header, index]));
  const missingColumns = UNIFI_COLUMNS.filter((column) => !indexes.has(column));
  if (missingColumns.length) {
    throw new UnifiDirectorySchemaError([...missingColumns]);
  }

  const users: UnifiDirectoryUser[] = [];
  const issues: UnifiDirectoryIssue[] = [];
  const byEmail = new Map<string, UnifiDirectoryUser>();
  const valueAt = (row: unknown[], column: (typeof UNIFI_COLUMNS)[number]) => {
    const value = row[indexes.get(column)!];
    return typeof value === "string" ? value.trim() : "";
  };

  rows.slice(1).forEach((row, index) => {
    const sheetRow = index + 2;
    if (!UNIFI_ROLES[valueAt(row, "role").toLowerCase()]) return;

    const email = normalizeEmail(valueAt(row, "email"));
    const firstName = valueAt(row, "first");
    const lastName = valueAt(row, "last");
    if (!email || !EMAIL_PATTERN.test(email)) {
      issues.push({ row: sheetRow, reason: "missing or invalid email" });
      return;
    }
    if (!firstName || !lastName) {
      issues.push({ row: sheetRow, reason: "missing first or last name" });
      return;
    }

    const user = { row: sheetRow, email, firstName, lastName };
    const duplicate = byEmail.get(email);
    if (duplicate) {
      if (
        duplicate.firstName !== firstName ||
        duplicate.lastName !== lastName
      ) {
        issues.push({
          row: sheetRow,
          reason: `email duplicates row ${duplicate.row} with a different name`,
        });
      }
      return;
    }

    byEmail.set(email, user);
    users.push(user);
  });

  return { users, issues };
}

/** Loads the private directory fields used by the scheduled Access sync. */
export async function getUnifiDirectory(
  env: DirectoryEnv,
): Promise<UnifiDirectory> {
  const rows = await getSheetValues(
    env,
    env.GOOGLE_SHEET_ID,
    UNIFI_DIRECTORY_RANGE,
  );
  return parseUnifiDirectoryRows(rows);
}
