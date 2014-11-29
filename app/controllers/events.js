var async = require('async');
var moment = require('moment');

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
                        var DEFAULT_NUM_NEEDED = 5;
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
                                   DEFAULT_NUM_NEEDED + ', ' + 0 + ')';
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
                    //if inserts are successful, results should contain event skills and time slots
                    //CHECK USERS FOR MATCHES HERE
                    callback(err);
                });
            }
        ], function(err) {
            if (err) { throw err; }
            req.flash('success', 'Event successfully added.');
            res.redirect('/events/add');
        });
    }
};
