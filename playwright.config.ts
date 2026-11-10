import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';
import { Products } from './src/fixtures/pages.fixture';

dotenv.config();

export default defineConfig({
  testDir: './tests',
  preserveOutput: 'always',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,

  workers: 1,

  reporter: [
    ['html', { open: 'never' }],
    ['list'],
    ['json', { outputFile: 'test-results/results.json' }],
  ],

  metadata: {
    // Default fallback environment
    environment: process.env.TEST_ENV || 'Pre-Beta',

    // Per-product environment mapping
    environments: {
      // [Products.Marketplace]: process.env.MARKETPLACE_ENV || 'Pre-Prod',
      // [Products.GovSupport]: process.env.GOV_PRODUCTS_ENV || 'Pre-Prod',
      // [Products.SharedProducts]: process.env.SHARED_PRODUCTS_ENV || 'Pre-Prod',
      // [Products.MarketService]: process.env.MARKET_SERVICE_ENV || 'Pre-Prod',
      // [Products.Sayal]: process.env.SAYAL_ENV || 'Pre-Prod',
      // [Products.SelfConstruction]: process.env.SELF_CONSTRUCTION_ENV || 'Pre-Prod',
      // [Products.DigitarBroker]: process.env.DIGITAR_BROKER_ENV || 'STG',
      // [Products.DigitarDeveloper]: process.env.DIGITAR_DEVELOPER_ENV || 'STG',
      // [Products.Loyalty]: process.env.LOYALTY_ENV || 'Pre-Prod',
      // [Products.RealEstateData]: process.env.REAL_ESTATE_DATA_ENV || 'Pre-Prod',
      [Products.Rebranding]: process.env.REBRANDING_ENV || 'Pre-Beta',
    },
  },

  timeout: 180_000,
  expect: { timeout: 30_000 },

  use: {
    baseURL: process.env.BASE_URL ?? 'https://pre-beta-sakani.housingapps.sa',
    permissions: ['geolocation', 'local-network-access'],
    geolocation: { latitude: 21.5424, longitude: 39.198 },
    navigationTimeout: 120_000,
    actionTimeout: 30_000,
    trace: 'on',
    screenshot: 'on',
    video: 'retain-on-failure',
    locale: 'ar-SA',
    timezoneId: 'Asia/Riyadh',
    ignoreHTTPSErrors: true,
    headless: false,

    viewport: null,

    launchOptions: {
      args: [
        "--start-maximized",
        // "--lang=ar-SA",
        "--disable-web-security",
        "--disable-features=BlockInsecurePrivateNetworkRequests,PrivateNetworkAccessSendPreflights,PrivateNetworkAccessPermissionPrompt,Translate",
        "--disable-translate",
      ],
    },
  },

  projects: [
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: 'guest',
      testIgnore: [/auth\.setup\.ts/, /profile\//],
    },
    {
      name: 'authenticated',
      testMatch: /profile\//,
      dependencies: ['setup'],
      use: {
        storageState: '.auth/user.json',
      },
    },
  ],
});