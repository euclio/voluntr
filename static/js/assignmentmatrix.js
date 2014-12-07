
/*
 * Returns and object that maps userID to an array of timeslots.
 */
function getSelected() {
    var timeslotsByUser = {};

    // Select all checked checkboxes.
    $('.assignmentMatrix td:has(input:checked)').each(function(index, elt) {
        var user = $(this).data('user');
        var timeslot = $(this).data('timeslot');

        if (!timeslotsByUser[user]) { timeslotsByUser[user] = []; }
        timeslotsByUser[user].push(timeslot);
    });

    return timeslotsByUser;
}

$(document).ready(function() {
    $('form:has(table.assignmentMatrix)').submit(function() {
        var timeslotsByUser = getSelected();
        var timeslots = $('<input>')
                            .attr('type', 'hidden')
                            .attr('name', 'timeslots')
                            .attr('value', JSON.stringify(timeslotsByUser));
        $(this).append(timeslots);
    });
});