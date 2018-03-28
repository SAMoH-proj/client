'use strict';

/* global Cesium */

define(function(require) {
    var west = 2.0;
    var south = 35.0;
    var east = 5.0;
    var north = 60.0;

    var rectangle = Cesium.Rectangle.fromDegrees(west, south, east, north);

    Cesium.Camera.DEFAULT_VIEW_FACTOR = 0;
    Cesium.Camera.DEFAULT_VIEW_RECTANGLE = rectangle;

    var viewer = new Cesium.Viewer('cesiumContainer', {
        requestRenderMode: true,
        terrainProvider: Cesium.createWorldTerrain(),
        selectionIndicator: false,
        baseLayerPicker: false
    });

    viewer.scene.screenSpaceCameraController.enableTilt = false;
    viewer.scene.screenSpaceCameraController.enableLook = false;
    viewer.scene.globe.depthTestAgainstTerrain = true;
    viewer.screenSpaceEventHandler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_CLICK);
    viewer.screenSpaceEventHandler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);

    var points;
    var scene = viewer.scene;
    var handler = new Cesium.ScreenSpaceEventHandler(viewer.canvas);
    handler.setInputAction(
        function(click) {
            var cartesian = scene.pickPosition(click.position);
            var cartographic = Cesium.Cartographic.fromCartesian(cartesian);
            var lon = Cesium.Math.toDegrees(cartographic.longitude);
            var lat = Cesium.Math.toDegrees(cartographic.latitude);

            if (!showPoint()) {
                displayAvailableTiles(lon, lat);
                return;
            }
            if (typeof points === 'undefined') {
                points = scene.primitives.add(new Cesium.PointPrimitiveCollection());
            }
            else if (points.length >= 2) {
                var pickedObject = scene.pick(click.position);

                console.log(pickedObject);
                return;
            }

            // TODO: converting from cartesian to latlon and back is mad
            // but only way i could get this to work at the moment

            /* eslint new-cap: ["error", { "newIsCapExceptions": ["Cesium.Cartesian3.fromDegrees"] }] */
            points.add({
                position: new Cesium.Cartesian3.fromDegrees(lon, lat),
                // position: new Cesium.Cartesian3(cartesian.x, cartesian.y, cartesian.z),
                color: Cesium.Color.WHITE
                // outlineColor : Cesium.Color.RED,
                // outlineWidth : 2
            });

            if (points.length === 2) {
                var polylines = new Cesium.PolylineCollection();
                scene.primitives.add(polylines);
                polylines.add({
                    positions: [
                        points.get(0).position,
                        points.get(1).position
                    ],
                    color: Cesium.Color.WHITE
                });

                var start = scene.globe.ellipsoid.cartesianToCartographic(points.get(0).position);
                var slon = Cesium.Math.toDegrees(start.longitude).toFixed(2);
                var slat = Cesium.Math.toDegrees(start.latitude).toFixed(2);
                var end = scene.globe.ellipsoid.cartesianToCartographic(points.get(1).position);
                var elon = Cesium.Math.toDegrees(end.longitude).toFixed(2);
                var elat = Cesium.Math.toDegrees(end.latitude).toFixed(2);
                $('#draw-line-details-text').text('LINESTRING (' + slon + ' ' + slat + ',' + elon + ' ' + elat);

                viewer.scene.requestRender();
            }
            else {
                $('#draw-line-details-text').text('POINT (' + lon.toFixed(2) + ' ' + lat.toFixed(2) + ')');
            }

            viewer.scene.requestRender();
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK
    );

    $(document).on('click', '.thumb', function() {
        var layer = scene.imageryLayers.addImageryProvider(new Cesium.SingleTileImageryProvider({
            url: $(this).attr('data-field-large-thumb'),
            rectangle: Cesium.Rectangle.fromDegrees(
                $(this).attr('data-field-w'),
                $(this).attr('data-field-s'),
                $(this).attr('data-field-e'),
                $(this).attr('data-field-n')
            )
        }));
        //layer.alpha = 0.5;
    });

    var displayAvailableTiles = function(lon, lat) {
        var url = 'http://34.241.27.59:8081/landsat';
        console.log(url);
        $.getJSON(url, {
            lon: lon, lat: lat
        }).done(function(data) {
            $('#available-tiles').empty();

            // TODO: just showing first 10
            $.each(data.msg.slice(0, 10), function(i, entry) {
                var index = entry.download_url;
                var imagePath = index.substr(0, index.lastIndexOf('/'));
                var productId = index.split('/')[8];
                var sThumb = imagePath + '/' + productId + '_thumb_small.jpg';
                var lThumb = imagePath + '/' + productId + '_thumb_large.jpg';
                $('#available-tiles').append('<div class="thumb" data-field-large-thumb="' + lThumb +
                                             '" data-field-e="' + entry.max_lon +
                                             '" data-field-w="' + entry.min_lon +
                                             '" data-field-n="' + entry.max_lat +
                                             '" data-field-s="' + entry.min_lat +
                                             '"><img src="' + sThumb + '"></img></div>');
            });
        });
    };

    var showPoint = function() {
        return $('#navbar-side').hasClass('reveal') &&
            $('#draw-line-chk').is(':checked');
    };
});
