var moment = require('moment');

var database = require('../../config/database');
var forms = require('../models/forms');

exports.index = function(req, res) {
    // Get the page we are on, 0-indexed
    var currentPage = (req.param('page') > 0 ? req.param('page') : 1) - 1;

    // The number of events to show per page.
    var perPage = 30;

    database.query('SELECT COUNT(*) AS "numEvents" FROM event',
                   function(err, rows, fields) {
        var numPages = Math.ceil(rows[0].numEvents / perPage);
        database.query('SELECT * FROM event LIMIT ? OFFSET ?',
                       [perPage, currentPage * perPage],
                       function(err, rows, fields) {
            res.render('events', {
                currentPage: currentPage,
                numPages: numPages,
                events: rows,
                moment: moment
            });
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
    if (moment(start.date).isBefore(end.date)) {
        return true;
    } else if (moment(start.date).isSame(end.date)) {
        startHours = toMilitaryTime(start.hours, start.ampm);
        endHours = toMilitaryTime(end.hours, end.ampm);
        if (startHours > endHours) {
            return false;
        } else if (startHours == endHours) {
            if (start.minutes >= end.minutes) {
                return false;
            } else {
                return true;
            }
        } else {
            return true;
        }
    } else {
        return false;
    }
};

exports.create = function(req, res) {
    var reqobj = req;
    forms.addEventForm.handle(req, {
        success: function(form) {
            var start = {
                date: reqobj.body.date[0],
                hours: reqobj.body.hours[0],
                minutes: reqobj.body.minutes[0],
                ampm: reqobj.body.ampm[0]
            };
            var end = {
                date: reqobj.body.date[1],
                hours: reqobj.body.hours[1],
                minutes: reqobj.body.minutes[1],
                ampm: reqobj.body.ampm[1]
            }
            if (!validateStartBeforeEnd(start, end)) {
                req.flash("error", 'Start time must be before end time.');
                res.redirect('/add');
            } else {
                var startHours = toMilitaryTime(parseInt(req.body.hours[0]), req.body.ampm[0]);
                var startTime = req.body.date[0] + " " + startHours + req.body.minutes[0] + ":00";

                var endHours = toMilitaryTime(parseInt(req.body.hours[1]), req.body.ampm[1]);
                var endTime = req.body.date[1] + " " + endHours + req.body.minutes[1];

                var query = "INSERT INTO event \
                        (title, description, location, startTime, endTime) \
                        VALUES (?, ?, ?, ?, ?)";
                database.query(query,
                           [req.body.title,
                            req.body.description,
                            req.body.location,
                            startTime,
                            endTime], function(err, dbRes) {
                    if (err) {
                        throw err;
                    } else {
                        var event_id = dbRes.insertId;
                        var skills = reqobj.body.skills;
                        var query = "INSERT INTO request \
                        (eventID, skillID) \
                        VALUES (?, ?)";
                        for (var i = 0; i < skills.length; i++) {
                            database.query(query, [event_id, skills[i]], function(err, res) {
                                if (err) {
                                    throw err;
                                }
                            });
                        }
                        req.flash('success', 'Event successfully added.');
                        res.redirect('/add');
                    }
                });
            }
        },
        other: function(form) {
            res.redirect('/add');
        }
    });
};
