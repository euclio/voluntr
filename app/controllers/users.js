var async = require('async');
var bcrypt = require('bcrypt-nodejs');
var moment = require('moment');
var mysql = require('mysql');

var database = require('../../config/database');
var forms = require('../models/forms');
var util = require('../util');

function createUser(req, res) {
    // Hash the password and store the user into the database.
    async.waterfall([
        function generateSalt(callback) {
            bcrypt.genSalt(10, function(err, salt) {
                callback(err, salt);
            });
        },
        function generatePasswordHash(salt, callback) {
            bcrypt.hash(req.body.password, salt, null, function(err, hash) {
                callback(err, hash);
            });
        },
        function storeNewUser(hash, callback) {
            var query = ('INSERT INTO user (name, email, password, role) \
                          VALUES (?, ?, ?, ?)');
            var params = [req.body.name, req.body.email, hash, req.body.role];
            database.query(query, params, function(err, dbRes) {
                callback(err);
            });
        }
    ], function done(err) {
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
}

exports.index = function(req, res) {
    res.render('index');
};

exports.profile = function(req, res) {
    if (req.user.role === 'volunteer') {
        async.parallel({
            skills: getSkills,
            selectedTimes: function(callback) {
                var selectedTimesQuery =
                    'SELECT startTime, dayOfWeek \
                     FROM specifies_time_available \
                     WHERE specifies_time_available.userID = ?';
                database.query(selectedTimesQuery, [req.user.userID],
                               function(err, rows) {
                    callback(err, rows);
                });
            }
        }, function done(err, results) {
            if (err) { throw err; }
            res.render('volunteer_profile', {
                skills: results.skills,
                selectedTimes: JSON.stringify(results.selectedTimes)
            });
        });
    } else {
        async.parallel({
            reviews: function(callback) {
                var getReviewsQuery =
                    'SELECT review.* \
                     FROM review, receives_review \
                     WHERE review.reviewID = receives_review.reviewID \
                        AND receives_review.userID = ?';
                var params = [req.user.userID];
                database.query(getReviewsQuery, params, function(err, rows) {
                    callback(err, rows);
                });
            },
            averageRating: function(callback) {
                var getRatingQuery =
                    'SELECT AVG(review.rating) AS averageRating \
                     FROM review, receives_review \
                     WHERE review.reviewID = receives_review.reviewID \
                        AND receives_review.userID = ?';
                var params = [req.user.userID];
                database.query(getRatingQuery, params, function(err, rows) {
                    callback(err, rows[0].averageRating);
                });
            }
        }, function done(err, results) {
            if (err) { throw err; }
            res.render('coordinator_profile', results);
        });
    }

    function getSkills(callback) {
        async.parallel({
            selectedSkills: function(callback) {
                var selectedSkillsQuery =
                    'SELECT * \
                     FROM skill, indicate \
                     WHERE skill.skillID = indicate.skillID \
                        AND indicate.userID = ?';
                database.query(selectedSkillsQuery, [req.user.userID],
                               function(err, rows) {
                    var selectedSkills = rows.map(function(skill) {
                        return {
                            skillID: skill.skillID,
                            skillName: skill.skill_name,
                            selected: true
                        };
                    });
                    callback(err, selectedSkills);
                });
            },
            unselectedSkills: function(callback) {
                var unselectedSkillsQuery =
                    'SELECT * \
                     FROM skill \
                     WHERE skill.skillID NOT IN ( \
                        SELECT s2.skillID \
                        FROM skill AS s2, indicate AS i2 \
                        WHERE s2.skillID = i2.skillID \
                            AND i2.userID = ?)';
                database.query(unselectedSkillsQuery, [req.user.userID],
                               function(err, rows) {
                    var unselectedSkills = rows.map(function(skill) {
                        return {
                            skillID: skill.skillID,
                            skillName: skill.skill_name,
                            selected: false
                        };
                    });
                    callback(err, unselectedSkills);
                });
            }
        }, function(err, results) {
            var skills =
                results.selectedSkills.concat(results.unselectedSkills);
            callback(err, skills);
        });
    }
};

exports.updateProfile = function(req, res) {
    var skills = util.parseMultiArray(req.body.skills);
    var availability = util.parseMultiArray(req.body.times);

    // Remove any skills and specified times that are already indicated in the
    // database.
    async.parallel([
        updateSkills, updateAvailability
    ], function(err) {
        if (err) { throw err; }
        res.redirect('/profile');
    });

    function updateSkills(callback) {
        async.series([
            function deleteSkills(callback) {
                var deleteSkillsQuery =
                    'DELETE \
                     FROM indicate \
                     WHERE userID = ?';
                database.query(deleteSkillsQuery, [req.user.userID],
                               function(err, dbRes) {
                    callback(err);
                });
            },
            function insertNewSkills(callback) {
                // If there are no skills to update, we're done.
                if (skills.length === 0) { return callback(null); }

                // Create a list of comma-separated tuples to insert into the
                // database.
                var indicateValues = skills.map(function(val) {
                    return '(' + req.user.userID + ', ' +
                                 mysql.escape(val) + ')';
                }).join();
                var newSkillsQuery =
                    'INSERT INTO indicate VALUES ' + indicateValues;
                database.query(newSkillsQuery, function(err, dbRes) {
                    callback(err);
                });
            }
        ], function(err) {
            callback(err);
        });
    }

    function updateAvailability(callback) {
        async.series([
            function deleteAvailability(callback) {
                deleteAvailabilityQuery =
                    'DELETE \
                     FROM specifies_time_available \
                     WHERE userID = ?';
                database.query(deleteAvailabilityQuery, [req.user.userID],
                               function(err, dbRes) {
                    callback(err);
                });
            },
            function insertNewAvailability(callback) {
                // If there are no times to insert, we're done.
                if (availability.length === 0) { return callback(null); }

                // Create a list of comma-separated tuples to insert into the
                // database.
                var availabilityValues = availability.map(function(time) {
                    return '(' +
                        req.user.userID + ', ' +
                        mysql.escape(moment(time).format('HH:mm:ss')) + ', ' +
                        mysql.escape(moment(time).format('dddd')) + ')';
                }).join();
                var newAvailabilityQuery =
                    'INSERT INTO specifies_time_available VALUES ' +
                        availabilityValues;
                database.query(newAvailabilityQuery, function(err, dbRes) {
                    callback(err);
                });
            }
        ], function(err) {
            callback(err);
        });
    }
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
