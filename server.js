var bcrypt = require('bcrypt');
var express = require('express');
var bodyParser = require('body-parser');
var moment = require('moment');
var mysql = require('mysql');
var nconf = require('nconf');
var passport = require('passport')
  , LocalStrategy = require('passport-local').Strategy;
var session = require('express-session');

nconf.argv()
     .env();

var app = express();

app.use('/static', express.static(__dirname + '/static'));
app.use(bodyParser.urlencoded({ extended: false }));
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
    database: 'test',
});
connection.connect();

passport.serializeUser(function(user, done) {
    // TODO: Save user session to database?
    done(null, user);
});

passport.deserializeUser(function(user, done) {
    done(null, user);
})

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

app.set('view engine', 'ejs');

app.get('/', function(req, res) {
    res.render('pages/index');
});

app.get('/profile', function(req, res) {
	res.render('pages/profile');
});

app.get('/events', function(req, res) {
    connection.query('SELECT * FROM event', function(err, rows, fields) {
        res.render('pages/events', { events: rows, moment: moment });
    });
});

app.get('/add', function(req, res) {
    res.render('pages/addevent');
});

app.post('/events', function(req, res) {
    var query = "INSERT INTO event (title, description, location, startTime, endTime) VALUES (?, ?, ?, ?, ?)";
    connection.query(query, [req.body.title, req.body.description, req.body.location, req.body.startTime, req.body.endTime], function(err, res) {
        if (err) {
            console.log(err);
        } else {
            console.log("success");
        }
    });
});

app.get('/register', function(req, res) {
    res.render('pages/register', { role: req.query.role })
});

app.post('/register', function(req, res) {
    // Hash the password and store the user into the databse.
    // TODO: Check that the user doesn't already exist.
    bcrypt.hash(req.body.password, 10, function(err, hash) {
        var query = 'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)';
        connection.query(query, [req.body.name, req.body.email, hash, req.body.role], function(err, dbRes) {
            if (err) {
                console.log(err);
            }
            res.redirect('/profile');
        });
    });
});

app.get('/login', function(req, res) {
    res.render('pages/login');
});

app.post('/login',
    passport.authenticate('local', {
        successRedirect: '/profile',
        failureRedirect: '/login',
        failureFlash: false })
);

app.get('/logout', function(req, res) {
    req.logout();
    res.redirect('/');
})

app.listen(8080, function() {
    console.log('Running on http://localhost:8080');
});
