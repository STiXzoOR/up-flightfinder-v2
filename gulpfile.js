const gulp = require('gulp');
const cache = require('gulp-cache');
const imagemin = require('gulp-imagemin');
const del = require('del');
const autoprefixer = require('gulp-autoprefixer');
const browserSync = require('browser-sync').create();
const nodemon = require('gulp-nodemon');
const config = require('./config/gulp.js');
require('./config/object-foreach.js');

gulp.task('copy:fonts', () => gulp.src(config.paths.fonts.src).pipe(gulp.dest(config.paths.fonts.dist)));

gulp.task('copy:images', () =>
  gulp
    .src(config.paths.images.src)
    .pipe(cache(imagemin()))
    .pipe(gulp.dest(config.paths.images.dist))
);

gulp.task('copy:vendors', (done) => {
  config.paths.vendors.forEach((vendor) => gulp.src(vendor.src).pipe(gulp.dest(vendor.dist)));
  done();
});

// gulp.task('copy:vendors', (done) => {
//   Object.keys(config.paths.vendors).forEach((index) => {
//     const vendor = config.paths.vendors[index];
//     return gulp.src(vendor.src).pipe(gulp.dest(vendor.dist));
//   });
//   done();
// });

gulp.task('clean', () => del(config.paths.dist_dir).then((cb) => cache.clearAll(cb)));

gulp.task('clean:dist', () => del(config.paths.cleanup_dirs));

gulp.task('dev:views', () => gulp.src(config.paths.views.src).pipe(gulp.dest(config.paths.views.dist)));

gulp.task('watch:views', (done) => {
  gulp.watch(config.paths.views.src, gulp.series('dev:views'));
  done();
});

gulp.task('dev:css', () =>
  gulp
    .src(config.paths.css.src)
    .pipe(
      autoprefixer(
        [
          'last 1 major version',
          '>= 1%',
          'Chrome >= 45',
          'Firefox >= 38',
          'Edge >= 12',
          'Explorer >= 10',
          'iOS >= 9',
          'Safari >= 9',
          'Android >= 4.4',
          'Opera >= 30'
        ],
        { cascade: true }
      )
    )
    .pipe(gulp.dest(config.paths.css.dist))
);

gulp.task('watch:css', (done) => {
  gulp.watch(config.paths.css.src, gulp.series('dev:css'));
  done();
});

gulp.task('dev:js', () => gulp.src(config.paths.js.src).pipe(gulp.dest(config.paths.js.dist)));

gulp.task('watch:js', (done) => {
  gulp.watch(config.paths.js.src, gulp.series('dev:js'));
  done();
});

gulp.task('server', (cb) => {
  let called = false;
  return nodemon(config.plugins.nodemon).on('start', () => {
    if (!called) {
      called = true;
      cb();
    }
  });
});

const browserSyncInit = (done) => {
  browserSync.init(config.plugins.browserSync);
  done();
};

gulp.task('browser-sync', browserSyncInit);
gulp.task('init', gulp.parallel('copy:fonts', 'copy:images', 'copy:vendors'));
gulp.task('dev', gulp.parallel('dev:views', 'dev:css', 'dev:js'));
gulp.task('watch', gulp.parallel('watch:views', 'watch:css', 'watch:js'));
gulp.task('default', gulp.series('clean:dist', 'dev', 'server', gulp.parallel('watch', 'browser-sync')));
