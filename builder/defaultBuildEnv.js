const getArgvValue = require('./getArgvValue');
const path = require('path');

const mode = getArgvValue('--mode') || 'development';

const version = require('../src/manifest').version;

global.BUILD_ENV = {
  distName: `extMgr-${version}`,
  outputPath: path.join(__dirname, '../dist/'),
  mode: mode,
  devtool: mode === 'development' ? 'inline-source-map' : 'none',
  babelEnvOptions: {
    targets: {
      chrome: mode === 'development' ? '71' : '49',
    },
    useBuiltIns: mode === 'development' ? false : 'usage',
  },
  version: version,
  FLAG_ENABLE_LOGGER: true,
};