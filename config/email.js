var nodemailer = require('nodemailer');

var nconf = require('./nconf');

exports.transporter = nodemailer.createTransport({
    service: nconf.get('VOLUNTR_EMAIL_SERVICE'),
    auth: {
        user: nconf.get('VOLUNTR_EMAIL_ADDRESS'),
        pass: nconf.get('VOLUNTR_EMAIL_PASSWORD')
    }
});
