var bcrypt = require('bcrypt-nodejs');
var express = require('express');
var moment = require('moment');
var passport = require('passport');

var database = require('./app/config/database');

var app = express();

require('./app/config/passport')(passport)
require('./app/config/express')(app, passport)

var forms = require('./app/models/forms.js')

app.use('/static', express.static(__dirname + '/static'));

// Add user object to all templates automatically.
app.use(function(req, res, next) {
    res.locals.user = req.user;
    next();
});

/*
 * Middleware to mark a route that should require login.
 */
function requireLogin(req, res, next) {
    if (req.user) {
        next();
    } else {
        res.redirect('/login');
    }
}

app.get('/', function(req, res) {
    res.render('index');
});

app.get('/profile',
        requireLogin,
        function(req, res) {
    res.render('profile');
});

app.get('/events',
        requireLogin,
        function(req, res) {
    database.query('SELECT * FROM event', function(err, rows, fields) {
        res.render('events', { events: rows, moment: moment });
    });
});

app.get('/add',
        requireLogin,
        function(req, res) {
    res.render('addevent', {
        form: forms.renderForm(forms.addEventForm)
    });
});

var DEFAULT_DATE = "2014-11-30";
app.post('/add', function(req, res) {
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

            var query = "INSERT INTO event (title, description, location, startTime, endTime) VALUES (?, ?, ?, ?, ?)"
            database.query(query, [req.body.title, req.body.description, req.body.location, startTime, endTime], function(err, dbRes) {
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
});

app.get('/register', function(req, res) {
    res.render('register', {
        role: req.query.role,
        form: forms.renderForm(forms.registerForm)
    });
});

app.post('/register', function(req, res) {
    forms.registerForm.handle(req, {
        success: function (form) {
            // Hash the password and store the user into the databse.
            bcrypt.genSalt(10, function(err, salt) {
                bcrypt.hash(req.body.password, salt, null, function(err, hash) {
                    var query = 'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)';
                    database.query(query,
                                     [req.body.name,
                                      req.body.email,
                                      hash,
                                      req.body.role], function(err, dbRes) {
                        if (err) {
                            // The email address is already registered.
                            if (err.code === 'ER_DUP_ENTRY') {
                                req.flash('error', 'That email address is already registered.');
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
        },
        other: function(form) {
            res.render('register', {
                form: forms.renderForm(form)
            });
        }
    });
});

app.get('/login', function(req, res) {
    res.render('login');
});

app.post('/login',
    passport.authenticate('local', {
        successRedirect: '/profile',
        failureRedirect: '/login',
        failureFlash: true })
);

app.get('/logout', function(req, res) {
    req.logout();
    res.redirect('/');
})

app.listen(8080, function() {
    console.log('Running on http://localhost:8080');
});
