/*
 * Multiselect fields can return an empty object, a single element, or an
 * array. This function converts the values into an array.
 */
exports.parseMultiArray = function(multiField) {
    if (typeof multiField === 'undefined') {
        // No items selected.
        return [];
    } else if (Array.isArray(multiField)) {
        // Multiple items were selected.
        return multiField;
    } else {
        // One item was selected.
        return [multiField];
    }
};
