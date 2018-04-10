'use strict';

define(function(require) {
    var config = require('config');
    var map = require('map');

    var displayPointDetails = function(text) {
        $('#draw-line-details-text').text(text);
        $('#draw-line-details').show();
    };

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

    $(document).on(map.EVT_DELETE_LINE, function() {
        $('#draw-line-details').hide();
    });

    $(document).on(map.EVT_LINE_ADDED, function(evt, line) {
        displayPointDetails(
            'LINESTRING (' + line.start_lon + ' ' + line.start_lat +
                ', ' + line.end_lon + ' ' + line.end_lat + ')'
        );
    });

    $(document).on(map.EVT_MAP_CLICK, function(evt, point) {
        $('#available-tiles').empty();
        $.getJSON(config.backend_url + '/landsat', {
            lon: point.lon, lat: point.lat
        }).done(function(data) {
            // TODO: just showing first 10
            $.each(data.msg.slice(0, 10), function(i, entry) {
                var index = entry.download_url;
                var imagePath = index.substr(0, index.lastIndexOf('/'));
                var productId = index.split('/')[8];
                var sThumb = imagePath + '/' + productId + '_thumb_small.jpg';
                var lThumb = imagePath + '/' + productId + '_thumb_large.jpg';
                $('#available-tiles').append(
                    '<div class="thumb loader" data-field-large-thumb="' + lThumb +
                        '" data-field-e="' + entry.max_lon +
                        '" data-field-w="' + entry.min_lon +
                        '" data-field-n="' + entry.max_lat +
                        '" data-field-s="' + entry.min_lat +
                        '"><img src="' + sThumb +
                        '"></img><div id="thumb-meta"><div id=thumb-meta-acquisitionDate>' +
                        entry.acquisitionDate + '</div></div></div>');
            });
        });
    });

    $(document).on('click', '.thumb', function() {
        map.displayOverlay(
            $(this).attr('data-field-large-thumb'),
            {
                west: $(this).attr('data-field-w'),
                south: $(this).attr('data-field-s'),
                east: $(this).attr('data-field-e'),
                north: $(this).attr('data-field-n')
            }
        );
    });

    $(document).on(map.EVT_POINT_ADDED, function(evt, point) {
        displayPointDetails(
            'POINT (' + point.lon.toFixed(2) + ' ' + point.lat.toFixed(2) + ')'
        );
    });

    $('#draw-line-details-delete').on('click', function() {
        map.clearLine();
        $('#draw-line-details').hide();
    });
});
