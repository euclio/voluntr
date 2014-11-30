/*
 * Add user object to all templates automatically.
 */
exports.injectUser = function(req, res, next) {
    res.locals.user = req.user;
    next();
};

/*
 * Middleware to mark a route that should require login.
 */
exports.requireLogin = function(req, res, next) {
    return req.user ? next() : res.redirect('/login');
};

/*
 * Routes that should only be accessed by coordinators.
 */
exports.coordinatorOnly = function(req, res, next) {
    if (req.user.role === 'coordinator') {
        return next();
    } else {
        return res.status(403).send('Volunteers may not create events.');
    }
};

/*
 * Routes that should only be accessed by a volunteer.
 */
exports.volunteerOnly = function(req, res, next) {
    if (req.user.role === 'volunteer') {
        return next();
    } else {
        return res.status(403).send('Coordinators may not access this route.');
    }
};
