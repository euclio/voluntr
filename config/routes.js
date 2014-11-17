var events = require('../app/controllers/events');
var users = require('../app/controllers/users');
var middleware = require('./middleware');

var requireLogin = middleware.requireLogin;

module.exports = function(app, passport) {
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
}
