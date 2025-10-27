import "dotenv/config";
import { google } from "googleapis";
import fs from "fs";
import path from "path";
import { Readable } from "stream";

const { GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY } = process.env;

const FILE_ID = "1ZAeiRZjMnXnJWPLO63gaC60nyIZTdMnuAZtj1J3lgS8";

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
  const destDir = path.join("public", "uploads", "documents", "minutes");

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
      console.log(
        `Failed to fetch text content for tab "${title}". Status: ${textResponse.status}`
      );
      continue;
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
    } else {
      console.log(
        `Skipping tab "${title}" - Status: ${status || "not found"}`
      );
    }
  }
  console.log("Finished processing tabs.");
}

main();
