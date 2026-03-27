import { sheets } from "@googleapis/sheets";
import { cache } from "react";

export const getSheet = () => {
  const auth = new (require("google-auth-library").GoogleAuth)({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL as string,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  return sheets({ version: "v4", auth });
};

export const getSheetTitle = cache(async (sheetId: string) => {
  const sheet = getSheet();
  const res = await sheet.spreadsheets.get({ spreadsheetId: sheetId });
  return res.data.properties?.title ?? "Untitled Sheet";
});
