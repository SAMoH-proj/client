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
            if (!showPoint()) {
                return;
            }
            if (typeof points === 'undefined') {
                points = scene.primitives.add(new Cesium.PointPrimitiveCollection());
            }
            else if (points.length >= 2) {
                return;
            }

            // var pickedObject = scene.pick(click.position);

            var cartesian = scene.pickPosition(click.position);
            var cartographic = Cesium.Cartographic.fromCartesian(cartesian);
            var lon = Cesium.Math.toDegrees(cartographic.longitude);
            var lat = Cesium.Math.toDegrees(cartographic.latitude);

            /* eslint new-cap: ["error", { "newIsCapExceptions": ["Cesium.Cartesian3.fromDegrees"] }] */
            points.add({
                position: new Cesium.Cartesian3.fromDegrees(lon, lat),
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
                viewer.scene.requestRender();
            }

            viewer.scene.requestRender();
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK
    );

    var showPoint = function() {
        return $('#navbar-side').hasClass('reveal');
    };
});
