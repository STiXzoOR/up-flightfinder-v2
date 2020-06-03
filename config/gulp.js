const { platform } = require('os');

const browser = {
  darwin: 'google chrome',
  linux: 'google-chrome',
  win32: 'chrome',
};

const paths = {
  cleanup_dirs: [
    'dist/**/*',
    'dist/static/*',
    '!dist/static',
    '!dist/static/images',
    '!dist/static/images/**/*',
    '!dist/static/fonts',
    '!dist/static/fonts/**/*',
    '!dist/static/vendors',
    '!dist/static/vendors/**/*',
  ],
  vendors_dir: 'dist/static/vendors',
  fonts_dir: 'dist/static/fonts',
  images_dir: 'dist/static/images',
  src_dir: 'src',
  src_files: ['src/**/*.*', '!src/static', '!src/static/**/*'],
  dist_dir: 'dist',
  dist_files: 'dist/**/*.*',
  views: {
    src: 'src/views/**/*.pug',
    dist: 'dist/views',
  },
  css: {
    src: 'src/static/css/**/*.css',
    dist: 'dist/static/css',
  },
  js: {
    src: 'src/static/js/**/*.js',
    dist: 'dist/static/js',
  },
  fonts: {
    src: 'src/static/fonts/**/*',
    dist: 'dist/static/fonts',
  },
  images: {
    src: 'src/static/images/**/*.+(png|jpg|jpeg|gif|svg|ico)',
    dist: 'dist/static/images',
  },
  vendors: [
    {
      src: [
        'node_modules/@fortawesome/fontawesome-free/*css*/all.min.css',
        'node_modules/@fortawesome/fontawesome-free/*webfonts*/*',
      ],
      dist: 'dist/static/vendors/font-awesome',
    },
    {
      src: 'node_modules/jquery/dist/jquery.min.js',
      dist: 'dist/static/vendors/jquery',
    },
    {
      src: 'node_modules/popper.js/dist/umd/popper.min.js',
      dist: 'dist/static/vendors/popper.js',
    },
    {
      src: [
        'node_modules/bootstrap/dist/*css*/bootstrap.min.css',
        'node_modules/bootstrap/dist/*css*/bootstrap-reboot.min.css',
        'node_modules/bootstrap/dist/*js*/bootstrap.min.js',
      ],
      dist: 'dist/static/vendors/bootstrap',
    },
    {
      src: ['node_modules/flatpickr/dist/flatpickr.min.css', 'node_modules/flatpickr/dist/flatpickr.min.js'],
      dist: 'dist/static/vendors/flatpickr',
    },
    {
      src: [
        'node_modules/select2/dist/*css*/select2.min.css',
        'src/static/vendors/select2-custom/*js*/select2.full.min.js',
      ],
      dist: 'dist/static/vendors/select2',
    },
    {
      src: 'node_modules/select2-theme-bootstrap4/dist/select2-bootstrap.min.css',
      dist: 'dist/static/vendors/select2/css',
    },
    {
      src: [
        'node_modules/ion-rangeslider/*js*/ion.rangeSlider.min.js',
        'node_modules/ion-rangeslider/*css*/ion.rangeSlider.min.css',
      ],
      dist: 'dist/static/vendors/ion.rangeSlider',
    },
    {
      src: 'node_modules/zxcvbn/dist/zxcvbn.js',
      dist: 'dist/static/vendors/zxcvbn',
    },
    {
      src: 'src/static/vendors/*navdrawer*/*.js',
      dist: 'dist/static/vendors',
    },
  ],
};

module.exports = {
  paths,
  plugins: {
    browserSync: {
      proxy: 'localhost:3000',
      port: 5000,
      files: [paths.dist_files],
      browser: browser[platform()],
      notify: true,
    },
    nodemon: {
      script: './src/server.js',
      ignore: ['gulpfile.js', 'config/', 'node_modules'],
    },
  },
};
