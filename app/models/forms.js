var forms = require('forms');
var fields = forms.fields,
    validators = forms.validators,
    widgets = forms.widgets;

module.exports.addEventForm = forms.create({
    title: fields.string({
        required: validators.required('Title is required.'),
        widget: widgets.text({ classes: ['input-with-feedback'] }),
        errorAfterField: true,
        validators: [validators.maxlength(50)]
    }),
    description: fields.string({
        required: validators.required('Description is required.'),
        widget: widgets.textarea({rows:4}),
        errorAfterField: true,
        validators: [validators.maxlength(300)]
    }),
    location: fields.string({
        required: validators.required('Location is required.'),
        widget: widgets.text({ classes: ['input-with-feedback'] }),
        errorAfterField: true,
        validators: [validators.maxlength(50)]
    })
});

module.exports.reviewForm = forms.create({
    review: fields.string({
        required: validators.required('The review body is required.'),
        widget: widgets.textarea({
            classes: ['input-with-feedback'],
            rows: 5
        }),
        errorAfterField: true,
        validators: [validators.maxlength(300)]
    })
});

module.exports.registerForm = forms.create({
    name: fields.string({
        required: validators.required('Name is required.'),
        widget: widgets.text({ classes: ['input-with-feedback']}),
        errorAfterField: true,
        validators: [validators.maxlength(50)]
    }),
    email: fields.email({
        required: validators.required('Email is required.'),
        widget: widgets.email({ classes: ['input-with-feedback']}),
        errorAfterField: true,
        validators: [validators.email(), validators.maxlength(255)]

    }),
    password: fields.password({
        required: validators.required('Password is required.'),
        widget: widgets.password({ classes: ['input-with-feedback']}),
        errorAfterField: true
    }),
    confirm: fields.password({
        required: validators.required('Must confirm password.'),
        widget: widgets.password({ classes: ['input-with-feedback']}),
        errorAfterField: true,
        validators: [validators.matchField('password')]
    }),
    role: fields.string({
        required: validators.required('Must select role.'),
        choices: {
            volunteer: 'Volunteer',
            coordinator: 'Coordinator'
        },
        widget: widgets.multipleRadio({ classes: ['input-with-feedback'] }),
        errorAfterField: true,
    })
});

module.exports.renderForm = function(form) {
    return form.toHTML(bootstrapField);
};

var bootstrapField = function (name, object) {
    object.widget.classes = object.widget.classes || [];

    var error = object.error ?
        '<div class="alert alert-error">' + object.error + '</div>' :
        '';

    var label = object.labelHTML(name);

    if (object.widget.type === 'multipleRadio') {
        object.widget.classes.push('radio-inline');
        widget = '<div class="radio">' + object.widget.toHTML(name, object) +
                 '</div>';
    } else {
        object.widget.classes.push('form-control');
        widget = object.widget.toHTML(name, object);
    }

    return '<div class="form-group">' + label + widget + error + '</div>';
};
