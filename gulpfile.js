const gulp = require('gulp');
const cache = require('gulp-cache');
const imagemin = require('gulp-imagemin');
const imageminMozjpeg = require('imagemin-mozjpeg');
const imageminOptipng = require('imagemin-optipng');
const imageminZopfli = require('imagemin-zopfli');
const babel = require('gulp-babel');
const minify = require('gulp-minify');
const concat = require('gulp-concat');
const postcss = require('gulp-postcss');
const autoprefixer = require('gulp-autoprefixer');
const nodemon = require('gulp-nodemon');
const del = require('del');
const cssnano = require('cssnano');
const browserSync = require('browser-sync').create();
const config = require('./config/gulp.js');

gulp.task('env', (cb) => {
  process.env.NODE_ENV = 'development';
  cb();
});

gulp.task('copy:fonts', () => gulp.src(config.paths.fonts.src).pipe(gulp.dest(config.paths.fonts.dist)));

gulp.task('copy:images', () =>
  gulp
    .src(config.paths.images.src)
    .pipe(
      cache(
        imagemin([
          imagemin.gifsicle({ interlaced: true }),
          imageminMozjpeg({
            quality: 85,
            progressive: true,
          }),
          imageminOptipng({ optimizationLevel: 5 }),
          imageminZopfli({
            more: true,
          }),
          imagemin.svgo({ plugins: [{ removeViewBox: false }] }),
        ])
      )
    )
    .pipe(gulp.dest(config.paths.images.dist))
);

gulp.task('copy:vendors', (cb) => {
  config.paths.vendors.forEach((vendor) => {
    return gulp.src(vendor.src).pipe(gulp.dest(vendor.dist));
  });
  cb();
});

gulp.task('copy:src', () => gulp.src(config.paths.src_files).pipe(gulp.dest(config.paths.dist_dir)));

gulp.task('clean', () => del(config.paths.dist_dir).then((cb) => cache.clearAll(cb)));

gulp.task('clean:vendors', () => del(config.paths.vendors_dir));

gulp.task('clean:fonts', () => del(config.paths.fonts_dir));

gulp.task('clean:images', () => del(config.paths.images_dir).then((cb) => cache.clearAll(cb)));

gulp.task('clean:dist', () => del(config.paths.cleanup_dirs));

gulp.task('copy:views', () => gulp.src(config.paths.views.src).pipe(gulp.dest(config.paths.views.dist)));

gulp.task('watch:views', (done) => {
  gulp.watch(config.paths.views.src, gulp.series('copy:views'));
  done();
});

gulp.task('copy:templates', () => gulp.src(config.paths.templates.src).pipe(gulp.dest(config.paths.templates.dist)));

gulp.task('watch:templates', (done) => {
  gulp.watch(config.paths.templates.src, gulp.series('copy:templates'));
  done();
});

gulp.task('copy:css', () =>
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
          'Opera >= 30',
        ],
        { cascade: true }
      )
    )
    .pipe(postcss([cssnano()]))
    .pipe(gulp.dest(config.paths.css.dist))
    .pipe(browserSync.stream())
);

gulp.task('watch:css', (done) => {
  gulp.watch(config.paths.css.src, gulp.series('copy:css'));
  done();
});

gulp.task('copy:js', () => gulp.src(config.paths.js.src).pipe(gulp.dest(config.paths.js.dist)));

gulp.task('minify:js', async () => {
  await del(config.paths.js.dist);

  gulp
    .src(config.paths.js.src)
    .pipe(
      babel({
        presets: ['@babel/env'],
        plugins: ['@babel/plugin-proposal-class-properties'],
      })
    )
    .pipe(concat('main.js'))
    .pipe(
      minify({
        ext: {
          min: '.min.js',
        },
        noSource: true,
      })
    )
    .pipe(gulp.dest(config.paths.js.dist));
});

gulp.task('watch:js', (done) => {
  gulp.watch(config.paths.js.src, gulp.series('copy:js'));
  done();
});

gulp.task('run:server', (cb) => {
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
gulp.task('build', gulp.series('clean', gulp.parallel('init', 'copy:src', 'copy:css', 'copy:js')));
gulp.task('build:dev', gulp.series('clean:dist', gulp.parallel('copy:views', 'copy:templates', 'copy:css', 'copy:js')));
gulp.task(
  'build:clean-dev',
  gulp.series('clean', gulp.parallel('init', 'copy:views', 'copy:templates', 'copy:css', 'copy:js'))
);
gulp.task('watch', gulp.parallel('watch:views', 'watch:templates', 'watch:css', 'watch:js'));
gulp.task('default', gulp.series('env', 'build:dev', 'run:server', gulp.parallel('watch', 'browser-sync')));
