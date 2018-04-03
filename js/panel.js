'use strict';

define(function(require) {
    var map = require('map');

    var displayPointDetails = function(text) {
        $('#draw-line-details-text').text(text);
        $('#draw-line-details').show();
    };

    $(document).on(map.EVT_LINE_ADDED, function(evt, line) {
        displayPointDetails(
            'LINESTRING (' + line.start_lon + ' ' + line.start_lat +
                ', ' + line.end_lon + ' ' + line.end_lat + ')'
        );
    });

    $(document).on(map.EVT_POINT_ADDED, function(evt, point) {
        displayPointDetails(
            'POINT (' + point.lon.toFixed(2) + ' ' + point.lat.toFixed(2) + ')'
        );
    });
});
