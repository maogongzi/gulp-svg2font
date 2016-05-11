# gulp-svg2font
Create icon fonts from SVG icons.

# how to use

```
...
var foo = require('gulp-foo'),
    sketch = require('gulp-sketch'),
    svg2font = require('gulp-svg2font'),
    rename = require('gulp-rename'),
    filter = require('gulp-filter'),
    bar = require('gulp-bar');

gulp.task('font-icons', function(){
    var rawFilesBase = path.join(assetRoot, 'libs/font-icons-sketch'),
        sketchFile = path.join(rawFilesBase, 'symbol-font-14px.sketch'),
        cssTplName = 'font-icons.tpl.scss',
        cssTpl = path.join(rawFilesBase, cssTplName),
        cssFilter = filter(function(file){
            return file.basename === cssTplName ? true : false;
        }),
        fontsFilter = filter(function(file){
            return file.basename !== cssTplName ? true : false;
        });

    gulp.src(sketchFile)
        .pipe(sketch({
            export: 'artboards',
            formats: 'svg'
        }))
        .pipe(svg2font({
            // {optional} startUnicode: 0xEA01,
            className: 'font-icon',
            fontName: 'font-icons',
            cssTpl: cssTpl
        }))
        // output all font files
        .pipe(fontsFilter)
        .pipe(gulp.dest(path.join(assetRoot, 'fonts/font-icons')))
        .pipe(fontsFilter.restore())
        // rename and output css file
        .pipe(cssFilter)
        .pipe(rename({basename: '_font-icons'}))
        .pipe(gulp.dest(path.join(assetRoot, 'scss/utils')));
});
```

# FAQs

