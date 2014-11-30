var forms = require('../models/forms');

module.exports.rateCoordinator = function(req, res) {
    res.render('review', { form: forms.renderForm(forms.reviewForm) });
};
