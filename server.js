var express = require('express');
var app = express();

var bodyParser = require('body-parser');
app.use(bodyParser());

var mysql = require('mysql');
var connection = mysql.createConnection({
    host: 'localhost',
    database: 'test',
});
connection.connect();

var moment = require('moment');

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


app.use('/static', express.static(__dirname + '/static'));

app.listen(8080, function() {
    console.log('Running on http://localhost:8080');
});
