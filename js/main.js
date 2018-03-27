'use strict';

/* global requirejs */

$(document).ready(function() {
    $('#navbar-side').addClass('reveal');
    $('#navbar-open-btn').on('click', function() {
        $('#navbar-side').addClass('reveal');
    });

    $('#navbar-close-btn').on('click', function() {
        $('#navbar-side').removeClass('reveal');
    });

    requirejs(['map']);
});
