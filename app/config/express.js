var bodyParser = require('body-parser');
var express = require('express');
var flash = require('express-flash');
var nconf = require('./nconf');
var session = require('express-session');

module.exports = function(app, passport) {
    app.set('view engine', 'ejs');

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
