var bcrypt = require('bcrypt-nodejs');
var database = require('../config/database');

var LocalStrategy = require('passport-local').Strategy;

module.exports = function(passport, config) {
    passport.serializeUser(function(user, done) {
        done(null, user.userID);
    });

    passport.deserializeUser(function(userID, done) {
        database.query('SELECT * FROM users WHERE userID = ?',
                         [userID], function(err, rows, fields) {
            if (err) { return done(err); }
            return done(null, rows[0]);
         });
    });

    passport.use(new LocalStrategy({
            usernameField: 'email',
            passwordField: 'password'
        },
        function(email, password, done) {
            // Attempt to find the email in the database.
            database.query('SELECT * FROM users WHERE email = ? LIMIT 1',
                             [email], function(err, rows, fields) {
                if (err) { return done(err); }
                if (rows.length === 0) {
                    return done(null, false, {
                        message: 'The email address given is not registered.'
                    });
                }

                var user = rows[0];

                // Check the password against the hashed one in the database.
                var storedHash = user.password.toString();
                bcrypt.compare(password, storedHash, function(err, match) {
                    if (err) { throw err; }
                    if (!match) {
                        return done(null, false, {
                            message: 'The password is incorrect.'
                        });
                    }
                    // The email and password match!
                    return done(null, user);
                });
            });
        }
    ));
};
