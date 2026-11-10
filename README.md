# Playwright Test Automation Framework

This repository contains an automated end-to-end testing suite built with Playwright, TypeScript, and Page Object Model (POM) architecture.

## Prerequisites

Before setting up the repository, ensure you have the following installed on your machine:

* **Node.js** (v18 or higher recommended)
* **npm** (v9 or higher)
* **Git**

---

## Setup & Installation

Follow these steps to get the project running locally after cloning the repository.

### 1. Clone the Repository
```bash
git clone <repository-url>
cd <repository-folder-name>
```

### 2. Install Dependencies
Install all required Node modules, including Playwright, TypeScript, and environment managers:
```bash
npm install
npm install -D open-cli
```

### 3. Install Playwright Browsers
Download the required browser binaries (Chromium, Firefox, WebKit):
```bash
npx playwright install --with-deps
```

## Running Tests

### Execute All Tests
```bash
npx playwright test
```

### Run Tests in UI Mode (Interactive Debugging)
```bash
npx playwright test --ui
```

### Run Tests in Formatted / Headed Mode
```bash
npx playwright test --headed
```

### Run a Specific Test File
```bash
npx playwright test tests/e2e-scenarios/login-validation.spec.ts
```

---

## Viewing Test Reports

After running tests, Playwright automatically generates an HTML report. To open and view execution results:

```bash
npx playwright show-report
```

---

## Workspace Directory Structure

```text
├── src/
│   ├── base/           # Base application setup and WebApp manager
│   ├── data/           # JSON test data and environment configurations
│   ├── objects/        # Page locator objects and selectors
│   └── pages/          # Page Object Model class definitions
├── tests/              # E2E test suites (.spec.ts)
├── playwright.config.ts # Playwright global test runner settings
├── tsconfig.json       # TypeScript configuration and path aliases
└── package.json        # Project scripts and dependencies
```