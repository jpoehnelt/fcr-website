import "dotenv/config";
import { TOTP } from "totp-generator";
import { chromium } from "playwright";
import { google } from "googleapis";

const {
  BUILDIUM_OTP_KEY,
  BUILDIUM_EMAIL,
  BUILDIUM_PASSWORD,
  GOOGLE_SHEET_ID,
  GOOGLE_SERVICE_ACCOUNT_EMAIL,
  GOOGLE_PRIVATE_KEY,
  CI,
} = process.env;

function randomDelay(min, max) {
  return new Promise((resolve) =>
    setTimeout(resolve, Math.random() * (max - min) + min)
  );
}

const browser = await chromium.launch({
  headless: CI === "true",
  timeout: 120_000,
});

const page = await browser.newPage();

await page.goto(
  "https://fallscreekranch.managebuilding.com/manager/public/authentication/login"
);

await page.waitForSelector("#emailAddressInput");
await page.locator("#emailAddressInput").fill(BUILDIUM_EMAIL);
await randomDelay(100, 500);
await page.locator("#passwordInput").fill(BUILDIUM_PASSWORD);
await randomDelay(100, 500);
await page.getByRole("button", { name: "Sign in", exact: true }).click();

try {
  await page.waitForSelector("#verificationCodeInput", { timeout: 15000 });
} catch (e) {
  console.error("Failed to find verification code input");
  console.log(await page.content());
  throw e;
}

const { otp } = await TOTP.generate(BUILDIUM_OTP_KEY);
await page.locator("#verificationCodeInput").fill(otp);
await randomDelay(100, 500);
await page.locator(".verify-two-factor-authentication__verify-button").click();
await randomDelay(1000, 5000);

await page.goto(
  "https://fallscreekranch.managebuilding.com/manager/api/users/associationUsers?%24count=true&%24top=200&%24orderby=LastName%20asc&Statuses=2&Statuses=4&UserTypes=1&UserTypes=64&UserTypes=65"
);

await page.waitForLoadState("networkidle");
const ownershipAccounts = JSON.parse(await page.textContent("body"));
await browser.close();

const headers = [
  "Lot",
  "First Name",
  "Last Name",
  "Email",
  "Phone (Mobile)",
  "Phone (Home)",
  "Address",
  "OwnershipAccountStartDate",
];

const rows = ownershipAccounts.Items.map((account) => [
  Number(
    account.UnitDisplayName.replace("Falls Creek Ranch Association - ", "")
  ),
  account.FirstName,
  account.LastName,
  account.Email,
  standardizePhoneNumberFormat(account.Mobile),
  standardizePhoneNumberFormat(account.Home),
  `${[account.AddressLine1, account.AddressLine2, account.AddressLine3]
    .filter((item) => Boolean(item))
    .join("\n")}\n${account.City}, ${account.State} ${account.PostalCode}`,
  account.OwnershipAccountStartDate.replace(/^2024-12-16$/, ""),
]).sort((a, b) => a[0] - b[0]);

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  },
  scopes: "https://www.googleapis.com/auth/spreadsheets",
});

const sheets = google.sheets({ version: "v4", auth });

// clear sheet of all values
await sheets.spreadsheets.values.clear({
  spreadsheetId: GOOGLE_SHEET_ID,
  range: "A1:E",
});

// write headers and values
await sheets.spreadsheets.values.update({
  spreadsheetId: GOOGLE_SHEET_ID,
  range: "A1",
  valueInputOption: "USER_ENTERED",
  requestBody: {
    values: [headers, ...rows],
  },
});

function standardizePhoneNumberFormat(phone) {
  if (!phone) {
    return "";
  }
  // Remove any non-digit characters from
  const cleanedPhone = phone.replace(/\D/g, "");

  if (cleanedPhone.length === 10) {
    return `(${cleanedPhone.substring(0, 3)}) ${cleanedPhone.substring(
      3,
      6
    )}-${cleanedPhone.substring(6)}`;
  } else if (cleanedPhone.length === 11 && cleanedPhone.startsWith("1")) {
    return `(${cleanedPhone.substring(1, 4)}) ${cleanedPhone.substring(
      4,
      7
    )}-${cleanedPhone.substring(7)}`;
  }

  return phone;
}
