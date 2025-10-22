/**
 * @lib ProjectServer Веб-сервер проектов
 * @ver 0.1.0
 * @arg --port {8070!} Порт
 */
const argv = require('minimist')(process.argv)
const http = require('http')
const axios = require('axios')
const url = require('url')
const qs = require('querystring')
const fs = require('fs')
const path = require('path')
const execSync = require('child_process').execSync
const conf = require('./conf')

// Set port explicitly to 8080
const PORT = 8080;

const staticPathRegExp = /\.(?:jpg|png|gif|svg|mp3|mp4|zip|html|css|js|bml|ttf|otf|woff|woff2)$/
const imageExt = ['jpg', 'png', 'gif', 'svg']

function responseFile(request, response, path) {
    const filePath = path.slice(1)
    const fileExt = path.split('.').pop()

    if (conf.httpHeader[fileExt] !== undefined) {
        for (const name in conf.httpHeader[fileExt]) {
            response.setHeader(name, conf.httpHeader[fileExt][name])
        }
    }

    if (fileExt === 'html') {
        fs.readFile(filePath, (err, data) => {
            if (err) {
                response.writeHead(404, conf.httpHeader[404])
                response.end('404')
            } else {
                let string = data.toString()

                // Добавить статику для экспериментов
                if (request.query.exp) {
                    string = addStaticForExperiments(
                        string, request.query.exp.split(/;|,/)
                    )
                }

                response.end(string)
            }
        })
    } else {
        const readStream = fs.createReadStream(filePath)
        readStream.pipe(response)
        readStream.on('error', function() {
            response.writeHead(404, conf.httpHeader[404])
            response.end('404')
        })
    }
}

/**
 * Запуск сервера
 */
http.createServer(function (request, response) {
    const param = url.parse(request.url, true)
    const query = param.query
    let path = param.pathname
    const pathIsStatic = staticPathRegExp.test(path)

    request.query = query

    if (path !== '/' && path.slice(-1) === '/') {
        path = path.slice(0, -1)
    }

    if (path === '/' ) {
        responseFile(request, response, '/projects/site/pages/main.html')
    }
    // Статичный файл
    else if (pathIsStatic) {
        responseFile(request, response, path)
    }
    // 404
    else {
        response.writeHead(404, conf.httpHeader[404])
        response.end('404')
    }
})
.listen(PORT)

console.log(`✓ Project server started on port ${PORT}`)

function addStaticForExperiments (string, exp) {
    const indexOfBml = string.indexOf('<script type="bml">')
    if (indexOfBml !== -1) {
        let embedString = ''
        for (let i = 0, ii = exp.length; i < ii; i++) {
            embedString += `<script type="text/javascript" src="/build/exp/${exp[i]}.js"></script>`
            embedString += `<link type="text/css" rel="stylesheet" href="/build/exp/${exp[i]}.css">`
        }
        string = string.substring(0, indexOfBml) + embedString + string.substring(indexOfBml)
    }

    return string
}