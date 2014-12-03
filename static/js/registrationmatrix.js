function addListeners($table) {
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
    $('tbody td', $table)
        .mousedown(selectCell)
        .mouseover(selectCell);

    // When the mouse is let up anywhere on the page, we mark all the cells as
    // not already toggled.
    $('body').mouseup(function() {
        $('td', $(this)).data('alreadyToggled', false);
    });
}

$(document).ready(function() {
    var $table = $('table.registrationMatrix');
    console.log($table);
    addListeners($table);
});
