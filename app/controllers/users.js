var bcrypt = require('bcrypt-nodejs');
var moment = require('moment');
var mysql = require('mysql');

var database = require('../../config/database');
var forms = require('../models/forms');
var util = require('../util');

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
};

exports.profile = function(req, res) {
    if (req.user.role === 'volunteer') {
        var selectedSkillsQuery = 'SELECT * \
                     FROM skill, indicate \
                     WHERE skill.skillID = indicate.skillID \
                        AND indicate.userID = ?';
        database.query(selectedSkillsQuery,
                       [req.user.userID],
                       function(err, rows) {
            if (err) { throw err; }
            var skills = [];
            for (var i = 0; i < rows.length; i++) {
                skills.push({
                    skillID: rows[i].skillID,
                    skillName: rows[i].skill_name,
                    selected: true
                });
            }

            var unselectedSkillsQuery =
                'SELECT * \
                 FROM skill \
                 WHERE skill.skillID NOT IN ( \
                    SELECT s2.skillID \
                    FROM skill AS s2, indicate AS i2 \
                    WHERE s2.skillID = i2.skillID \
                        AND i2.userID = ?)';
            database.query(unselectedSkillsQuery,
                           [req.user.userID],
                           function(err, rows) {
                if (err) { throw err; }
                for (var i = 0; i < rows.length; i++) {
                    skills.push({
                        skillID: rows[i].skillID,
                        skillName: rows[i].skill_name,
                        selected: false
                    });
                }
                res.render('volunteer_profile', { skills: skills });
            });
        });
    } else {
        res.render('profile');
    }
};

exports.updateProfile = function(req, res) {
    var skills = util.parseMultiArray(req.body.skills);
    var times = util.parseMultiArray(req.body.times);

    // Remove any skills and specified times that are already indicated in the
    // database.
    var query = 'DELETE FROM indicate \
                    WHERE userID = ?';
    database.query(query, [req.user.userID], function(err, dbRes) {
        if (err) { throw err; }

        if (skills.length > 0) {
            // Create a list of comma separated tuples to insert into the
            // database
            var indicateValues = skills.map(function(val) {
                return '(' + req.user.userID + ', ' + mysql.escape(val) + ')';
            }).join();
            var query = 'INSERT INTO indicate VALUES ' + indicateValues;
            database.query(query, function(err, dbRes) {
                if (err) { throw err; }
            });
        }
    });

    query = 'DELETE FROM specifies_time_available \
                WHERE userID = ?';
    database.query(query, [req.user.userID], function(err, dbRes) {
        if (err) { throw err; }

        if (times.length > 0) {
            var timeAvailableValues = times.map(function(time) {
                return '(' +
                    req.user.userID + ', ' +
                    mysql.escape(moment(time).format('HH:mm:ss')) + ', ' +
                    mysql.escape(moment(time).format('dddd')) + ')';
            }).join();

            var query = 'INSERT INTO specifies_time_available VALUES' +
                            timeAvailableValues;
            database.query(query, function(err, dbRes) {
                if (err) { throw err; }
            });
        }
   });
   return res.redirect('/profile');
};

exports.register = function(req, res) {
    res.render('register', {
        role: req.query.role,
        form: forms.renderForm(forms.registerForm)
    });
};

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
};

exports.login = function(req, res) {
    res.render('login');
};

exports.logout = function(req, res) {
    req.logout();
    req.flash('success', 'Logged out successfully.');
    res.redirect('/');
};
