'use strict';

/* global Cesium */

define(function(require) {
    var config = require('config');

    var EVT_LINE_ADDED = 'EVT_LINE_ADDED';
    var EVT_POINT_ADDED = 'EVT_POINT_ADDED';
    var EVT_DELETE_LINE = 'EVT_DELETE_LINE';

    var drawLine = false;

    var west = 2.0;
    var south = 35.0;
    var east = 5.0;
    var north = 60.0;

    var rectangle = Cesium.Rectangle.fromDegrees(west, south, east, north);

    Cesium.Camera.DEFAULT_VIEW_FACTOR = 0;
    Cesium.Camera.DEFAULT_VIEW_RECTANGLE = rectangle;

    var viewer = new Cesium.Viewer('cesiumContainer', {
        requestRenderMode: true,
        imageryProvider : new Cesium.createOpenStreetMapImageryProvider({
            url : 'https://a.tile.openstreetmap.org/'
        }),
        baseLayerPicker: false
    });
    viewer.screenSpaceEventHandler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_CLICK);
    viewer.screenSpaceEventHandler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);

    var scene = viewer.scene;
    var entities = viewer.entities;
    var handler = new Cesium.ScreenSpaceEventHandler(viewer.canvas);
    handler.setInputAction(
        function(click) {
            var cartesian = viewer.camera.pickEllipsoid(click.position, scene.globe.ellipsoid);
            var cartographic = Cesium.Cartographic.fromCartesian(cartesian);
            var lon = Cesium.Math.toDegrees(cartographic.longitude);
            var lat = Cesium.Math.toDegrees(cartographic.latitude);

            if (!drawLine) {
                displayAvailableTiles(lon, lat);
                return;
            }

            if (entities.values.length >= 2) {
                var pickedObject = scene.pick(click.position);
                if(pickedObject){
                    highlightLine();
                }
                else{
                    unHighlightLine();
                }

                return;
            }

            entities.add({
                position: cartesian,
                point: {
                    color: Cesium.Color.WHITE,
                    pixelSize: 10,
                }
            });

            if (entities.values.length === 2) {
                var positions = [
                    entities.values[0].position.getValue(),
                    entities.values[1].position.getValue()
                ];

                entities.add({
                    polyline: {
                        positions: positions,
                        width: 10,
                        material : new Cesium.PolylineOutlineMaterialProperty({
                            color : Cesium.Color.WHITE,
                        }),
                        granularity: Cesium.Math.toRadians(0.1) // attempt to always make line visible
                    }
                });

                var start = scene.globe.ellipsoid.cartesianToCartographic(positions[0]);
                var slon = Cesium.Math.toDegrees(start.longitude).toFixed(2);
                var slat = Cesium.Math.toDegrees(start.latitude).toFixed(2);
                var end = scene.globe.ellipsoid.cartesianToCartographic(positions[1]);
                var elon = Cesium.Math.toDegrees(end.longitude).toFixed(2);
                var elat = Cesium.Math.toDegrees(end.latitude).toFixed(2);

                $.event.trigger(
                    {
                        type: EVT_LINE_ADDED
                    },
                    {
                        start_lon: slon,
                        start_lat: slat,
                        end_lon: elon,
                        end_lat: elat
                    }
                );
            }
            else {
                $.event.trigger(
                    {
                        type: EVT_POINT_ADDED},
                    {
                        lon: lon,
                        lat: lat
                    }
                );
            }

            viewer.scene.requestRender();
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK
    );

    $(document).on( "keydown", function(e){
        var code = e.keyCode || e.which;
        console.log(code);
        if(code === 46 && isLineHighlighted()){
            clearLine();
            $.event.trigger({type: EVT_DELETE_LINE});
        }
    });

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
        layer.alpha = 0.5;
    });

    var displayAvailableTiles = function(lon, lat) {
        $.getJSON(config.backend_url + "/landsat", {
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

    var clearLine = function(text) {
        entities.removeAll();
        viewer.scene.requestRender();
    };


    var highlightLine = function(){
        $.each(entities.values, function(i, entity){
            console.log(entity.polyline);
            if(entity.polyline){
                entity.polyline.material.outlineColor = Cesium.Color.RED;
                entity.polyline.material.outlineWidth = 2;
            }
            else{
                //console.log(entity.point);
                entity.point.outlineColor = Cesium.Color.RED;
                entity.point.outlineWidth = 2;
            }

            viewer.scene.requestRender();
        });
    };

    var isLineHighlighted = function(){
        if(entities.values.length > 0 &&
           entities.values[0].point.outlineWidth > 0){
            return true;
        }
        else{
            return false;
        }
    };

    var unHighlightLine = function(){
        $.each(entities.values, function(i, entity){
            console.log(entity.polyline);
            if(entity.polyline){
                entity.polyline.material.outlineWidth = 0;
            }
            else{
                console.log(entity.point);
                entity.point.outlineWidth = 0;
            }

            viewer.scene.requestRender();
        });
    };

    return {
        EVT_LINE_ADDED: EVT_LINE_ADDED,
        EVT_POINT_ADDED: EVT_POINT_ADDED,
        EVT_DELETE_LINE: EVT_DELETE_LINE,
        clearLine: clearLine,
        setDrawLine: function(draw) {
            drawLine = draw;
        }
    };
});
