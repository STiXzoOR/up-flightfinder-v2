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
    '!dist/static/vendors/**/*'
  ],
  dist_dir: 'dist',
  dist_files: 'dist/**/*.*',
  views: {
    src: 'src/views/**/*.pug',
    dist: 'dist/views'
  },
  css: {
    src: 'src/static/css/**/*.css',
    dist: 'dist/static/css'
  },
  js: {
    src: 'src/satic/js/**/*.js',
    dist: 'dist/static/js'
  },
  fonts: {
    src: 'src/static/fonts/**/*',
    dist: 'dist/static/fonts'
  },
  images: {
    src: 'src/static/images/**/*.+(png|jpg|jpeg|svg)',
    dist: 'dist/static/images'
  },
  vendors: {
    fontawesome: {
      src: ['node_modules/font-awesome/*css*/font-awesome.min.css', 'node_modules/font-awesome/*fonts*/*'],
      dist: 'dist/static/vendors/font-awesome'
    },
    jquery: {
      src: 'node_modules/jquery/dist/jquery.min.js',
      dist: 'dist/static/vendors/jquery'
    },
    popper: {
      src: 'node_modules/popper.js/dist/umd/popper.min.js',
      dist: 'dist/static/vendors/popper.js'
    },
    bootstrap: {
      src: [
        'node_modules/bootstrap/dist/*css*/bootstrap.min.css',
        'node_modules/bootstrap/dist/*css*/bootstrap-reboot.min.css',
        'node_modules/bootstrap/dist/*js*/bootstrap.min.js'
      ],
      dist: 'dist/static/vendors/bootstrap'
    },
    datepicker: {
      src: ['node_modules/flatpickr/dist/flatpickr.min.css', 'node_modules/flatpickr/dist/flatpickr.min.js'],
      dist: 'dist/static/vendors/flatpickr'
    },
    select2: {
      src: ['node_modules/select2/dist/*css*/select2.min.css', 'node_modules/select2/dist/*js*/select2.full.min.js'],
      dist: 'dist/static/vendors/select2'
    },
    select2_bootstrap: {
      src: 'node_modules/select2-theme-bootstrap4/dist/select2-bootstrap.min.css',
      dist: 'dist/static/vendors/select2/css'
    }
  }
};

module.exports = {
  paths,
  plugins: {
    browserSync: {
      proxy: 'localhost:3000',
      port: 5000,
      files: [paths.dist_files],
      browser: 'google chrome',
      notify: true
    },
    nodemon: {
      script: './bin/www',
      ignore: ['gulpfile.js', 'config/', 'node_modules']
    }
  }
};
