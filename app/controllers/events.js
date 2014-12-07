var async = require('async');
var moment = require('moment');
    require('twix');
var mysql = require('mysql');

var database = require('../../config/database');
var forms = require('../models/forms');
var util = require('../util');

exports.index = function(req, res) {
    // Get the page we are on, 0-indexed
    var currentPage = (req.param('page') > 0 ? req.param('page') : 1) - 1;

    // The number of events to show per page.
    var perPage = 30;

    async.waterfall([
        function getNumberOfPages(callback) {
            var numEventsQuery =
                'SELECT COUNT(*) AS "numEvents" \
                 FROM event';
            database.query(numEventsQuery, function(err, rows) {
                var numPages = Math.ceil(rows[0].numEvents / perPage);
                callback(err, numPages);
            });
        },
        function getEventsForPage(numPages, callback) {
            var eventsQuery =
                'SELECT * \
                 FROM event \
                 ORDER BY startTime DESC \
                 LIMIT ? OFFSET ?';
            database.query(eventsQuery, [perPage, currentPage * perPage],
                           function(err, rows) {
                callback(err, rows, numPages);
            });
        }
    ], function(err, events, numPages) {
        if (err) { throw err; }
        res.render('events', {
            currentPage: currentPage,
            numPages: numPages,
            events: events,
            moment: moment
        });
    });
};

exports.new = function(req, res) {
    database.query('SELECT * FROM skill', function(err, rows, fields) {
        if (err) { throw err; }
        res.render('addevent', {
            skills: rows,
            form: forms.renderForm(forms.addEventForm)
        });
    });
};

exports.create = function(req, res) {
    forms.addEventForm.handle(req, {
        success: createEvent,
        other: function(form) {
            res.redirect('/events/add');
        }
    });

    function createEvent(form) {
        if (!req.body.startTime || !req.body.endTime) {
            req.flash('error', 'Please enter a start and end time.');
            return res.redirect('/events/add');
        }

        var start = moment(req.body.startTime, 'X');
        var end = moment(req.body.endTime, 'X');

        if (!start.isBefore(end)) {
            req.flash("error", 'Start time must be before end time.');
            return res.redirect('/events/add');
        }

        var skills = util.parseMultiArray(req.body.skills);

        var num_needed = req.body.volunteers_desired;

        async.waterfall([
            function createEvent(callback) {
                var createEventQuery =
                    'INSERT INTO event \
                    (title, description, location, startTime, endTime) \
                    VALUES (?, ?, ?, ?, ?)';
                var params = [req.body.title, req.body.description,
                              req.body.location, start.toDate(), end.toDate()];
                database.query(createEventQuery, params, function(err, dbRes) {
                    callback(err, dbRes.insertId);
                });
            },
            function insertSkillsAndTimes(eventID, callback) {
                async.parallel([
                    function createSkillRequests(callback) {
                        // If we have no skills required for this event, then we're
                        // done.
                        if (skills.length === 0) { return callback(null); }

                        var skillRequestValues = skills.map(function(skill) {
                            return '(' + eventID + ', ' + skill + ')';
                        }).join();
                        var createRequestQuery =
                            'INSERT INTO request \
                             (eventID, skillID) \
                             VALUES ' + skillRequestValues;
                        database.query(createRequestQuery,
                                       function(err, dbRes) {
                            callback(err, skills);
                        });
                    },
                    function createTimeSlots(callback) {
                        var cur = start;
                        times = [];
                        while (cur.isBefore(end)) {
                            times.push(cur.clone().toDate());
                            cur.add(30, 'minutes');
                        }

                        // Create a query to insert time slots, using question
                        // mark for the time slots.
                        var eventTimeSlots = times.map(function(time) {
                            return '(' + eventID + ', ?,  ' +
                                   num_needed + ', ' + 0 + ')';
                        }).join();
                        var timeSlotsQuery =
                            'INSERT INTO time_slot \
                             (eventID, startTime, num_needed, num_confirmed) \
                             VALUES ' + eventTimeSlots;
                        database.query(timeSlotsQuery, times,
                                       function(err, dbRes) {
                            callback(err, times);
                        });
                    }
                ],
                function(err, results) {
                    if (err) { callback(err); }
                    callback(null, eventID);
                });
            }
            /*,
            function findMatchingUsers(eventID, callback) {
                //we have eventID
                var matchingQuery = '';
                database.query(matchingQuery,
                    function(err, dbRes) {
                        //get users info from dbRes
                        //put in callback
                        callback(err, );
                    });
            }
        */
        ], function(err) {
            if (err) { throw err; }
            req.flash('success', 'Event successfully added.');
            res.redirect('/events/add');
        });
    }
};

exports.page = function(req, res) {
    async.parallel({
        event: function(callback) {
            var getEventQuery =
                'SELECT * FROM event WHERE eventID = ? LIMIT 1';
            database.query(getEventQuery, req.params.eventID,
                           function(err, rows) {
                callback(err, rows[0]);
            });
        },
        timeslots: function(callback) {
            // We need to show different timeslots on the page depending on
            // whether the user is a coordinator or volunteer.
            var getTimeslotsQuery = null;
            var params = null;

            if (req.user.role === 'volunteer') {
                // If the user is a volunteer, we want to return all possible
                // timeslots for an event, and whether the current user is
                // registered for that event or not.
                getTimeslotsQuery =
                    'SELECT *, EXISTS( \
                        SELECT * \
                        FROM registers_for AS rf \
                        WHERE rf.eventID = ts.eventID \
                            AND rf.userID = ? \
                            AND rf.startTime = ts.startTime) AS selected \
                     FROM time_slot AS ts \
                     WHERE ts.eventID = ?';
                params = [req.user.userID, req.params.eventID];
            } else {
                // If the user is a coordinator, we want to return all the
                // timeslots and information for every user who has registered
                // for at least one timeslot. An additional field 'selected'
                // is added if the user has registered for that timeslot.
                getTimeslotsQuery =
                    'SELECT u.userID, name, ts.*, EXISTS( \
                        SELECT * \
                        FROM registers_for AS rf2 \
                        WHERE rf2.eventID = ts.eventID \
                            AND rf2.userID = rf1.userID \
                            AND rf2.startTime = ts.startTime) AS selected \
                     FROM time_slot AS ts, registers_for AS rf1, user AS u \
                     WHERE ts.eventID = ? \
                        AND ts.eventID = rf1.eventID \
                        AND u.userID = rf1.userID \
                     GROUP BY rf1.userID, ts.startTime';
                params = [req.params.eventID];
            }

            database.query(getTimeslotsQuery, params, function(err, rows) {
                callback(err, rows);
            });
        },
        numTimeslots: function(callback) {
            var numTimeslotsQuery =
                'SELECT COUNT(startTime) AS numTimeslots \
                 FROM time_slot \
                 WHERE eventID = ?';
            database.query(numTimeslotsQuery, [req.params.eventID],
                           function(err, rows) {
                callback(err, rows[0].numTimeslots);
            });
        }
    }, function(err, results) {
        if (err) { throw err; }
        res.render('event', {
            event: results.event,
            timeslots: results.timeslots,
            numTimeslots: results.numTimeslots,
            moment: moment
        });
    });
};

exports.register = function(req, res) {
    var registration = util.parseMultiArray(req.body.timeslots);
    var eventID = req.params.eventID;

    async.series([
        function deleteRegistration(callback) {
            var deleteRegistrationQuery =
                'DELETE FROM registers_for WHERE userID = ? AND eventID = ?';
            database.query(deleteRegistrationQuery, [req.user.userID, eventID],
                           function(err, dbRes) {
                callback(err);
            });
        },
        function insertNewRegistration(callback) {
            if (registration.length === 0) { return callback(null); }

            var registrationValues = registration.map(function(timeslot) {
                return '(' +
                    req.user.userID + ',' +
                    mysql.escape(eventID) + ',' +
                    mysql.escape(new Date(timeslot)) + ',' +
                    mysql.escape(false) + ')';
            }).join();

            var newRegistrationQuery =
                'INSERT INTO registers_for VALUES ' + registrationValues;
            database.query(newRegistrationQuery, function(err, dbRes) {
                callback(err);
            });
        }
    ], function(err) {
        if (err) { throw err; }
        req.flash('success',
                  'Successfully updated registration for this event.');
        res.redirect('/events/' + eventID);
    });
};

exports.assign = function(req, res) {
    var timeslotsByUser = JSON.parse(req.body.timeslots);
    users = Object.keys(timeslotsByUser);
    var eventID = req.params.eventID;

    var registerUser = function(user, cb) {
        var times = timeslotsByUser[user];
        async.each(times,
            function(time, callback) {
                time = new Date(time);
                var updateQuery =
                'UPDATE registers_for \
                    SET confirmed = 1 \
                WHERE userID = ? AND eventID = ? AND startTime = ?';
                database.query(updateQuery, [user, eventID, time], function(err, dbRes) {
                    callback(err);
                });
            },
            function(err) {
                cb(err);
            }
        );
    };

    async.map(users, registerUser, function(err, results) {
        if (err) { throw err };
        req.flash('success', 'Successfully updated volunteer registration.');
        res.redirect('/events/' + eventID);
    });
};
