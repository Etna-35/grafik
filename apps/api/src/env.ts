import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optional(name: string, fallback: string): string {
  return process.env[name] || fallback;
}

export const env = {
  nodeEnv: optional("NODE_ENV", "development"),
  port: Number(optional("PORT", "3000")),
  databaseUrl: required("DATABASE_URL"),
  sessionSecret: required("SESSION_SECRET"),
  pinPepper: required("PIN_PEPPER"),
  cookieSecure: optional("COOKIE_SECURE", "false") === "true",
  cookieDomain: process.env.COOKIE_DOMAIN || undefined,
  publicGrafikUrl: optional("PUBLIC_GRAFIK_URL", "https://etna-35.github.io/grafik/"),
  ownerName: optional("OWNER_NAME", "Руководитель"),
  ownerPin: process.env.OWNER_PIN,
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || "",
  telegramManagerChatId: process.env.TELEGRAM_MANAGER_CHAT_ID || "",
  telegramTeamChatId: process.env.TELEGRAM_TEAM_CHAT_ID || ""
};
