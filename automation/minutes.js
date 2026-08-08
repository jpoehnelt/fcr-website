import "dotenv/config";
import { google } from "googleapis";
import fs from "fs";
import path from "path";
import { Readable } from "stream";

const { GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY } = process.env;

const FILE_ID = "1ZAeiRZjMnXnJWPLO63gaC60nyIZTdMnuAZtj1J3lgS8";

const MINUTES_DATA_PATH = path.join("src", "lib", "data", "minutes.ts");

function updateMinutesIndex(title, fileName) {
  const match = title.match(/minutes[_-](\d{4})[_-](\d{2})[_-](\d{2})/i);
  if (!match) {
    console.warn(`Downloaded ${fileName}, but could not derive its meeting date.`);
    return;
  }

  const [, year, month, day] = match;
  const url = `/uploads/documents/minutes/${fileName}`;
  const source = fs.readFileSync(MINUTES_DATA_PATH, "utf8");
  if (source.includes(`'${url}'`)) return;

  const fiscalYearStart = Number(month) >= 8 ? Number(year) : Number(year) - 1;
  const monthName = new Intl.DateTimeFormat("en-US", {
    month: "long",
    timeZone: "UTC",
  }).format(new Date(`${year}-${month}-${day}T00:00:00Z`));
  const label = `${monthName} ${Number(day)}, ${year} Board Meeting`;
  const record = `\tboard('FY ${fiscalYearStart}-${fiscalYearStart + 1}', '${label}', '${url}', '${year}-${month}-${day}'),\n`;
  const marker = "export const minutes: readonly MinuteRecord[] = [\n";

  if (!source.includes(marker)) {
    throw new Error(`Could not find the minutes array in ${MINUTES_DATA_PATH}`);
  }

  fs.writeFileSync(MINUTES_DATA_PATH, source.replace(marker, marker + record));
  console.log(`Added ${fileName} to the minutes index`);
}

async function main() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    },
    scopes: [
      "https://www.googleapis.com/auth/drive.readonly",
      "https://www.googleapis.com/auth/documents.readonly",
    ],
  });

  const docs = google.docs({ version: "v1", auth });
  const destDir = path.join("static", "uploads", "documents", "minutes");

  const { token } = await auth.getAccessToken();
  const res = await docs.documents.get({
    documentId: FILE_ID,
    includeTabsContent: true,
  });

  for (const tab of res.data.tabs) {
    const { title, tabId } = tab.tabProperties;

    // Only process tabs with names starting with "minutes_"
    if (!title.toLowerCase().startsWith("minutes_")) {
      console.log(`Skipping tab "${title}" - does not start with "minutes_"`);
      continue;
    }

    const fileName = `${title.replace(/ /g, "-")}.pdf`;
    const destPath = path.join(destDir, fileName);

    // Skip if file already exists
    if (fs.existsSync(destPath)) {
      console.log(`Skipping "${fileName}" - file already exists`);
      continue;
    }

    const textExportUrl = `https://docs.google.com/document/d/${FILE_ID}/export?format=txt&tab=${tabId}`;

    const textResponse = await fetch(textExportUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!textResponse.ok) {
      throw new error(
        `Failed to fetch text content for tab "${title}". Status: ${textResponse.status}`
      );
    }

    const tabContent = await textResponse.text();

    // Check for "Status: Approved" pattern
    const statusMatch = tabContent.match(/Status:\s*(\w+)/i);
    const status = statusMatch ? statusMatch[1] : null;

    if (status && status.toLowerCase() === "approved") {
      const exportUrl = `https://docs.google.com/document/d/${FILE_ID}/export?format=pdf&tab=${tabId}`;

      const response = await fetch(exportUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(
          `Failed to download ${fileName}. Status code: ${response.status}`
        );
      }

      const dest = fs.createWriteStream(destPath);
      await new Promise((resolve, reject) => {
        Readable.fromWeb(response.body)
          .pipe(dest)
          .on("finish", resolve)
          .on("error", reject);
      });

      console.log(`Successfully downloaded ${fileName}`);
      updateMinutesIndex(title, fileName);
    } else {
      console.log(
        `Skipping tab "${title}" - Status: ${status || "not found"}`
      );
    }
  }
  console.log("Finished processing tabs.");
}

main();
