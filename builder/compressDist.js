const path = require('path');
const fs = require('fs');
const archiver = require('archiver');

const version = require('../src/manifest').version;
const outputPath = path.join(__dirname, '../dist');
const distName = `extMgr-${version}`;

const compressDist = () => {
  const ext = 'zip';
  const dist = path.join(outputPath, 'dist');

  const zipFolder = (srcFolder, zipFilePath, callback) => {
    const output = fs.createWriteStream(zipFilePath);
    const zipArchive = archiver('zip', {
      zlib: {level: 9},
    });

    output.on('close', function () {
      callback();
    });

    zipArchive.pipe(output);

    zipArchive.glob('**/*', {
      cwd: srcFolder,
    });

    zipArchive.finalize(function (err, bytes) {
      if (err) {
        callback(err);
      }
    });
  };

  return new Promise((resolve, reject) => {
    zipFolder(dist, path.join(outputPath, `${distName}.${ext}`), (err) => {
      err ? reject(err) : resolve();
    });
  });
};

compressDist();
