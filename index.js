var fs = require('fs'),
    path = require('path'),
    through = require('through2'),
    gutil = require('gulp-util'),
    svgicons2svgfont = require('svgicons2svgfont'),
    svg2ttf = require('svg2ttf'),
    ttf2eot = require('ttf2eot'),
    ttf2woff = require('ttf2woff'),
    ttf2woff2 = require('ttf2woff2'),
    handlebars = require('handlebars');

function svg2font(options) {
  var iconStream = svgicons2svgfont({
        fontName: options.fontName,
        normalize: true,
        callback: function(gl){
          iconStream._glyphsCache = gl;
        }
      });
  
  // set default start unicode.  
  options.startUnicode = options.startUnicode || 0xEA01;
      
  // creating a stream through which each svg file will pass
  var outStream = through.obj(function(file, enc, cb) {
    if (file.isNull()) {
      this.emit('error', new Error('empty file not supported!'));
      return cb();
    }

    if (file.isStream()) {
      this.emit('error', new Error('streaming not supported!'));
      return cb();
    }

    // necessary metadata for the glyph itself.
    file.metadata = {
      name: file.basename.replace(file.extname, ''),
      unicode: [String.fromCharCode('0x'+(options.startUnicode++).toString(16))]
    };

    iconStream.write(file);
    cb();
  }, function(outStreamFlushCb){
    var _this = this,
        svgFontFileContBuffer = [];

    // icons to svg
    iconStream.pipe(through.obj(function (chunk, enc, cb) {
      svgFontFileContBuffer.push(chunk);
      cb();
    }, function (cb) {
      var svgFileCont = Buffer.concat(svgFontFileContBuffer),
          ttfFileCont = null,
          cssTplFn = null;

      // generate svg font.
      _this.push(new gutil.File({
        cwd: '',
        base: '',
        path: options.fontName + '.svg',
        contents: svgFileCont
      }));

      // generate css if required.
      if (options.cssTpl) {
        // content: '\<%= glyphs[i].codepoint.toString(16).toUpperCase() %>';
        handlebars.registerHelper('parseCode', function(unicode){
          return unicode[0].charCodeAt(0).toString(16).toUpperCase();
        });

        cssTplFn = handlebars.compile(fs.readFileSync(options.cssTpl, 'utf-8'));

        // generate svg font.
        try {
          _this.push(new gutil.File({
            cwd: '',
            base: '',
            path: path.basename(options.cssTpl),
            contents: new Buffer(cssTplFn({
              fontName: options.fontName,
              className: options.className,
              // sort icons by name
              glyphs: iconStream._glyphsCache.sort(function(a,b){
                return a.name > b.name ? 1 : a.name < b.name ? -1 : 0;
              })
            }))
          }));
        } catch(err) {
          _this.emit('error',
            new Error('failed to generate css.'));
        }
      }

      // svg to ttf
      try {
        ttfFileCont = new Buffer(svg2ttf(String(svgFileCont), {
          ts: options.timestamp,
          copyright: options.copyright,
        }).buffer);

        _this.push(new gutil.File({
          cwd: '',
          base: '',
          path: options.fontName + '.ttf',
          contents: ttfFileCont
        }));
      } catch(err) {
        _this.emit('error',
         ('ttf converting task failed.'));
      }

      // generate eot font from ttf
      try {
        _this.push(new gutil.File({
          cwd: '',
          base: '',
          path: options.fontName + '.eot',
          contents: new Buffer(ttf2eot(new Uint8Array(ttfFileCont)).buffer)
        }));
      } catch(err) {
        _this.emit('error',
          new Error('eot converting task failed.'));
      }

      // generate woff font from ttf
      try {
        _this.push(new gutil.File({
          cwd: '',
          base: '',
          path: options.fontName + '.woff',
          contents: new Buffer(ttf2woff(new Uint8Array(ttfFileCont)).buffer)
        }));
      } catch(err) {
        _this.emit('error',
          new Error('woff converting task failed.'));
      }

      // generate woff2 font from ttf
      try {
        _this.push(new gutil.File({
          cwd: '',
          base: '',
          path: options.fontName + '.woff2',
          contents: ttf2woff2(ttfFileCont)
        }));
      } catch(err) {
        _this.emit('error',
          new Error('woff2 converting task failed.'));
      }

      cb();

      outStreamFlushCb();
    }));

    // we have finished processing all the svgs passed in, tell
    // `svgicons2svgfont` to not wait any more.
    iconStream.end();
  });

  return outStream;
}

module.exports = svg2font;
