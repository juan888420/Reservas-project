import { google } from "googleapis";
import type { OAuth2Client } from "google-auth-library";

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID!,
  process.env.GOOGLE_CLIENT_SECRET!,
  `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`
);

export const getAuthUrl = () => {
  const scopes = [
    "https://www.googleapis.com/auth/calendar",
    "https://www.googleapis.com/auth/calendar.events",
  ];

  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: scopes,
    prompt: "consent",
  });
};

export const getTokensFromCode = async (code: string) => {
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
};

export const createCalendarEvent = async (
  accessToken: string,
  eventData: {
    title: string;
    description?: string;
    startTime: Date;
    endTime: Date;
    email?: string;
  }
) => {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID!,
    process.env.GOOGLE_CLIENT_SECRET!
  );
  auth.setCredentials({ access_token: accessToken });

  const calendar = google.calendar({ version: "v3", auth });

  const event = {
    summary: eventData.title,
    description: eventData.description,
    start: {
      dateTime: eventData.startTime.toISOString(),
      timeZone: "America/New_York",
    },
    end: {
      dateTime: eventData.endTime.toISOString(),
      timeZone: "America/New_York",
    },
    attendees: eventData.email ? [{ email: eventData.email }] : undefined,
  };

  const response = await calendar.events.insert({
    calendarId: "primary",
    requestBody: event,
  });

  return response.data;
};

export const updateCalendarEvent = async (
  accessToken: string,
  eventId: string,
  eventData: {
    title: string;
    description?: string;
    startTime: Date;
    endTime: Date;
    email?: string;
  }
) => {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID!,
    process.env.GOOGLE_CLIENT_SECRET!
  );
  auth.setCredentials({ access_token: accessToken });

  const calendar = google.calendar({ version: "v3", auth });

  const event = {
    summary: eventData.title,
    description: eventData.description,
    start: {
      dateTime: eventData.startTime.toISOString(),
      timeZone: "America/New_York",
    },
    end: {
      dateTime: eventData.endTime.toISOString(),
      timeZone: "America/New_York",
    },
    attendees: eventData.email ? [{ email: eventData.email }] : undefined,
  };

  const response = await calendar.events.update({
    calendarId: "primary",
    eventId,
    requestBody: event,
  });

  return response.data;
};

export const deleteCalendarEvent = async (
  accessToken: string,
  eventId: string
) => {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID!,
    process.env.GOOGLE_CLIENT_SECRET!
  );
  auth.setCredentials({ access_token: accessToken });

  const calendar = google.calendar({ version: "v3", auth });

  await calendar.events.delete({
    calendarId: "primary",
    eventId,
  });
};

export const refreshAccessToken = async (refreshToken: string) => {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID!,
    process.env.GOOGLE_CLIENT_SECRET!
  );

  auth.setCredentials({ refresh_token: refreshToken });

  const { credentials } = await auth.refreshAccessToken();
  return credentials;
};
