var mysql = require('mysql');

var nconf = require('./nconf');

var connection = mysql.createConnection(nconf.get('DB_OPTIONS'));

connection.connect(function(err) {
    if (err) {
        if (err.code === 'ECONNREFUSED') {
            console.log(
                'ERROR: Database connection refused. Is mysql running?');
        }
        throw err;
    }
});

module.exports = connection;
