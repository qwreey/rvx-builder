const { readdirSync, createWriteStream, unlink } = require('node:fs');
const { join: joinPath } = require('node:path');

const { load } = require('cheerio');
const { getSources } = require('../utils/Settings.js');
const Progress = require('node-fetch-progress');
const fetchWithUserAgent = require('../utils/fetchWithUserAgent.js');

/** @type {import('ws').WebSocket} */
let ws;

/**
 * @param {string} fileName
 */
async function overWriteJarNames(fileName) {
  const filePath = joinPath(global.revancedDir, fileName);

  const source = getSources();
  const cli = source.cli.split('/')[1];
  const patches = source.patches.split('/')[1];
  const integrations = source.integrations.split('/')[1];
  const microg = source.microg.split('/')[1];

  if (fileName.includes(cli) && fileName.endsWith('.jar')) {
    global.jarNames.cli = filePath;
  }

  if (fileName.includes(patches) && fileName.endsWith('.jar')) {
    global.jarNames.patchesJar = filePath;
  }

  if (fileName.includes(patches) && fileName.endsWith('.json')) {
    global.jarNames.patchesList = filePath;
  }

  if (fileName.includes(integrations) && fileName.endsWith('.apk')) {
    global.jarNames.integrations = filePath;
  }

  if (fileName.includes(microg)) {
    global.jarNames.microG = filePath;
  }

  if (fileName.includes('APKEditor') && fileName.endsWith('.jar')) {
    global.jarNames.apkEditor = filePath;
  }
}

/**
 * @param {Record<string, any>} json
 */
async function getDownloadLink(json, preReleases) {
  const preReleaseUrl = `https://github.com/${json.owner}/${json.repo}/releases`
  const preReleaseTag = 'span[class="ml-1 wb-break-all"]'
  const stableReleaseUrl = `https://github.com/${json.owner}/${json.repo}/releases/latest`
  const stableReleaseTag = 'span[class="ml-1"]'

  let releaseTag = stableReleaseTag;
  let releaseUrl = stableReleaseUrl;

  if (preReleases) releaseTag = preReleaseTag;
  if (preReleases) releaseUrl = preReleaseUrl;

  const json_ = {
    version: '',
    assets: '',
    repo: json.repo
  };

  /** @type {{ browser_download_url: string }[]} */
  const assets = [];
  const releasesPage = await fetchWithUserAgent(releaseUrl);

  if (!releasesPage.ok)
    throw new Error(
        'You got ratelimited from GitHub\n...Completely? What did you even do?'
    );

  const releasePage = await releasesPage.text();
  const $ = load(releasePage);

  json_.version = $(releaseTag).first().text().replace(/\s/g, '');

  const expandedAssets = await fetchWithUserAgent(
    `https://github.com/${json.owner}/${json.repo}/releases/expanded_assets/${json_.version}`
  );

  const assetsPageText = await expandedAssets.text();
  const assetsPage = load(assetsPageText);

  for (const downloadLink of assetsPage('a[rel="nofollow"]').get())
    if (
      !downloadLink.attribs.href.endsWith('.tar.gz') &&
      !downloadLink.attribs.href.endsWith('.zip')
    )
      assets.push({
        browser_download_url: `https://github.com${downloadLink.attribs.href}`
      });

  json_.assets = assets;

  return json_;
}

/**
 * @param {Record<string, any>} assets
 */
async function downloadFile(assets) {
  for (const asset of assets.assets) {
    const dir = readdirSync(global.revancedDir);

    const fileExt = asset.browser_download_url
      .split('/')
      .at(-1)
      .split('.')
      .at(-1);
    if (fileExt == 'asc') continue;
    const fileName = `${assets.repo}-${assets.version}.${fileExt}`;

    overWriteJarNames(fileName);

    if (dir.includes(fileName)) continue;

    await dloadFromURL(
      asset.browser_download_url,
      joinPath(global.revancedDir, fileName)
    );
  }
}

/**
 * @param {string} url
 * @param {string} outputPath
 * @param {import('ws').WebSocket} [websocket]
 */
async function dloadFromURL(url, outputPath, websocket) {
  if (websocket != null) ws = websocket;

  try {
    const res = await fetchWithUserAgent(url);
    const writeStream = createWriteStream(outputPath);
    const downloadStream = res.body.pipe(writeStream);

    ws.send(
      JSON.stringify({
        event: 'downloadingFile',
        name: outputPath.split('/').at(-1),
        percentage: 0
      })
    );

    const progress = new Progress(res, { throttle: 50 });

    return new Promise((resolve, reject) => {
      progress.on('progress', (p) => {
        ws.send(
          JSON.stringify({
            event: 'downloadingFile',
            name: outputPath.split('/').at(-1),
            percentage: Math.floor(p.progress * 100)
          })
        );
      });

      downloadStream.once('finish', resolve);
      downloadStream.once('error', (err) => {
        unlink(outputPath, () => {
          reject(new Error('Download failed.', err));
        });
      });
    });
  } catch (err) {
    global.downloadFinished = false;

    throw err;
  }
}

/**
 * @param {Record<string, any>[]} repos
 * @param {import('ws').WebSocket} websocket
 */
async function downloadFiles(repos, preReleases, websocket) {
  ws = websocket;

  for (const repo of repos) {
    const downloadLink = await getDownloadLink(repo, preReleases);

    await downloadFile(downloadLink);
  }
}

module.exports = { downloadFiles, dloadFromURL, getDownloadLink };
