var async = require('async');
var moment = require('moment');

var database = require('../../config/database');
var forms = require('../models/forms');

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

var toMilitaryTime = function(hours, ampm) {
    if (ampm == "AM") {
        if (hours == 12) {
            hours = 0;
        }
    } else {
        if (hours != 12) {
            hours += 12;
        }
    }
    return hours;
};

//make sure start date is before end date
var validateStartBeforeEnd = function(start, end) {
    //make sure hours is in proper string format for moment (two digits)
    var formatHours = function(hours) {
        if (hours < 10) {
            return "0" + hours;
        } else {
            return hours;
        }
    }
    var start = start.date + " " + formatHours(toMilitaryTime(parseInt(start.hours), start.ampm)) + start.minutes;
    var end = end.date + " " + formatHours(toMilitaryTime(parseInt(end.hours), end.ampm)) + end.minutes;
    return moment(start).isBefore(end);
};

exports.create = function(req, res) {
    forms.addEventForm.handle(req, {
        success: createEvent,
        other: function(form) {
            res.redirect('/add');
        }
    });

    function createEvent(form) {
        var start = {
            date: req.body.date[0],
            hours: req.body.hours[0],
            minutes: req.body.minutes[0],
            ampm: req.body.ampm[0]
        };
        var end = {
            date: req.body.date[1],
            hours: req.body.hours[1],
            minutes: req.body.minutes[1],
            ampm: req.body.ampm[1]
        };

        if (!validateStartBeforeEnd(start, end)) {
            req.flash("error", 'Start time must be before end time.');
            return res.redirect('/add');
        }

        var startHours = toMilitaryTime(parseInt(req.body.hours[0]), req.body.ampm[0]);
        var startTime = req.body.date[0] + " " + startHours + req.body.minutes[0] + ":00";

        var endHours = toMilitaryTime(parseInt(req.body.hours[1]), req.body.ampm[1]);
        var endTime = req.body.date[1] + " " + endHours + req.body.minutes[1];

        async.waterfall([
            function createEvent(callback) {
                var createEventQuery =
                    'INSERT INTO event \
                    (title, description, location, startTime, endTime) \
                    VALUES (?, ?, ?, ?, ?)';
                var params = [req.body.title, req.body.description,
                              req.body.location, startTime, endTime];
                database.query(createEventQuery, params, function(err, dbRes) {
                    callback(err, dbRes.insertId);
                });
            },
            function createSkillRequests(eventID, callback) {
                var skillRequestValues = req.body.skills.map(function(skill) {
                    return '(' + eventID + ', ' + skill + ')';
                }).join();
                var createRequestQuery =
                    'INSERT INTO request \
                     (eventID, skillID) \
                     VALUES ' + skillRequestValues;
                database.query(createRequestQuery, function(err, dbRes) {
                    callback(err);
                });
            }
        ], function(err) {
            if (err) { throw err; }
            req.flash('success', 'Event successfully added.');
            res.redirect('/add');
        });
    }
};
