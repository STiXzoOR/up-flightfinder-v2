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
  images_dir: 'dist/static/images',
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
  vendors: {
    fontawesome: {
      src: [
        'node_modules/@fortawesome/fontawesome-free/*css*/all.min.css',
        'node_modules/@fortawesome/fontawesome-free/*webfonts*/*',
      ],
      dist: 'dist/static/vendors/font-awesome',
    },
    jquery: {
      src: 'node_modules/jquery/dist/jquery.min.js',
      dist: 'dist/static/vendors/jquery',
    },
    popper: {
      src: 'node_modules/popper.js/dist/umd/popper.min.js',
      dist: 'dist/static/vendors/popper.js',
    },
    bootstrap: {
      src: [
        'node_modules/bootstrap/dist/*css*/bootstrap.min.css',
        'node_modules/bootstrap/dist/*css*/bootstrap-reboot.min.css',
        'node_modules/bootstrap/dist/*js*/bootstrap.min.js',
      ],
      dist: 'dist/static/vendors/bootstrap',
    },
    datepicker: {
      src: ['node_modules/flatpickr/dist/flatpickr.min.css', 'node_modules/flatpickr/dist/flatpickr.min.js'],
      dist: 'dist/static/vendors/flatpickr',
    },
    select2: {
      src: ['node_modules/select2/dist/*css*/select2.min.css', 'node_modules/select2/dist/*js*/select2.full.min.js'],
      dist: 'dist/static/vendors/select2',
    },
    select2Bootstrap: {
      src: 'node_modules/select2-theme-bootstrap4/dist/select2-bootstrap.min.css',
      dist: 'dist/static/vendors/select2/css',
    },
    ionRange: {
      src: [
        'node_modules/ion-rangeslider/*js*/ion.rangeSlider.min.js',
        'node_modules/ion-rangeslider/*css*/ion.rangeSlider.min.css',
      ],
      dist: 'dist/static/vendors/ion.rangeSlider',
    },
    zxcvbn: {
      src: 'node_modules/zxcvbn/dist/zxcvbn.js',
      dist: 'dist/static/vendors/zxcvbn',
    },
    loadMore: {
      src: 'node_modules/simple-load-more/jquery.simpleLoadMore.min.js',
      dist: 'dist/static/vendord/simple-load-more/simpleLoadMore.min.js',
    },
    tinysort: {
      src: 'node_modules/tinysort/dist/tinysort.min.js',
      dist: 'dist/static/vendors/tinysort',
    },
  },
};

module.exports = {
  paths,
  plugins: {
    browserSync: {
      proxy: 'localhost:3000',
      port: 5000,
      files: [paths.dist_files],
      browser: 'google chrome',
      notify: true,
    },
    nodemon: {
      script: './bin/www',
      ignore: ['gulpfile.js', 'config/', 'node_modules'],
    },
  },
};
