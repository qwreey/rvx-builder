const { existsSync, readFileSync, rmSync, writeFileSync, lstatSync } = require('node:fs');

const defaultSettings = {
  sources: {
    cli: 'inotia00/revanced-cli',
    patches: 'inotia00/revanced-patches',
    integrations: 'inotia00/revanced-integrations',
    microg: 'ReVanced/GmsCore',
    prereleases: 'false'
  },
  patches: []
};
const defaultSettingsJSON = JSON.stringify(defaultSettings, null, 2);
const settingsPath = process.env.SETTINGS_PATH ?? 'settings.json'

function createSettingsFile() {
  writeFileSync(settingsPath, defaultSettingsJSON);
}

/**
 * @param {string} pkgName
 * @returns {Record<string, any>}
 */
function getPatchesList(pkgName) {
  const patchesList = JSON.parse(readFileSync(settingsPath, 'utf8'));

  const package = patchesList.patches.find(
    (package) => package.name === pkgName
  );

  if (!package) {
    return [];
  } else {
    return package.patches;
  }
}

/**
 * @param {string} packageName
 * @param {Record<string, any>} patches
 */
function writePatches({ packageName }, patches) {
  if (!existsSync(settingsPath)) {
    createSettingsFile();
  }

  const patchesList = JSON.parse(readFileSync(settingsPath, 'utf8'));

  const index = patchesList.patches.findIndex(
    (package) => package.name === packageName
  );

  if (index === -1) {
    patchesList.patches.push({
      name: packageName,
      patches
    });
  } else patchesList.patches[index].patches = patches;

  writeFileSync(settingsPath, JSON.stringify(patchesList, null, 2));
}

/**
 * @param {string} pkgName
 */
function getPatchList(pkgName) {
  if (!existsSync(settingsPath)) {
    createSettingsFile();

    return [];
  } else return getPatchesList(pkgName);
}

function getSettings() {
  const settings = JSON.parse(readFileSync(settingsPath, 'utf8'));

  return settings;
}

function resetPatchesSources(ws) {
  // writeFileSync already overwrites target file.
  // We need rmSync for directory only.
  // If we remove normal file, in docker container,
  // we can't mount settings file as single file.
  // (EX: - ./settings.json:/app/settings.json)
  if (!existsSync(settingsPath) && lstatSync(settingsPath).isDirectory()) {
    rmSync(settingsPath, { recursive: true, force: true });
  }
  createSettingsFile();
}

function writeSources(sources) {
  const settings = JSON.parse(readFileSync(settingsPath, 'utf8'));

  settings.sources = sources;

  writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
}

function getSources() {
  if (!existsSync(settingsPath)) {
    createSettingsFile();

    return defaultSettings.sources;
  } else return getSettings().sources;
}

module.exports = {
  getPatchList,
  writePatches,
  getSources,
  resetPatchesSources,
  writeSources
};
