var express = require('express');
var app = express();

app.set('view engine', 'ejs');

app.get('/', function(req, res) {
    res.render('pages/index');
});

app.use('/static', express.static(__dirname + '/static'));

app.listen(8080, function() {
    console.log('Running on http://localhost:8080');
});
