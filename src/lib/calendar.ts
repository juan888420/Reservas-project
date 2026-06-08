function toGoogleUtc(date: string, time: string): string {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${utc.getUTCFullYear()}${pad(utc.getUTCMonth() + 1)}${pad(utc.getUTCDate())}` +
    `T${pad(utc.getUTCHours())}${pad(utc.getUTCMinutes())}${pad(utc.getUTCSeconds())}Z`
  );
}

export function buildGoogleCalendarUrl(params: {
  title: string;
  date: string;
  time: string;
  durationMinutes?: number;
  details: string;
  location?: string;
}): string {
  const start = toGoogleUtc(params.date, params.time);
  const [year, month, day] = params.date.split("-").map(Number);
  const [hour, minute] = params.time.split(":").map(Number);
  const endDate = new Date(
    Date.UTC(year, month - 1, day, hour, minute + (params.durationMinutes ?? 60), 0)
  );
  const pad = (n: number) => String(n).padStart(2, "0");
  const end =
    `${endDate.getUTCFullYear()}${pad(endDate.getUTCMonth() + 1)}${pad(endDate.getUTCDate())}` +
    `T${pad(endDate.getUTCHours())}${pad(endDate.getUTCMinutes())}${pad(endDate.getUTCSeconds())}Z`;

  const search = new URLSearchParams({
    action: "TEMPLATE",
    text: params.title,
    dates: `${start}/${end}`,
    details: params.details,
    location: params.location ?? "Consulta médica",
  });

  return `https://calendar.google.com/calendar/render?${search.toString()}`;
}
