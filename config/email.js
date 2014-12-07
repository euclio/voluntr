var nodemailer = require('nodemailer');
var smtpTransport = require('nodemailer-smtp-transport');

var nconf = require('./nconf');

exports.transporter = nodemailer.createTransport(
    smtpTransport(nconf.get("SMTP_OPTIONS")));
