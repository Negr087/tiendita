import { chromium } from 'playwright';
import os from 'node:os';
export const CHROME = `${os.homedir()}/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome`;
export const launch = () => chromium.launch({ executablePath: CHROME });
