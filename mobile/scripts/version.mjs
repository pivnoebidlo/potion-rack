// The version of package.json → the iOS project (MARKETING_VERSION 0.10.0, CURRENT_PROJECT_VERSION 1000).
// Android reads package.json itself (android/app/build.gradle).
import { readFileSync, writeFileSync } from 'node:fs';

const { version } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const [major, minor, patch] = version.split('.').map((n) => parseInt(n, 10) || 0);
const build = major * 10000 + minor * 100 + patch;
const file = new URL('../ios/App/App.xcodeproj/project.pbxproj', import.meta.url);
const text = readFileSync(file, 'utf8')
  .replace(/MARKETING_VERSION = [^;]+;/g, `MARKETING_VERSION = ${version};`)
  .replace(/CURRENT_PROJECT_VERSION = [^;]+;/g, `CURRENT_PROJECT_VERSION = ${build};`);
writeFileSync(file, text);
console.log(`iOS: ${version} (${build})`);
