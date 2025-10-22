/**
 * Конфигурация сборщика
 */
const argv = require('minimist')(process.argv)
const project = argv.project
const port = argv.port
const root = __dirname + '/..'
const conf = {
    project: project,
    port: {
        dev: port || '8060',
    },
    path: {
        blocks: [
            `${root}/blocks/*/*.bml`,
            `${root}/projects/${project}/blocks/*/*.bml`,
        ],
        lib: [
            `${root}/lib/missevent.js`,
            `${root}/lib/shuffle.js`,
            `${root}/lib/parallax.js`,
            `${root}/lib/beast.js`,
            `${root}/projects/${project}/lib/*.js`,
        ],
        css: [
            `${root}/blocks/Base/*.styl`,
            `${root}/projects/${project}/blocks/Base/*.styl`,
            `${root}/blocks/*/*.styl`,
            `${root}/projects/${project}/blocks/*/*.styl`,
        ],
        pages: [
            `${root}/pages/**/*.html`,
            `${root}/projects/${project}/pages/**/*.html`,
        ],
        build: `${root}/build/${project}`,
    },
    httpHeader: {
        200: {
            'Content-Type': 'text/html',
            'X-Frame-Options': 'SAMEORIGIN',
            'X-Content-Type-Options': 'nosniff',
        },
        404: {
            'Content-Type': 'text/plain',
            'X-Frame-Options': 'SAMEORIGIN',
            'X-Content-Type-Options': 'nosniff',
        },
        500: {
            'Content-Type': 'text/plain',
            'X-Frame-Options': 'SAMEORIGIN',
            'X-Content-Type-Options': 'nosniff',
        },
        html: {
            'Content-Type': 'text/html',
        },
        js: {
            'Content-Type': 'text/javascript',
        },
        json: {
            'Content-Type': 'application/json',
        },
        css: {
            'Content-Type': 'text/css',
        },
        svg: {
            'Content-Type': 'image/svg+xml',
            'Vary': 'Accept-Encoding',
        },
        jpg: {
            'Content-Type': 'image/jpeg',
        },
        png: {
            'Content-Type': 'image/png',
        },
        gif: {
            'Content-Type': 'image/gif',
        }
    },
}

conf.path.js = [].concat(conf.path.lib, conf.path.blocks)

module.exports = conf