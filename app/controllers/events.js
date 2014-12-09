var async = require('async');
var format = require('string-format');
var moment = require('moment');
    require('twix');
var mysql = require('mysql');

var database = require('../../config/database');
var forms = require('../models/forms');
var transporter = require('../../config/email').transporter;
var util = require('../util');

exports.index = function(req, res) {
    var date = null;
    var keywords = "";
    var keywordArr = [];
    if (req.query.date && req.query.date != "") date = req.query.date;
    //remove punctuation and make array of words (separated by blank spaces)
    if (req.query.keywords && req.query.keywords != "") {
        keywords = req.query.keywords;
        var punctuationless = keywords.replace(/[\.,-\/#!$%\^&\*;:{}=\-_`~()@\+\?><\[\]\+]/g, "");
        keywords = punctuationless.replace(/\s{2,}/g,"");
        keywordArr = keywords.split(" ");
    }

    var dateQuery = date != null ? ' AND cast(startTime as date) = ?' : "";

    var keywordQuery = '';
    for (var i = 0; i < keywordArr.length; i++) {
        if (i==0) { keywordQuery = keywordQuery.concat(' AND ('); }
        var keyword = mysql.escape('%' + keywordArr[i] + '%');
        keywordQuery = keywordQuery.concat('description LIKE ' + keyword);
        keywordQuery = keywordQuery.concat(' OR title LIKE ' + keyword);
        if (i != keywordArr.length-1) { keywordQuery = keywordQuery.concat(' OR ')}
        else { keywordQuery = keywordQuery.concat(')')}
    }

    // The filter is different depending on whether the user is a coordinator
    // or a volunteer. A coordinator will only see events that they created. A
    // volunteer will only see events that match with them.
    var filteringQuery = '';
    if (req.query.which === 'user' && req.user.role === 'volunteer') {
        filteringQuery =
            'AND event.eventID IN( ' +
                'SELECT e.eventID ' +
                'FROM event AS e ' +
                'WHERE( ' +
                    'SELECT COUNT(*) ' +
                    'FROM request AS r, indicate AS i ' +
                    'WHERE r.eventID = e.eventID ' +
                        ' AND i.userID = ' + mysql.escape(req.user.userID) +
                        ' AND r.skillID = i.skillID) > 1 ' +
                    'AND EXISTS( ' +
                        'SELECT * ' +
                        'FROM specifies_time_available AS sta, time_slot AS ts ' +
                        'WHERE ts.eventID = e.eventID ' +
                            ' AND sta.userID = ' + mysql.escape(req.user.userID) +
                            ' AND TIME(ts.startTime) = sta.startTime' +
                            ' AND DAYOFWEEK(ts.startTime) = sta.dayOfWeek))';
    } else if (req.query.which === 'user' && req.user.role === 'coordinator') {
        filteringQuery =
            'AND EXISTS( ' +
                 'SELECT * ' +
                 'FROM organize ' +
                 'WHERE organize.userID = ' + mysql.escape(req.user.userID) +
                    ' AND organize.eventID = event.eventID' +
                 ')';
    }

    var eventsQuery = 'SELECT * FROM event WHERE true ' + dateQuery + keywordQuery + filteringQuery;
    console.log(eventsQuery);

    // Get the page we are on, 0-indexed
    var currentPage = (req.param('page') > 0 ? req.param('page') : 1) - 1;

    // The number of events to show per page.
    var perPage = 30;

    async.waterfall([
        function getNumberOfPages(callback) {
            var params = date != null ? [date] : [];
            database.query(eventsQuery, params, function(err, rows) {
                if (rows) {
                    var numEvents = rows.length;
                    var numPages = Math.ceil(numEvents / perPage);
                    callback(err, numPages);
                } else {
                    callback(err, 0);
                }
            });
        },
        function getEventsForPage(numPages, callback) {
            var params = [perPage, currentPage * perPage];
            if (date != null) { params.unshift(date); }
            var eventsForPageQuery = eventsQuery.concat(
            ' ORDER BY startTime DESC LIMIT ? OFFSET ?');
            database.query(eventsForPageQuery, params,
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
            req.flash('error', 'Invalid form data.');
            return res.redirect('/events/add');
        }
    });

    function createEvent(form) {
        if (!req.body.startTime || !req.body.endTime) {
            req.flash('error', 'Please enter a start and end time.');
            return res.redirect('/events/add');
        }

        var start = moment(req.body.startTime, 'X').seconds(0);
        var end = moment(req.body.endTime, 'X').seconds(0);

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
                    function insertOrganizer(callback) {
                        var insertOrganizerQuery =
                            'INSERT INTO organize \
                             (userID, eventID) \
                             VALUES (?, ?)';
                        database.query(insertOrganizerQuery, [req.user.userID, eventID],
                            function(err, dbRes) {
                                callback(err);
                            })
                    },
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
                            return '(' + eventID + ', ?, ' + num_needed + ')';
                        }).join();
                        var timeSlotsQuery =
                            'INSERT INTO time_slot \
                             (eventID, startTime, num_needed) \
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
            },
            function findMatchingUsers(eventID, callback) {
                var matchingQuery =
                    'SELECT u.* \
                     FROM user AS u \
                     WHERE ( \
                        SELECT COUNT(*) \
                        FROM request AS r, indicate AS i \
                        WHERE r.eventID = ? \
                            AND u.userID = i.userID \
                            AND r.skillID = i.skillID) > 1 \
                        AND EXISTS( \
                            SELECT * \
                            FROM specifies_time_available AS sta, \
                                 time_slot AS ts \
                            WHERE ts.eventID = ? \
                                AND sta.userID = u.userID \
                                AND TIME(ts.startTime) = TIME(sta.startTime) \
                                AND DAYOFWEEK(ts.startTime) = sta.dayOfWeek)';
                var params = [eventID, eventID];
                database.query(matchingQuery, params, function(err, rows) {
                    callback(err, eventID, rows);
                });
            }
        ], function(err, eventID, matchingUsers) {
            if (err) { throw err; }
            req.flash('success', 'Event successfully added.');
            res.redirect('/events/add');

            // Email the matching users to notify them of the match.
            for(var i = 0; i < matchingUsers.length; i++) {
                var message =
                    ('Our system has found an event that you might be ' +
                     'interested in. Please visit <a href="{}">the event ' +
                     'page</a> to see your match.').format(
                        'http://' + req.headers.host + '/events/' + eventID);

                var mailOptions = {
                    from: 'nocontact@' + req.headers.host,
                    to: matchingUsers[i].email,
                    subject: 'You\'ve been matched!',
                    html: message
                };

                transporter.sendMail(mailOptions);
            }
        });
    }
};

exports.page = function(req, res) {
    async.parallel({
        event: function(callback) {
            var getEventQuery =
                'SELECT * \
                 FROM event, organize \
                 WHERE event.eventID = ? \
                     AND organize.eventID = event.eventID \
                 LIMIT 1';
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
                // registered for that event or not. We also want to return how
                // many people are assigned to a given timeslot.
                getTimeslotsQuery =
                    'SELECT *, EXISTS( \
                        SELECT * \
                        FROM registers_for AS rf \
                        WHERE rf.eventID = ts.eventID \
                            AND rf.userID = ? \
                            AND rf.startTime = ts.startTime) AS selected, ( \
                        SELECT COUNT(*) \
                        FROM registers_for AS rf \
                        WHERE rf.eventID = ts.eventID \
                            AND rf.startTime = ts.startTime \
                            AND rf.assigned) AS numAssigned \
                     FROM time_slot AS ts \
                     WHERE ts.eventID = ?';
                params = [req.user.userID, req.params.eventID];
            } else {
                // If the user is a coordinator, we want to return all the
                // timeslots for each user who has registered for at least one
                // timeslot. We also return a field 'assigned' that is
                //      1) null - when the user did not register for that slot
                //      2) false - when the coordinator has not assigned that
                //                 slot
                //      3) true - when the coordinator assigned that slot.
                getTimeslotsQuery =
                    'SELECT u.*, ts.*, (\
                        SELECT assigned \
                        FROM registers_for AS rf2 \
                        WHERE rf2.eventID = ts.eventID \
                            AND rf2.startTime = ts.startTime) AS assigned \
                     FROM time_slot AS ts, user AS u \
                     WHERE ts.eventID = ? \
                        AND EXISTS( \
                            SELECT * \
                            FROM registers_for AS rf1 \
                            WHERE rf1.userID = u.userID \
                                AND rf1.eventID = ts.eventID)';
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
    var users = Object.keys(timeslotsByUser);
    var eventID = req.params.eventID;

    function assignUser(user, callback) {
        var times = timeslotsByUser[user];

        async.waterfall([
            function userInfo(callback) {
                database.query('SELECT * FROM user WHERE userID = ?',
                               [user], function(err, rows) {
                    callback(err, rows[0]);
                });
            },
            function unassign(user, callback) {
                var unassignQuery =
                    'UPDATE registers_for \
                        SET assigned = 0 \
                     WHERE userID = ? AND eventID = ?';
                database.query(unassignQuery, [user.userID, eventID], function(err, dbRes) {
                    callback(err, user);
                });
            },
            function assignTimes(user, callback) {
                async.each(times, function(time, callback) {
                    time = new Date(time);
                    var updateQuery =
                    'UPDATE registers_for \
                        SET assigned = 1 \
                    WHERE userID = ? AND eventID = ? AND startTime = ?';
                    database.query(updateQuery, [user.userID, eventID, time], function(err, dbRes) {
                        if (dbRes.affectedRows > 0) {
                            var message =
                                ('You\'ve been assigned to work at an event! ' +
                                'Please go to <a href="{}">the event page' +
                                '</a> for more information.')
                                    .format('http://' + req.headers.host + '/events/' + eventID);

                            var mailOptions = {
                                from: 'nocontact@' + req.headers.host,
                                to: user.email,
                                subject: 'You\'ve been assigned!',
                                html: message
                            };
                            console.log(mailOptions);
                            transporter.sendMail(mailOptions);
                        }
                        callback(err);
                    });
                },
                function(err) {
                    callback(err);
                });
            }
        ], function(err) {
            callback(err);
        });
    }

    async.map(users, assignUser, function(err, results) {
        if (err) { throw err; }
        req.flash('success', 'Successfully updated volunteer registration.');
        res.redirect('/events/' + eventID);
    });
};
