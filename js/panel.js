'use strict';

define(function(require) {
    var config = require('config');
    var map = require('map');

    // current point for fetching tiles
    var currentPoint;

    // current list of tiles
    var tiles;

    // index of last tile displayed
    var lastIndex = 0;

    /**
     * Display a single satellite thumbnail tile and metadata for selected point.
     * @param entry The tile metadata object.
     * @param satName Name of the satellite.
     */
    var displayTile = function(entry, satName) {
        var url = entry.download_url;
        var imagePath = url.substr(0, url.lastIndexOf('/'));
        var productId = url.split('/')[8];
        var sThumb;
        var lThumb;

        if (satName === 'landsat') {
            sThumb = imagePath + '/' + productId + '_thumb_small.jpg';
            lThumb = imagePath + '/' + productId + '_thumb_large.jpg';
        }
        else {
            sThumb = url;
            lThumb = url;
        }

        $('#available-tiles').append(`
          <div class="thumb loader"
               data-field-id="${entry.entityId}"
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
    };

    /**
     * Display 10 thumbnail tiles and metadata for selected point.
     * @param satName Name of the satellite.
     * @return Number of tiles displayed that passed filter.
     */
    var displayTiles = function(satName) {
        var viewCount = 0;

        var startDate = new Date($('#filter-start').val());
        var endDate = new Date($('#filter-end').val());

        $('#available-tiles-more-btn').hide();

        for (var i = lastIndex; i < tiles.length; i++) {
            var entry = tiles[i];
            var acquisitionDate = new Date(entry.acquisitionDate);
            if (acquisitionDate >= startDate &&
                acquisitionDate <= endDate) {
                displayTile(entry, satName);
                ++viewCount;
            }
            if (viewCount === 10) {
                lastIndex = i + 1;
                if (lastIndex !== tiles.length) {
                    $('#available-tiles-more-btn').show();
                }

                break;
            }
        }

        return viewCount;
    };

    /**
     * Fetch satellite thumbnail tiles and metadata for selected point.
     * @param point User selected latlon.
     */
    var fetchTiles = function(point) {
        lastIndex = 0;
        $('#available-tiles').empty();

        if (point === undefined) {
            return;
        }

        var sat = $('#satellite-selector a.active').attr('data-field-name');
        $.getJSON(config.backend_url + '/' + sat, {
            lon: point.lon, lat: point.lat
        }).done(function(data) {
            tiles = data.msg;
            console.log(tiles);
            var viewCount = displayTiles(sat);
            if (viewCount === 0) {
                $('#available-tiles').text('No tiles available');
            }
        }).fail(function(err) {
            console.error(err);
            $('#alert-text').text('Currently unable to view tiles');
            $('#alert').show();
        });
    };

    // view more tiles
    $('#available-tiles-more-btn').on('click', function() {
        var sat = $('#satellite-selector a.active').attr('data-field-name');
        displayTiles(sat);
    });

    $('#navbar-side').addClass('reveal');
    $('#navbar-open-btn').on('click', function() {
        $('#navbar-side').addClass('reveal');
    });

    $('#navbar-close-btn').on('click', function() {
        $('#navbar-side').removeClass('reveal');
    });

    $('#function-selector a').click(function(e) {
        $('#draw-details').hide();
        $('#function-selector a').removeClass('active');

        var id = $(e.target).attr('id') || $(e.target).parent().attr('id');
        map.setSelectType(id.split('-')[1]);
        map.clearMap();

        $('#' + id).addClass('active');
        $('#function-selector button img').attr(
            'src', $('#' + id + ' img').attr('src')
        );
        var html = '<img src="' + $('#' + id + ' img').attr('src') + '" height="20px" width="20px"/>' + $('#' + id).text().trim();
        $('#function-selector button').html(html);

        // hide filters when find tiles not selected
        if (id === 'fetch-tiles') {
            $('#satellite-selector-filter').show();
        }
        else {
            $('#satellite-selector-filter').hide();
        }
    });

    $('#satellite-selector a').click(function(e) {
        $('#available-tiles-more-btn').hide();
        $('#satellite-selector a').removeClass('active');
        $(e.target).addClass('active');
        fetchTiles(currentPoint);
    });

    $(document).on(map.EVT_DELETE_LINE, function() {
        $('#draw-details').hide();
    });

    $(document).on(map.EVT_LINE_ADDED, function(e, line) {
        $('#draw-details').show();
        $('#create-image-btn').text('Create NDVI Transect');
    });

    $(document).on(map.EVT_RECT_ADDED, function(e) {
        $('#draw-details').show();
        var description = $('#function-selector a[class*="active"]').attr('data-field-description');
        $('#create-image-btn').text('Create ' + description);
    });

    $(document).on(map.EVT_MAP_CLICK, function(e, point) {
        currentPoint = point;
        fetchTiles(point);
    });

    $(document).on('click', '.thumb img', function() {
        var div = $(this).parent();
        if (div.hasClass('selected')) {
            // delete overlay using entity id
            map.removeOverlay(div.attr('data-field-id'));
            div.removeClass('selected');
        }
        else {
            div.addClass('selected');
            map.displayOverlay(
                div.attr('data-field-id'),
                div.attr('data-field-large-thumb'),
                {
                    west: div.attr('data-field-w'),
                    south: div.attr('data-field-s'),
                    east: div.attr('data-field-e'),
                    north: div.attr('data-field-n')
                }
            );
        }
    });

    $(document).on('click', '.thumb-meta-more', function(e) {
        if ($(this).text() === 'more') {
            $(this).siblings().find('.collapsible').show();
            $(this).text('less');
        }
        else {
            $(this).siblings().find('.collapsible').hide();
            $(this).text('more');
        }
    });

    $('#draw-details-delete').on('click', function() {
        map.clearMap();
        $('#draw-details').hide();
    });

    $('#create-image-btn').on('click', function() {
        var selection = 'line';
        var type = 'ndvi_transect';
        var extents;

        $('#view-image').attr('src', '');

        var id = $('#function-selector a[class*="active"]').attr('id');
        if (id === 'ndvi-transect') {
            extents = map.getTransectExtents();
        }
        else if (id.endsWith('rectangle')) {
            selection = 'rectangle';
            type = $('#function-selector a[class*="active"]').attr('data-field-type');
            extents = map.getTimeSeriesExtents();
        }

        var url = config.backend_url + '/datacube?selection=' + selection +
            '&type=' + type +
            '&xmin=' + extents.xmin +
            '&xmax=' + extents.xmax +
            '&ymin=' + extents.ymin +
            '&ymax=' + extents.ymax;
        $('#view-image').attr('src', url);
        $('#view-image-popup').modal({});
    });

    // set default fetch tile date filter one year from today
    var today = new Date();
    var year = today.getFullYear();
    var mon = ('0' + (today.getMonth() + 1)).slice(-2);
    var day = ('0' + today.getDate()).slice(-2);
    $('#filter-start').val(year - 1 + '-' + mon + '-' + day);
    $('#filter-end').val(year + '-' + mon + '-' + day);
});
