export const DIRECTORY_COLUMNS = [
  "lot",
  "email",
  "email_share",
  "name",
  "last",
  "first",
  "phone_mobile",
  "phone_home",
  "phone_share",
  "address",
  "role",
] as const;

export type DirectoryRole = "Resident" | "Tenant" | "Neighbor" | "Other";

export interface ResidentDirectoryEntry {
  id: string;
  lot: string;
  name: string;
  first: string;
  last: string;
  address: string;
  role: DirectoryRole;
  email?: string;
  mobilePhone?: string;
  homePhone?: string;
}

const ROLE_VALUES = new Set<DirectoryRole>([
  "Resident",
  "Tenant",
  "Neighbor",
  "Other",
]);

function cell(value: unknown, maxLength = 240): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function isShared(value: string): boolean {
  return ["true", "yes", "y", "1", "checked"].includes(value.trim().toLowerCase());
}

function validEmail(value: string): string | undefined {
  const normalized = value.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)
    ? normalized.slice(0, 254)
    : undefined;
}

function directoryRole(value: string): DirectoryRole {
  return ROLE_VALUES.has(value as DirectoryRole)
    ? (value as DirectoryRole)
    : "Other";
}

export class ResidentDirectorySchemaError extends Error {
  readonly missingColumns: string[];

  constructor(missingColumns: string[]) {
    super(`Directory sheet is missing columns: ${missingColumns.join(", ")}`);
    this.name = "ResidentDirectorySchemaError";
    this.missingColumns = missingColumns;
  }
}

export function parseResidentDirectoryRows(
  rows: unknown[][],
): ResidentDirectoryEntry[] {
  if (!rows.length) return [];

  const headers = rows[0].map((value) => cell(value).toLowerCase());
  const indexes = new Map(headers.map((header, index) => [header, index]));
  const missingColumns = DIRECTORY_COLUMNS.filter(
    (column) => !indexes.has(column),
  );
  if (missingColumns.length) {
    throw new ResidentDirectorySchemaError([...missingColumns]);
  }

  const valueAt = (row: unknown[], column: (typeof DIRECTORY_COLUMNS)[number]) =>
    cell(row[indexes.get(column)!]);

  return rows
    .slice(1)
    .map((row, rowIndex): ResidentDirectoryEntry | null => {
      const first = valueAt(row, "first");
      const last = valueAt(row, "last");
      const name = valueAt(row, "name") || [first, last].filter(Boolean).join(" ");
      const lot = valueAt(row, "lot");
      const address = valueAt(row, "address");
      if (!name || (!lot && !address)) return null;

      const role = directoryRole(valueAt(row, "role"));
      if (role !== "Resident" && role !== "Tenant") return null;

      const entry: ResidentDirectoryEntry = {
        id: `${rowIndex + 2}-${lot || address}-${name}`,
        lot,
        name,
        first,
        last,
        address,
        role,
      };
      if (isShared(valueAt(row, "email_share"))) {
        const email = validEmail(valueAt(row, "email"));
        if (email) entry.email = email;
      }
      if (isShared(valueAt(row, "phone_share"))) {
        const mobilePhone = valueAt(row, "phone_mobile");
        const homePhone = valueAt(row, "phone_home");
        if (mobilePhone) entry.mobilePhone = mobilePhone;
        if (homePhone) entry.homePhone = homePhone;
      }
      return entry;
    })
    .filter((entry): entry is ResidentDirectoryEntry => entry !== null)
    .sort((left, right) =>
      (left.last || left.name).localeCompare(right.last || right.name, undefined, {
        sensitivity: "base",
      }),
    );
}
