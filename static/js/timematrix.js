var DAYS_OF_WEEK = 7;
var TIME_FORMAT = 'h:mma';

/*
 * Create a table representing the list of times inside any element with the
 * class 'timematrix'.
 */
function initializeTable() {
    $timeMatrix = $('.timematrix');
    $timeMatrix.append('<table>');

    var sundayMidnight = moment({ hour: 0, minute: 0 }).isoWeekday(7);
    var time = sundayMidnight;
    var currentDay = time.day();

    var $head = $('<thead>');
    var daysOfWeek = [];
    for (var i = 0; i < DAYS_OF_WEEK; ++i) {
        daysOfWeek.push($('<td>').text(time.format('ddd')));
        time.add(1, 'days');
    }

    $head.append($('<td>'), daysOfWeek);
    $('table', $timeMatrix).append($head);

    while(time.day() === currentDay) {
        var $time = $('<td>').text(time.format(TIME_FORMAT));

        daysOfWeek = [];
        for (var i = 0; i < DAYS_OF_WEEK; ++i) {
            daysOfWeek.push($('<td>'));
        }

        var $row = $('<tr>').append($time, daysOfWeek);
        $('table', $timeMatrix).append($row);
        time.add(30, 'minutes');
    }
}

/*
 * Select any cells that match the array of times.
 */
function selectCells(selectedTimes) {
    var table = $('.timeMatrix table')[0];
    for (var i = 0; i < selectedTimes.length; i++) {
        var selectedTime = moment(selectedTimes[i].startTime + selectedTimes[i].dayOfWeek,
                                  'HH:mm:ssdddd');
        var row = selectedTime.hour() * 2 + selectedTime.minute() / 30;

        // Translate isoWeekday to 0-based array index
        var col = selectedTime.isoWeekday() - 1;
        col = col < 0 ? 7 : col;

        // Add the selected class to the table.
        $(table.rows[row].cells[col + 1]).addClass('selected');
    }
}

function addListeners() {
    /*
     * A jQuery event handler to be called when an element is moused over with
     * the left mouse button down.
     *
     * If the event is a click, we apply the class 'selected' to the element.
     * We also mark the cell as being already toggled, so if we mouse over it
     * again in the same drag it is not toggled again.
     */
    function selectCell(eventData) {
        if (eventData.which === 1 && !$(this).data('alreadyToggled')) {
            $(this).toggleClass('selected');
            $(this).data('alreadyToggled', true);
        }
    }

    // Apply the listeners to all table cells except the time labels. We must
    // trigger both the mouse over and mousedown events to ensure that the
    // both the first cell and subsequent cells are triggered when the mouse is
    // dragged over them.
    $('table tbody td:not(:first-child)', $timeMatrix)
        .mousedown(selectCell)
        .mouseover(selectCell);

    // When the mouse is let up anywhere on the page, we mark all the cells as
    // not already toggled.
    $('body').mouseup(function() {
        $('td', $(this)).data('alreadyToggled', false);
    });
}

/*
 * Returns an array representing the dates that are currently selected in
 * the time matrix. Only the times and days of the week are relevant.
 */
function getSelected() {
    var selectedTimes = [];
    $('.timematrix table tbody tr').each(function(index, element) {
        var time = $(element).eq(0).text();
        $(':gt(0)', $(element)).each(function(index, element) {
            if ($(element).hasClass('selected')) {
                // Translate 0-based indices to ISO day of week
                var isoWeekday = ($(element).index()) - 1;
                isoWeekday = isoWeekday === 0 ? 7 : isoWeekday;
                var timeString = [isoWeekday, time].join('-');
                var selectedTime = moment(
                    isoWeekday + '-' + time,
                    'E'        + '-' + TIME_FORMAT
                );
                selectedTimes.push(selectedTime.toJSON());
            }
        });
    });
    return selectedTimes;
}

$(document).ready(function() {
    initializeTable();
    selectCells(window.selectedTimes || []);
    addListeners();

    // Add the times that are currently selected to the form right before it is
    // submitted.
    $("form:has(.timematrix)").submit(function() {
        var times = getSelected();
        for (var i = 0; i < times.length; i++) {
            var time = $('<input>')
                .attr('type', 'hidden')
                .attr('name', 'times')
                .attr('value', times[i]);
            $(this).append(time);
        }
    });
});
