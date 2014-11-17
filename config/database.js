var mysql = require('mysql');

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

module.exports = connection;
