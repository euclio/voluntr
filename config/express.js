var bodyParser = require('body-parser');
var express = require('express');
var flash = require('express-flash');
var nunjucks = require('nunjucks');
var session = require('express-session');

var config = require('./config');
var nconf = require('./nconf');

module.exports = function(app, passport) {
    app.use('/static', express.static(config.root + '/static'));

    nunjucks.configure('app/views', {
        autoescape: true,
        express: app
    });

    app.set('view engine', 'html');

    app.use(bodyParser.urlencoded({ extended: false }));

    app.use(session({
        saveUninitialized: true,
        secret: nconf.get('VOLUNTR_SECRET'),
        resave: false,
    }));

    app.use(passport.initialize());
    app.use(passport.session());

    app.use(flash());
}
