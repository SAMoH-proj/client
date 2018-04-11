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

                $('#available-tiles').append(`
                    <div class="thumb loader"
                         data-field-large-thumb="${lThumb}"
                         data-field-e="${entry.max_lon}"
                         data-field-w="${entry.min_lon}"
                         data-field-n="${entry.max_lat}"
                         data-field-s="${entry.min_lat}">
                      <img src="${sThumb}"></img>

                    <div class="thumb-meta">
                      <div title="Show/Hide image metadata"
                         class="thumb-meta-more">more</div>
                      <table class="table">
                        <tbody>
                          <tr>
                            <th>Acquisition Date</th>
                            <th>${entry.acquisitionDate}</th>
                          </tr>
                          <tr class="collapsible">
                            <th>Cloud Cover</th>
                            <th>${entry.cloudCover}</th>
                          </tr>
                          <tr class="collapsible">
                            <th>Entity ID</th>
                            <th>${entry.entityId}</th>
                          </tr>
                          <tr class="collapsible">
                            <th>Epoch</th>
                            <th>${entry.epoch}</th>
                          </tr>
                          <tr class="collapsible">
                            <th>Minimum Latitude</th>
                            <th>${entry.min_lat}</th>
                          </tr>
                          <tr class="collapsible">
                            <th>Minimum Longitude</th>
                            <th>${entry.min_lon}</th>
                          </tr>
                          <tr class="collapsible">
                            <th>Maximum Latitude</th>
                            <th>${entry.max_lat}</th>
                          </tr>
                          <tr class="collapsible">
                            <th>Maximum Longitude</th>
                            <th>${entry.max_lon}</th>
                          </tr>
                          <tr class="collapsible">
                            <th>Processing Level</th>
                            <th>${entry.processingLevel}</th>
                          </tr>
                          <tr class="collapsible">
                            <th>Product ID</th>
                            <th>${entry.productId}</th>
                          </tr>
                          <tr class="collapsible">
                            <th>Path</th>
                            <th>${entry.path}</th>
                          </tr>
                          <tr class="collapsible">
                            <th>Row</th>
                            <th>${entry.row}</th>
                          </tr>
                        </tbody>
                      </table>
                    </div>`
                );
            });
        });
    });

    $(document).on('click', '.thumb img', function() {
        var div = $(this).parent();
        map.displayOverlay(
            div.attr('data-field-large-thumb'),
            {
                west: div.attr('data-field-w'),
                south: div.attr('data-field-s'),
                east: div.attr('data-field-e'),
                north: div.attr('data-field-n')
            }
        );
    });

    $(document).on('click', '.thumb-meta-more', function(evt) {
        if ($(this).text() === 'more') {
            $(this).siblings().find('.collapsible').show();
            $(this).text('less');
        }
        else {
            $(this).siblings().find('.collapsible').hide();
            $(this).text('more');
        }
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
