var express = require('express');
var moment = require('moment');
var passport = require('passport');

var database = require('./app/config/database');

var app = express();

require('./app/config/passport')(passport)
require('./app/config/express')(app, passport)

var events = require('./app/controllers/events');
var forms = require('./app/models/forms')
var middleware = require('./app/config/middleware');
var requireLogin = middleware.requireLogin;
var users = require('./app/controllers/users');

app.use('/static', express.static(__dirname + '/static'));

app.use(middleware.injectUser);

app.get('/', function(req, res) {
    res.render('index');
});

app.get('/profile',
        requireLogin,
        function(req, res) {
    res.render('profile');
});

app.get('/events',
        requireLogin,
        function(req, res) {
    database.query('SELECT * FROM event', function(err, rows, fields) {
        res.render('events', { events: rows, moment: moment });
    });
});

app.get('/add',
        requireLogin,
        function(req, res) {
    res.render('addevent', {
        form: forms.renderForm(forms.addEventForm)
    });
});

app.post('/add', requireLogin, events.addEvent);

app.get('/register', function(req, res) {
    res.render('register', {
        role: req.query.role,
        form: forms.renderForm(forms.registerForm)
    });
});

app.post('/register', users.register);

app.get('/login', function(req, res) {
    res.render('login');
});

app.post('/login',
    passport.authenticate('local', {
        successRedirect: '/profile',
        failureRedirect: '/login',
        failureFlash: true })
);

app.get('/logout', function(req, res) {
    req.logout();
    res.redirect('/');
})

app.listen(8080, function() {
    console.log('Running on http://localhost:8080');
});
