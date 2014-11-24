var bcrypt = require('bcrypt-nodejs');
var mysql = require('mysql');

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
    var values = [];

    // The multiselect may return an empty object, a single value, or an array.
    var skills = req.body.skills;
    if (typeof skills === 'undefined') {
        // No items were selected, so values should remain empty.
    } else if (Array.isArray(skills)) {
        // Multiple items were selected.
        values = values.concat(skills);
    } else {
        // One item was selected.
        values.push(skills);
    }

    // Remove any skills that are already indicated in the database.
    database.query('DELETE FROM indicate WHERE userID = ?',
                   [req.user.userID],
                   function(err, dbRes) {
        if (err) { throw err; }

        // Return early if there are no values to insert.
        if (values.length === 0) { return res.redirect('/profile'); }

        // Create a list of comma separated tuples to insert into the database
        var queryValues = values.map(function(val) {
            return '(' + req.user.userID + ', ' + mysql.escape(val) + ')';
        }).join();

        var query = 'INSERT INTO indicate VALUES ' + queryValues;
        database.query(query, function(err, dbRes) {
            if (err) { throw err; }
            res.redirect('/profile');
        });
   });
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
