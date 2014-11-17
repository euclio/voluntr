var express = require('express');
var passport = require('passport');

var app = express();

require('./config/passport')(passport)
require('./config/express')(app, passport)

var events = require('./app/controllers/events');
var middleware = require('./config/middleware');
var requireLogin = middleware.requireLogin;
var users = require('./app/controllers/users');

app.use('/static', express.static(__dirname + '/static'));

app.use(middleware.injectUser);

app.get('/', users.index);

app.get('/profile', requireLogin, users.profile);

app.get('/events', requireLogin, events.index);

app.get('/add', requireLogin, events.new);

app.post('/add', requireLogin, events.create);

app.get('/register', users.register);

app.post('/register', users.create);

app.get('/login', users.login);

app.post('/login',
    passport.authenticate('local', {
        successRedirect: '/profile',
        failureRedirect: '/login',
        failureFlash: true })
);

app.get('/logout', users.logout);

app.listen(8080, function() {
    console.log('Running on http://localhost:8080');
});
