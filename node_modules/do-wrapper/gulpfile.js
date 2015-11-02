var gulp = require('gulp'),
    babel = require('gulp-babel'),
    SOURCE_DIRECTORY = 'src/**/*.js',
    DEST_DIRECTORY = 'dist/';

gulp.task('compile', function () {
  return gulp.src(SOURCE_DIRECTORY)
          .pipe(babel({experimental: true}))
          .pipe(gulp.dest(DEST_DIRECTORY));
});
