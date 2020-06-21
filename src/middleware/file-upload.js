const { tmpdir } = require('os');
const fileUpload = require('express-fileupload');

module.exports = function uploader(options) {
  const config = {
    createParentPath: true,
    useTempFiles: true,
    tempFileDir: `${tmpdir()}/flightfinder/uploads`,
    limits: {
      files: 1,
      fileSize: 1024 * 1024,
    },
    ...options,
  };

  return fileUpload(config);
};
