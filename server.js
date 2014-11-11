var bcrypt = require('bcrypt-nodejs');
var bodyParser = require('body-parser');
var express = require('express');
var flash = require('express-flash');
var moment = require('moment');
var mysql = require('mysql');
var nconf = require('nconf');
var passport = require('passport')
  , LocalStrategy = require('passport-local').Strategy;
var session = require('express-session');
var forms = require('forms');

nconf.argv()
     .env();

var app = express();

app.use('/static', express.static(__dirname + '/static'));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(flash());
app.use(session({
    saveUninitialized: true,
    secret: nconf.get('VOLUNTR_SECRET'),
    resave: false,
}));
app.use(passport.initialize());
app.use(passport.session());

// Add user object to all templates automatically.
app.use(function(req, res, next) {
    res.locals.user = req.user;
    next();
});

var connection = mysql.createConnection({
    host: 'localhost',
    database: 'test'
});

connection.connect(function(err) {
    if (err) {
        if (err.code === 'ECONNREFUSED') {
            console.log(
                'ERROR: Database connection refused. Is mysql running?');
        }
        throw err;
    }
});


var fields = forms.fields,
    validators = forms.validators,
    widgets = forms.widgets;

var add_event_form = forms.create({
    title: fields.string({
        required: validators.required('Title is required.'),
        widget: widgets.text({ classes: ['input-with-feedback'] }),
        errorAfterField: true,
        validators: [validators.maxlength(50)]
    }),
    description: fields.string({
        required: validators.required('Description is required.'),
        widget: widgets.textarea({rows:4}),
        errorAfterField: true,
        validators: [validators.maxlength(300)]
    }),
    location: fields.string({
        required: validators.required('Location is required.'),
        widget: widgets.text({ classes: ['input-with-feedback'] }),
        errorAfterField: true,
        validators: [validators.maxlength(50)]
    })
});

var register_form = forms.create({
    name: fields.string({
        required: validators.required('Name is required.'),
        widget: widgets.text({ classes: ['input-with-feedback']}),
        errorAfterField: true,
        validators: [validators.maxlength(50)]
    }),
    email: fields.email({
        required: validators.required('Email is required.'),
        widget: widgets.email({ classes: ['input-with-feedback']}),
        errorAfterField: true,
        validators: [validators.email(), validators.maxlength(255)]

    }),
    password: fields.password({
        required: validators.required('Password is required.'),
        widget: widgets.password({ classes: ['input-with-feedback']}),
        errorAfterField: true
    }),
    confirm: fields.password({
        required: validators.required('Must confirm password.'),
        widget: widgets.password({ classes: ['input-with-feedback']}),
        errorAfterField: true,
        validators: [validators.matchField('password')]
    })
});

var bootstrapField = function (name, object) {
    object.widget.classes = object.widget.classes || [];
    object.widget.classes.push('form-control');

    var label = object.labelHTML(name);
    var error = object.error ? '<div class="alert alert-error">' + object.error + '</div>' : '';
    var widget = object.widget.toHTML(name, object);
    return '<div class="form-group">' + label + widget + error + '</div>';
};

passport.serializeUser(function(user, done) {
    done(null, user.userID);
});

passport.deserializeUser(function(userID, done) {
    connection.query('SELECT * FROM users WHERE userID = ?',
                     [userID], function(err, rows, fields) {
        if (err) { return done(err) }
        return done(null, rows[0]);
     });
});

passport.use(new LocalStrategy({
        usernameField: 'email',
        passwordField: 'password'
    },
    function(email, password, done) {
        // Attempt to find the email in the database.
        connection.query('SELECT * FROM users WHERE email = ? LIMIT 1',
                         [email], function(err, rows, fields) {
            if (err) { return done(err); }
            if (!rows) {
                return done(null, false, {
                    message: 'The email address given is not registered.'
                });
            }

            var user = rows[0];

            // Check the password against the hashed one in the database.
            var storedHash = user.password.toString();
            bcrypt.compare(password, storedHash, function(err, match) {
                if (err) { throw err; }
                if (!match) {
                    return done(null, false, {
                        message: 'The password is incorrect.'
                    });
                }
                // The email and password match!
                return done(null, user);
            });
        });
    }
));

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

app.set('view engine', 'ejs');

app.get('/', function(req, res) {
    res.render('pages/index');
});

app.get('/profile',
        requireLogin,
        function(req, res) {
    res.render('pages/profile');
});

app.get('/events',
        requireLogin,
        function(req, res) {
    connection.query('SELECT * FROM event', function(err, rows, fields) {
        res.render('pages/events', { events: rows, moment: moment });
    });
});

app.get('/add',
        requireLogin,
        function(req, res) {
    res.render('pages/addevent', {
        form: add_event_form.toHTML(bootstrapField)
    });
});

//returns true on success, false otherwise
function handleAddEventFormData(req, res) {
    var ret = false;
    add_event_form.handle(req, {
        success: function (form) {
            ret = true;
            res.render('pages/addevent', {
                form: form.toHTML()
            });
        },
        error: function (form) {
            res.render('pages/addevent', {
                form: form.toHTML()
            });
        },
        empty: function (form) { }
    });
    return ret;
}

var DEFAULT_DATE = "2014-11-30"
app.post('/add', function(req, res) {
    var success = handleAddEventFormData(req, res);
    if (success) {
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
        }
        var startHours = formatHours(req.body.hours[0], req.body.ampm[0])
        var startTime = DEFAULT_DATE + " " + startHours + req.body.minutes[0] + ":00"

        var endHours = formatHours(req.body.hours[1], req.body.ampm[1])
        var endTime = DEFAULT_DATE + " " + endHours + req.body.minutes[1]

        var query = "INSERT INTO event (title, description, location, startTime, endTime) VALUES (?, ?, ?, ?, ?)"
        connection.query(query, [req.body.title, req.body.description, req.body.location, startTime, endTime], function(err, res) {
            if (err) {
                console.log(err)
            } else {
                console.log("success")
            }
        })
    }
});

app.get('/register', function(req, res) {
    res.render('pages/register', { role: req.query.role, form: register_form.toHTML(bootstrapField) })
});

app.post('/register', function(req, res) {
    var success, formHTML;
    register_form.handle(req, {
        success: function (form) { 
            success = true;
            formHTML = form.toHTML();
        },
        error: function (form) {
            success = false;
            formHTML = form.toHTML();
        },
        empty: function (form) {
            success = false;
            formHTML = form.toHTML();
        }
    });
    if (success) {
        if (req.body.role != undefined) {
            // Hash the password and store the user into the databse.
            bcrypt.genSalt(10, function(err, salt) {
                bcrypt.hash(req.body.password, salt, null, function(err, hash) {
                    var query = 'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)';
                    connection.query(query,
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
        } else {
            var radioError = "<div class='error_msg'><p>Must select volunteer or coordinator.</p></div>";
            res.render('pages/register', {form: formHTML, radioError: radioError});
        }
    } else {
        res.render('pages/register', {form: formHTML})
    }
});

app.get('/login', function(req, res) {
    res.render('pages/login');
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
