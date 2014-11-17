var express = require('express');
var passport = require('passport');

var app = express();

require('./config/passport')(passport);
require('./config/express')(app, passport);
require('./config/routes')(app, passport);

app.listen(8080, function() {
    console.log('Running on http://localhost:8080');
});
