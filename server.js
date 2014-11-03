var express = require('express');
var app = express();

var mysql = require('mysql');
var connection = mysql.createConnection({
    host: 'localhost',
    database: 'test',
});
connection.connect();

app.set('view engine', 'ejs');

app.get('/', function(req, res) {
    res.render('pages/index');
});

app.get('/profile', function(req, res) {
	res.render('pages/profile');
});

app.get('/events', function(req, res) {
    connection.query('SELECT * FROM event', function(err, rows, fields) {
        res.render('pages/events', { events : rows });
    });
});

app.use('/static', express.static(__dirname + '/static'));

app.listen(8080, function() {
    console.log('Running on http://localhost:8080');
});
