/*
 * Add user object to all templates automatically.
 */
exports.injectUser = function(req, res, next) {
    res.locals.user = req.user;
    next();
}

/*
 * Middleware to mark a route that should require login.
 */
exports.requireLogin = function(req, res, next) {
    return req.user ? next() : res.redirect('/login');
}
