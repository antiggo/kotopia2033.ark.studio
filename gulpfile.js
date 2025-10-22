// node_modules requires
const gulp = require('gulp')
const concat = require('gulp-concat')
const stylus = require('gulp-stylus')
const base64 = require('gulp-base64')
const base64Settings = {
    extensions: ['svg'],
    maxImageSize: 10 * 1024,
    debug: false
}
const autoprefixer = require('gulp-autoprefixer')
const autoprefixerSettings = {
    overrideBrowserslist: [
        'last 2 versions',
        '> 1%',
        'not dead',
        'not ie <= 11'
    ],
    cascade: false
}
const through = require('through2')
const fs = require('fs')
const http = require('http')
const argv = require('minimist')(process.argv)
const spawn = require('child_process').spawn
const execSync = require('child_process').execSync
const browserSync = require('browser-sync').create()

// lib requires
const beast = require('./lib/beast.js')
const conf = require('./lib/conf.js')

// Заготовка для gulp-плагина
const pipeToString = (callback, ext) => {
    return through.obj(function(file, encoding, cb) {
        if (file.isNull()) return cb(null, file)
        if (file.isStream()) return cb(new PluginError('gulp-beast', 'Streaming not supported'))
        if (ext === undefined || file.path.split('.').pop() === ext) {
            file.contents = Buffer.from(
                callback(file.contents.toString(), file)
            )
        }
        cb (null, file)
    })
}

const quoteBase64 = (string, file) => string.replace(/url\(([^)]+)\)/g, "url('$1')")

if (!conf.project) {
    console.log('Please specify --project')
    process.exit(1)
}

if (!fs.existsSync('./build')) {
    fs.mkdirSync('./build')
}

if (!fs.existsSync(conf.path.build)) {
    fs.mkdirSync(conf.path.build)
}

function js() {
    return gulp.src(conf.path.js)
        .pipe(pipeToString(
            string => beast.parseBML(string),
            'bml'
        ))
        .pipe(concat('build.js'))
        .pipe(gulp.dest(conf.path.build))
        .on('end', function() {
            browserSync.reload();
        })
}

function css() {
    const filenames = []
    const splitString = '\n/* CUT THE FILE HERE */\n'

    return gulp.src(conf.path.css)
        .pipe(base64(base64Settings))
        .pipe(concat('build.styl', {newLine: splitString}))
        .pipe(pipeToString(quoteBase64, 'styl'))
        .pipe(
            stylus({
                paths: [__dirname + '/blocks'],
            })
        )
        .pipe(autoprefixer(autoprefixerSettings))
        .pipe(gulp.dest(conf.path.build))
        .on('end', function() {
            browserSync.reload('*.css');
        })
}

function createExpTasks() {
    let expNames = []
    let expTasks = []

    // Get full list of experiment names
    if (fs.existsSync(conf.path.exp)) {
        expNames = expNames.concat(
            fs.readdirSync(conf.path.exp).filter(
                expName => expName.indexOf('.') === -1
            )
        )
    }

    // If no experiments, return a dummy task
    if (expNames.length === 0) {
        return function(cb) { cb(); };
    }

    // Build for each experiment
    for (let i = 0, ii = expNames.length; i < ii; i++) {
        let expName = expNames[i]
        let js = [`${conf.path.exp}/${expName}/**/*.bml`]
        let css = [`${conf.path.exp}/${expName}/**/*.styl`]

        if (!fs.existsSync(`${conf.path.build}/exp/`)) {
            fs.mkdirSync(`${conf.path.build}/exp/`)
        }

        fs.writeFileSync(`${conf.path.build}/exp/${expName}.js`, '')
        fs.writeFileSync(`${conf.path.build}/exp/${expName}.css`, '')

        // Create JS task for this experiment
        const expJs = function() {
            return gulp.src(js)
                .pipe(pipeToString(string => beast.parseBML(string), 'bml'))
                .pipe(concat(`${expName}.js`))
                .pipe(gulp.dest(`${conf.path.build}/exp`))
        }
        gulp.task(`exp-js-${expName}`, expJs)

        // Create CSS task for this experiment
        const expCss = function() {
            return gulp.src(css)
                .pipe(base64(base64Settings))
                .pipe(concat(`${expName}.styl`))
                .pipe(pipeToString(quoteBase64, 'styl'))
                .pipe(stylus({
                    paths: [__dirname + '/blocks']
                }))
                .pipe(autoprefixer(autoprefixerSettings))
                .pipe(gulp.dest(`${conf.path.build}/exp`))
        }
        gulp.task(`exp-css-${expName}`, expCss)

        if (!argv['no-watch']) {
            gulp.watch(js, gulp.series(`exp-js-${expName}`))
            gulp.watch(css, gulp.series(`exp-css-${expName}`))
        }

        expTasks.push(gulp.parallel(`exp-js-${expName}`, `exp-css-${expName}`))
    }

    return gulp.parallel(...expTasks)
}

let server
function startServer(cb) {
    server && server.kill()
    server = spawn('node', ['lib/server-project.js', '--port', conf.port.dev, '--dev', '--project', conf.project])

    server.stdout.on('data', (data) => {
        // Server output (suppressed)
    })
    server.stderr.on('data', (data) => {
        // Server error (suppressed)
        server.kill()
    })
    server.on('error', (data) => {
        // Server error (suppressed)
        server.kill()
    })
    process.on('exit', (code) => {
        server.kill()
    })

    // Simpler Browser-Sync configuration
    browserSync.init({
        proxy: `http://localhost:8080`,
        port: 3000,
        ui: false,
        open: false,
        notify: false,
        ghostMode: false,
        reloadOnRestart: true
    }, function(err, bs) {
        console.log('\n✓ BrowserSync started at http://localhost:3000\n');
    });

    cb()
}

// Define public tasks
gulp.task('js', js)
gulp.task('css', css)

// Build task combines js, css, and exp tasks
const build = gulp.parallel(js, css, createExpTasks())
gulp.task('build', build)

// Now we can use build since it's defined
gulp.task('server', gulp.series(build, startServer))

// Default task
function watchFiles(cb) {
    // Watch all .bml files in blocks and project
    gulp.watch(`${__dirname}/blocks/**/*.bml`, { ignoreInitial: false }, 
        gulp.series(js, function(done) {
            browserSync.reload();
            done();
        })
    );
    gulp.watch(`${__dirname}/projects/${conf.project}/**/*.bml`, { ignoreInitial: false },
        gulp.series(js, function(done) {
            browserSync.reload();
            done();
        })
    );

    // Watch all .styl files in blocks and project
    gulp.watch(`${__dirname}/blocks/**/*.styl`, { ignoreInitial: false },
        gulp.series(css)
    );
    gulp.watch(`${__dirname}/projects/${conf.project}/**/*.styl`, { ignoreInitial: false },
        gulp.series(css)
    );

    // Watch experiment files if they exist
    if (fs.existsSync(conf.path.exp)) {
        gulp.watch(`${conf.path.exp}/**/*.bml`, { ignoreInitial: false }, gulp.series(build))
            .on('change', function(path) {
                // File changed (auto-rebuilding)
            });
        gulp.watch(`${conf.path.exp}/**/*.styl`, { ignoreInitial: false }, gulp.series(build))
            .on('change', function(path) {
                // File changed (auto-rebuilding)
            });
    }

    console.log(`\n✓ Watching ${conf.project} project for changes\n`);
    cb();
}

// Update the default task
gulp.task('default', gulp.series(
    build,
    gulp.parallel(watchFiles, startServer)
));
