const fs = require('node:fs');

const browserCandidates = [
  { env: 'CHROME_BIN', paths: [
    process.env.CHROME_BIN,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  ]},
  { env: 'EDGE_BIN', paths: [
    process.env.EDGE_BIN,
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  ]},
].flatMap(b => b.paths.map(p => ({ env: b.env, path: p }))).filter(b => b.path);

const detectedBrowser = browserCandidates.find((b) => fs.existsSync(b.path));

if (detectedBrowser) {
  // Set CHROME_BIN to whatever browser we found (Edge or Chrome)
  // This way the ChromeHeadlessCI launcher will use the correct binary
  process.env.CHROME_BIN = detectedBrowser.path;
}

module.exports = function (config) {
  config.set({
    basePath: '',
    frameworks: ['jasmine'],
    plugins: [
      require('karma-jasmine'),
      require('karma-chrome-launcher'),
      require('karma-jasmine-html-reporter'),
      require('karma-coverage'),
    ],
    jasmineHtmlReporter: {
      suppressAll: true,
    },
    coverageReporter: {
      dir: require('node:path').join(__dirname, 'coverage', 'techstoresystemapp'),
      subdir: '.',
      reporters: [{ type: 'html' }, { type: 'text-summary' }],
    },
    reporters: ['progress', 'kjhtml'],
    browsers: ['ChromeHeadlessCI'],
    customLaunchers: {
      ChromeHeadlessCI: {
        base: 'ChromeHeadless',
        flags: ['--no-sandbox', '--disable-dev-shm-usage'],
      },
    },
    singleRun: true,
    restartOnFileChange: false,
  });
};

