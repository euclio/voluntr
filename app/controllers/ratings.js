var async = require('async');

var forms = require('../models/forms');
var database = require('../../config/database');


module.exports.rateCoordinator = function(req, res) {
	var getUserInfo =
		'SELECT * FROM user WHERE userID = ?';
	database.query(getUserInfo, req.params.userID, function(err, rows) {
		if (err) { throw err; }
		var user = rows[0];
		if (user && user.role == "coordinator") {
			res.render('review', { form: forms.renderForm(forms.reviewForm),
				coordinator: user });
		} else {
			res.status(404).send('404: Page not Found');
		}
	})
};

module.exports.post = function(req, res) {
	var userID = req.params.userID;
	var score = parseInt(req.body.score);
	var review = req.body.review;
	forms.reviewForm.handle(req, {
		success: postReview,
		other: function(form) {
			res.redirect('/rate/' + userID);
		}
	});

	function postReview(form) {
		async.waterfall([
			function makeReview(callback) {
				var reviewQuery =
					'INSERT INTO review \
					 (reviewID, rating, comment) \
					 VALUES (?, ?, ?)';
				database.query(reviewQuery, [0, score, review], function(err, dbRes) {
					callback(err, dbRes.insertId);
				});
			},
			function setReviewForCoordinator(reviewID, callback) {
				var query =
					'INSERT INTO receives_review \
					 (userID, reviewID) \
					 VALUES (?, ?)';
				database.query(query, [userID, reviewID],
					function(err, dbRes) {
						callback(null);
					});
			}
		],
		function(err, results) {
			if (err) { throw err; }
			req.flash('success', 'Review successfully added.');
			res.redirect('/rate/' + userID);
		});
	}
};
