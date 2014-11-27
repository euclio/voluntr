var events = require('../app/controllers/events');
var users = require('../app/controllers/users');
var middleware = require('./middleware');

var requireLogin = middleware.requireLogin;
var coordinatorOnly = middleware.coordinatorOnly;

module.exports = function(app, passport) {
    app.use(middleware.injectUser);

    app.get('/', users.index);

    app.get('/profile', requireLogin, users.profile);

    app.post('/profile', requireLogin, users.updateProfile);

    app.get('/events', requireLogin, events.index);

    app.get('/events/add', requireLogin, coordinatorOnly, events.new);

    app.post('/events/add', requireLogin, coordinatorOnly, events.create);

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

    app.use(function(req, res) {
        res.status(404).send('404: Page not Found');
    });

    app.use(function(error, req, res, next) {
        if (error.status !== 403) {
            return next();
        }
        res.status(403).send('403: Forbidden');
    });

    app.use(function(error, req, res, next) {
        res.status(500).send('500: Internal Server Error');
    });
};
