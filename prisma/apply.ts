import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import dotenv from 'dotenv';

dotenv.config();

function sqlitePathFromUrl(url: string): string {
  const raw = url.replace(/^file:/, '');
  if (raw === ':memory:') return raw;
  return path.resolve(process.cwd(), raw);
}

const databaseUrl = process.env.DATABASE_URL ?? 'file:./dev.db';
const databasePath = sqlitePathFromUrl(databaseUrl);
const sqlPath = path.resolve(process.cwd(), 'prisma/init.sql');

if (!fs.existsSync(sqlPath)) {
  throw new Error('Missing prisma/init.sql. Run `npx prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script --output prisma/init.sql`.');
}

fs.mkdirSync(path.dirname(databasePath), { recursive: true });

const db = new Database(databasePath);
try {
  const exists = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'User'")
    .get();

  if (exists) {
    console.log(`Database already has tables: ${databasePath}`);
  } else {
    db.exec(fs.readFileSync(sqlPath, 'utf8'));
    console.log(`Database schema applied: ${databasePath}`);
  }

  const userExists = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'User'")
    .get();
  if (userExists) {
    const columns = new Set(
      db.prepare('PRAGMA table_info("User")').all().map((row: any) => row.name as string),
    );
    const additiveColumns = [
      ['title', 'TEXT NOT NULL DEFAULT \'\''],
      ['bio', 'TEXT NOT NULL DEFAULT \'\''],
      ['avatarUrl', 'TEXT NOT NULL DEFAULT \'\''],
      ['location', 'TEXT NOT NULL DEFAULT \'\''],
      ['websiteUrl', 'TEXT NOT NULL DEFAULT \'\''],
      ['twitterUrl', 'TEXT NOT NULL DEFAULT \'\''],
      ['linkedinUrl', 'TEXT NOT NULL DEFAULT \'\''],
      ['facebookUrl', 'TEXT NOT NULL DEFAULT \'\''],
    ] as const;

    for (const [name, definition] of additiveColumns) {
      if (!columns.has(name)) {
        db.exec(`ALTER TABLE "User" ADD COLUMN "${name}" ${definition}`);
        console.log(`Added User.${name}`);
      }
    }
  }

  const siteSettingExists = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'SiteSetting'")
    .get();
  if (siteSettingExists) {
    const columns = new Set(
      db.prepare('PRAGMA table_info("SiteSetting")').all().map((row: any) => row.name as string),
    );
    const additiveColumns = [
      ['logoUrl', 'TEXT NOT NULL DEFAULT \'\''],
      ['logoAlt', 'TEXT NOT NULL DEFAULT \'\''],
      ['logoHeight', 'INTEGER NOT NULL DEFAULT 40'],
      ['showHeaderLogo', 'BOOLEAN NOT NULL DEFAULT true'],
      ['showSiteTitle', 'BOOLEAN NOT NULL DEFAULT true'],
      ['showFooterLogo', 'BOOLEAN NOT NULL DEFAULT true'],
      ['showFooterSiteTitle', 'BOOLEAN NOT NULL DEFAULT true'],
      ['faviconUrl', 'TEXT NOT NULL DEFAULT \'\''],
      ['ogImageUrl', 'TEXT NOT NULL DEFAULT \'\''],
      ['siteUrl', 'TEXT NOT NULL DEFAULT \'http://localhost:5174\''],
      ['organizationName', 'TEXT NOT NULL DEFAULT \'Phulpur24\''],
      ['twitterHandle', 'TEXT NOT NULL DEFAULT \'\''],
      ['googleSiteVerification', 'TEXT NOT NULL DEFAULT \'\''],
      ['bingSiteVerification', 'TEXT NOT NULL DEFAULT \'\''],
      ['robotsIndex', 'BOOLEAN NOT NULL DEFAULT true'],
      ['robotsFollow', 'BOOLEAN NOT NULL DEFAULT true'],
      ['structuredDataEnabled', 'BOOLEAN NOT NULL DEFAULT true'],
      ['schemaType', 'TEXT NOT NULL DEFAULT \'NewsMediaOrganization\''],
      ['primaryColor', 'TEXT NOT NULL DEFAULT \'#194890\''],
      ['accentColor', 'TEXT NOT NULL DEFAULT \'#DC2626\''],
      ['headerBackground', 'TEXT NOT NULL DEFAULT \'#FFFFFF\''],
      ['footerBackground', 'TEXT NOT NULL DEFAULT \'#0B1220\''],
      ['pressEmail', 'TEXT NOT NULL DEFAULT \'press@phulpur24.com\''],
      ['advertisingEmail', 'TEXT NOT NULL DEFAULT \'ads@phulpur24.com\''],
      ['tipsEmail', 'TEXT NOT NULL DEFAULT \'tips@phulpur24.com\''],
      ['businessHours', 'TEXT NOT NULL DEFAULT \'Mon-Fri 9am-6pm EST\''],
      ['officeLocations', 'TEXT NOT NULL DEFAULT \'\''],
    ] as const;

    for (const [name, definition] of additiveColumns) {
      if (!columns.has(name)) {
        db.exec(`ALTER TABLE "SiteSetting" ADD COLUMN "${name}" ${definition}`);
        console.log(`Added SiteSetting.${name}`);
      }
    }

    const contactDefaults = [
      ['pressEmail', 'press@phulpur24.com'],
      ['advertisingEmail', 'ads@phulpur24.com'],
      ['tipsEmail', 'tips@phulpur24.com'],
      ['businessHours', 'Mon-Fri 9am-6pm EST'],
      ['officeLocations', 'New York|123 News Street, NY 10001|+1 (555) 123-4567\nLondon|456 Fleet Street, EC4Y 1AA|+44 20 1234 5678\nTokyo|789 Shibuya, 150-0002|+81 3 1234 5678'],
    ] as const;
    for (const [name, value] of contactDefaults) {
      db.prepare(`UPDATE "SiteSetting" SET "${name}" = ? WHERE id = 'site' AND "${name}" = ''`).run(value);
    }
  }

  const mediaAssetExists = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'MediaAsset'")
    .get();
  if (mediaAssetExists) {
    const columns = new Set(
      db.prepare('PRAGMA table_info("MediaAsset")').all().map((row: any) => row.name as string),
    );
    const additiveColumns = [
      ['storageProvider', 'TEXT NOT NULL DEFAULT \'inline\''],
      ['storageKey', 'TEXT NOT NULL DEFAULT \'\''],
    ] as const;

    for (const [name, definition] of additiveColumns) {
      if (!columns.has(name)) {
        db.exec(`ALTER TABLE "MediaAsset" ADD COLUMN "${name}" ${definition}`);
        console.log(`Added MediaAsset.${name}`);
      }
    }
  }

  db.exec(`
CREATE TABLE IF NOT EXISTS "StaticPage" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "excerpt" TEXT NOT NULL DEFAULT '',
  "content" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PUBLISHED',
  "seoTitle" TEXT NOT NULL DEFAULT '',
  "metaDescription" TEXT NOT NULL DEFAULT '',
  "updatedAt" DATETIME NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "StaticPage_slug_key" ON "StaticPage"("slug");
CREATE INDEX IF NOT EXISTS "StaticPage_status_idx" ON "StaticPage"("status");

CREATE TABLE IF NOT EXISTS "ContactMessage" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "firstName" TEXT NOT NULL,
  "lastName" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'NEW',
  "ipHash" TEXT,
  "userAgent" TEXT,
  "resolvedAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);
CREATE INDEX IF NOT EXISTS "ContactMessage_status_createdAt_idx" ON "ContactMessage"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "ContactMessage_email_idx" ON "ContactMessage"("email");

CREATE TABLE IF NOT EXISTS "AdPlacement" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "key" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "placement" TEXT NOT NULL,
  "label" TEXT NOT NULL DEFAULT 'Advertisement',
  "imageUrl" TEXT NOT NULL DEFAULT '',
  "targetUrl" TEXT NOT NULL DEFAULT '',
  "html" TEXT NOT NULL DEFAULT '',
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "startsAt" DATETIME,
  "endsAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "AdPlacement_key_key" ON "AdPlacement"("key");
CREATE INDEX IF NOT EXISTS "AdPlacement_placement_enabled_idx" ON "AdPlacement"("placement", "enabled");

CREATE TABLE IF NOT EXISTS "NavigationItem" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "label" TEXT NOT NULL,
  "href" TEXT NOT NULL,
  "location" TEXT NOT NULL DEFAULT 'HEADER',
  "position" INTEGER NOT NULL DEFAULT 0,
  "external" BOOLEAN NOT NULL DEFAULT false,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);
CREATE INDEX IF NOT EXISTS "NavigationItem_location_enabled_position_idx" ON "NavigationItem"("location", "enabled", "position");

CREATE TABLE IF NOT EXISTS "AnalyticsSnapshot" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "date" DATETIME NOT NULL,
  "views" INTEGER NOT NULL DEFAULT 0,
  "visitors" INTEGER NOT NULL DEFAULT 0,
  "sessions" INTEGER NOT NULL DEFAULT 0,
  "activeUsers" INTEGER NOT NULL DEFAULT 0,
  "avgLoadMs" INTEGER NOT NULL DEFAULT 0,
  "direct" INTEGER NOT NULL DEFAULT 0,
  "search" INTEGER NOT NULL DEFAULT 0,
  "social" INTEGER NOT NULL DEFAULT 0,
  "referral" INTEGER NOT NULL DEFAULT 0,
  "desktopUsers" INTEGER NOT NULL DEFAULT 0,
  "mobileUsers" INTEGER NOT NULL DEFAULT 0,
  "tabletUsers" INTEGER NOT NULL DEFAULT 0,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "AnalyticsSnapshot_date_key" ON "AnalyticsSnapshot"("date");
CREATE INDEX IF NOT EXISTS "AnalyticsSnapshot_date_idx" ON "AnalyticsSnapshot"("date");

CREATE TABLE IF NOT EXISTS "IntegrationSecret" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "provider" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "category" TEXT NOT NULL DEFAULT 'GENERAL',
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "secretCiphertext" TEXT NOT NULL DEFAULT '',
  "secretPreview" TEXT NOT NULL DEFAULT '',
  "model" TEXT NOT NULL DEFAULT '',
  "endpoint" TEXT NOT NULL DEFAULT '',
  "notes" TEXT NOT NULL DEFAULT '',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "IntegrationSecret_provider_key" ON "IntegrationSecret"("provider");
CREATE INDEX IF NOT EXISTS "IntegrationSecret_category_enabled_idx" ON "IntegrationSecret"("category", "enabled");
`);
} finally {
  db.close();
}
