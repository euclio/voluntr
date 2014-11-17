var moment = require('moment');

var database = require('../../config/database');
var forms = require('../models/forms');

exports.index = function(req, res) {
    database.query('SELECT * FROM event', function(err, rows, fields) {
        res.render('events', { events: rows, moment: moment });
    });
}

exports.new = function(req, res) {
    res.render('addevent', {
        form: forms.renderForm(forms.addEventForm)
    });
}

var DEFAULT_DATE = "2014-11-30";
exports.create = function(req, res) {
    forms.addEventForm.handle(req, {
        success: function(form) {
            var formatHours = function(hours, ampm) {
                var intHours = parseInt(hours)
                if (ampm == "PM") {
                    if (intHours != 12) {
                        intHours += 12
                    }
                } else {
                    if (intHours == 12) {
                        intHours -= 12
                    }
                }
                hours = intHours.toString()
                if (intHours < 10) {
                    hours = "0" + hours
                }
                return hours
            };
            var startHours = formatHours(req.body.hours[0], req.body.ampm[0])
            var startTime = DEFAULT_DATE + " " + startHours + req.body.minutes[0] + ":00"

            var endHours = formatHours(req.body.hours[1], req.body.ampm[1])
            var endTime = DEFAULT_DATE + " " + endHours + req.body.minutes[1]

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
                    req.flash('success', 'Event successfully added.')
                    res.redirect('/add');
                }
            });
        },
        other: function(form) {
            res.redirect('/add');
        }
    });
}
