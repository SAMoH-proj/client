'use strict';

/* global require */

$(document).ready(function() {
    require(['map', 'panel'], function(map, panel) {
        $('#navbar-side').addClass('reveal');
        $('#navbar-open-btn').on('click', function() {
            $('#navbar-side').addClass('reveal');
        });

        $('#navbar-close-btn').on('click', function() {
            $('#navbar-side').removeClass('reveal');
        });

        $('#draw-line-chk').on('click', function() {
            map.setDrawLine($(this).is(':checked'));
        });

        $('#draw-line-details-delete').on('click', function() {
            map.clearLine();
            $('#draw-line-details').hide();
        });
    });
});
