var bcrypt = require('bcrypt-nodejs');

var database = require('../../config/database');
var forms = require('../models/forms');

function createUser(req, res) {
    // Hash the password and store the user into the database.
    bcrypt.genSalt(10, function(err, salt) {
        bcrypt.hash(req.body.password, salt, null, function(err, hash) {
            var query = ('INSERT INTO users (name, email, password, role) \
                          VALUES (?, ?, ?, ?)');
            database.query(query,
                           [req.body.name,
                            req.body.email,
                            hash,
                            req.body.role], function(err, dbRes) {
                if (err) {
                    if (err.code === 'ER_DUP_ENTRY') {
                        // The email address is already registered.
                        req.flash('error',
                                  'That email address is already registered.');
                        return res.redirect('/register');
                    } else {
                        throw err;
                    }
                }
                req.flash('success', 'Successfully registered!');
                res.redirect('/profile');
            });
        });
    });
}

exports.index = function(req, res) {
    res.render('index');
}

exports.profile = function(req, res) {
    res.render('profile');
}

exports.register = function(req, res) {
    res.render('register', {
        role: req.query.role,
        form: forms.renderForm(forms.registerForm)
    });
}

exports.create = function(req, res) {
    forms.registerForm.handle(req, {
        success: function(form) {
            createUser(req, res);
        },
        other: function(form) {
            res.render('register', {
                form: forms.renderForm(form)
            });
        }
    });
}

exports.login = function(req, res) {
    res.render('login');
}

exports.logout = function(req, res) {
    req.logout();
    req.flash('success', 'Logged out successfully.');
    res.redirect('/');
}