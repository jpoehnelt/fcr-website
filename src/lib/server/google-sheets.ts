import { z } from "zod";
import type { GoogleSheetsEnv } from "./env";

import { getGoogleAccessToken } from "./google-auth.ts";

const SHEETS_API_URL = "https://sheets.googleapis.com/v4/spreadsheets";
const SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets.readonly";
const REQUEST_TIMEOUT_MS = 10_000;

const sheetTitles = new Map<string, string>();

const SheetValuesSchema = z.object({
  values: z
    .array(
      z.array(
        z
          .union([z.string(), z.number(), z.boolean()])
          .transform((value) => String(value)),
      ),
    )
    .optional(),
});
const SpreadsheetMetadataSchema = z.object({
  sheets: z
    .array(
      z.object({
        properties: z
          .object({
            sheetId: z.number().optional(),
            title: z.string().optional(),
          })
          .optional(),
      }),
    )
    .optional(),
});

function getAccessToken(credentials: GoogleSheetsEnv): Promise<string> {
  return getGoogleAccessToken(credentials, SHEETS_SCOPE);
}

async function fetchGoogleJson(
  url: string,
  accessToken: string,
): Promise<unknown> {
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(`Google Sheets request failed: ${response.status}`);
  }
  return response.json();
}

export async function getSheetValues(
  credentials: GoogleSheetsEnv,
  spreadsheetId: string,
  range: string,
): Promise<string[][]> {
  const accessToken = await getAccessToken(credentials);
  const url = `${SHEETS_API_URL}/${spreadsheetId}/values/${encodeURIComponent(range)}`;
  const data = SheetValuesSchema.parse(
    await fetchGoogleJson(url, accessToken),
  );
  return data.values ?? [];
}

export async function getSheetValuesByTabId(
  credentials: GoogleSheetsEnv,
  spreadsheetId: string,
  tabId: number,
  columns: string,
): Promise<string[][]> {
  const accessToken = await getAccessToken(credentials);
  const cacheKey = `${spreadsheetId}:${tabId}`;
  let title = sheetTitles.get(cacheKey);

  if (!title) {
    const metadataUrl = new URL(`${SHEETS_API_URL}/${spreadsheetId}`);
    metadataUrl.searchParams.set(
      "fields",
      "sheets(properties(sheetId,title))",
    );
    const metadata = SpreadsheetMetadataSchema.parse(
      await fetchGoogleJson(
        metadataUrl.toString(),
        accessToken,
      ),
    );
    title = metadata.sheets
      ?.find((sheet) => sheet.properties?.sheetId === tabId)
      ?.properties?.title;
    if (!title) {
      throw new Error(`Google Sheet tab ${tabId} was not found`);
    }
    sheetTitles.set(cacheKey, title);
  }

  const escapedTitle = title.replace(/'/g, "''");
  const range = `'${escapedTitle}'!${columns}`;
  const url = `${SHEETS_API_URL}/${spreadsheetId}/values/${encodeURIComponent(range)}`;
  const data = SheetValuesSchema.parse(
    await fetchGoogleJson(url, accessToken),
  );
  return data.values ?? [];
}
