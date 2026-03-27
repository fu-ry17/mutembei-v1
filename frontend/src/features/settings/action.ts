"use server";

import { auth } from "@/lib/auth";
import { getSheet, getSheetTitle } from "./sheet-config";
import { headers } from "next/headers";
import prisma from "@/lib/prisma";
import { cache } from "react";

const getSession = cache(async () => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session;
});

export const verify_sheet_id = async (sheetId: string) => {
  const session = await getSession();
  const title = await getSheetTitle(sheetId);

  await prisma.user.update({
    where: { id: session.user.id },
    data: { sheetId },
  });

  return { title };
};

export const get_user_sheet = cache(async () => {
  const session = await getSession();

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { sheetId: true },
  });

  if (!user?.sheetId) return { connected: false, title: null };

  const title = await getSheetTitle(user.sheetId);

  return { connected: true, title };
});

export const disconnect_sheet = async () => {
  const session = await getSession();

  await prisma.user.update({
    where: { id: session.user.id },
    data: { sheetId: null },
  });
};

export const test_data = async () => {
  const SPREADSHEET_ID = "1rJBjTHT12dj29hjKmkFhUaL4EX7teS99jOG2Tqar69g";
  const sheet = getSheet();

  // update title
  await sheet.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      requests: [
        {
          updateSpreadsheetProperties: {
            properties: { title: "My New Title" },
            fields: "title",
          },
        },
      ],
    },
  });

  //
};
