'use strict';

let fs = require('fs'),
    path = require('path'),
    http = require('http');

let app = require('connect')();
let serveStatic = require('serve-static');


let serverPort = process.env.PORT || 8080;

app.use(serveStatic(path.join(__dirname, 'public')));

http.createServer(app).listen(serverPort, function() {
    console.log('Your server is listening on port %d (http://localhost:%d)', serverPort, serverPort);
});
