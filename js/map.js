'use strict';

/* global Cesium */

define(function(require) {
    var EVT_DELETE_LINE = 'EVT_DELETE_LINE';
    var EVT_LINE_ADDED = 'EVT_LINE_ADDED';
    var EVT_RECT_ADDED = 'EVT_RECT_ADDED';
    var EVT_MAP_CLICK = 'EVT_MAP_CLICK';

    var mapSelectType = 'point';

    // map of layers added to map
    var layers = {};

    var west = 2.0;
    var south = 35.0;
    var east = 5.0;
    var north = 60.0;

    var rectangle = Cesium.Rectangle.fromDegrees(west, south, east, north);
    Cesium.Camera.DEFAULT_VIEW_FACTOR = 0;
    Cesium.Camera.DEFAULT_VIEW_RECTANGLE = rectangle;
    Cesium.BingMapsApi.defaultKey = null;

    /* eslint new-cap: ["error", { "newIsCapExceptions": ["Cesium.createOpenStreetMapImageryProvider"] }] */
    var viewer = new Cesium.Viewer('cesiumContainer', {
        requestRenderMode: true,
        animation: false,
        timeline: false,
        imageryProvider: new Cesium.createOpenStreetMapImageryProvider({
            url: 'https://a.tile.openstreetmap.org/',
            credit: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a>'
        }),
        baseLayerPicker: false,
        geocoder: false // bing api used in geocoder
    });
    viewer.screenSpaceEventHandler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_CLICK);
    viewer.screenSpaceEventHandler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);

    var scene = viewer.scene;
    scene.screenSpaceCameraController.enableTranslate = false;
    scene.screenSpaceCameraController.enableTilt = false;
    scene.screenSpaceCameraController.enableLook = false;
    scene.screenSpaceCameraController.enableCollisionDetection = false;

    var entities = viewer.entities;
    var handler = new Cesium.ScreenSpaceEventHandler(viewer.canvas);
    handler.setInputAction(
        function(click) {
            var cartesian = viewer.camera.pickEllipsoid(click.position, scene.globe.ellipsoid);
            var cartographic = Cesium.Cartographic.fromCartesian(cartesian);
            var lon = Cesium.Math.toDegrees(cartographic.longitude);
            var lat = Cesium.Math.toDegrees(cartographic.latitude);

            if (mapSelectType === 'point') {
                displayAvailableTiles(lon, lat);
                return;
            }
            else if (mapSelectType === 'line'){
                drawLine(cartesian, lon, lat);

                if (entities.getById('transect')) {
                    var pickedObject = scene.pick(click.position);
                    if (pickedObject) {
                        highlightLine();
                    }
                    else {
                        unHighlightLine();
                    }

                    return;
                }

                viewer.scene.requestRender();
            }

        }, Cesium.ScreenSpaceEventType.LEFT_CLICK
    );

    /*****************  rectangle   ****************/
    var screenSpaceEventHandler = new Cesium.ScreenSpaceEventHandler(
        viewer.scene.canvas);
    var mouseDown = false;
    var selector;
    var firstPointSet = false;
    var rectangleSelector = new Cesium.Rectangle();
    var firstPoint = new Cesium.Cartographic();
    var camera = viewer.camera;
    var cartesian = new Cesium.Cartesian3();
    var tempCartographic = new Cesium.Cartographic();
    screenSpaceEventHandler.setInputAction(function drawSelector(movement) {
        if (!mouseDown || mapSelectType !== 'rect') {
            return;
        }

        cartesian = camera.pickEllipsoid(movement.endPosition, viewer.scene.globe.ellipsoid, cartesian);

        if (cartesian) {
            tempCartographic = Cesium.Cartographic.fromCartesian(
                cartesian, Cesium.Ellipsoid.WGS84, tempCartographic);

            if (!firstPointSet) {
                Cesium.Cartographic.clone(tempCartographic, firstPoint);
                firstPointSet = true;
            }
            else {
                rectangleSelector.east =
                    Math.max(tempCartographic.longitude, firstPoint.longitude);
                rectangleSelector.west =
                    Math.min(tempCartographic.longitude, firstPoint.longitude);
                rectangleSelector.north =
                    Math.max(tempCartographic.latitude, firstPoint.latitude);
                rectangleSelector.south = Math.min(
                    tempCartographic.latitude, firstPoint.latitude);
                selector.show = true;

                $.event.trigger({type: EVT_RECT_ADDED});

                viewer.scene.requestRender();
            }
        }
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE, Cesium.KeyboardEventModifier.SHIFT);

    var getSelectorLocation = new Cesium.CallbackProperty(
        function getSelectorLocation(time, result) {
            return Cesium.Rectangle.clone(rectangleSelector, result);
        },
        false
    );

    screenSpaceEventHandler.setInputAction(
        function startClickShift(){
            mouseDown = true;
            selector.rectangle.coordinates = getSelectorLocation;
        },
        Cesium.ScreenSpaceEventType.LEFT_DOWN, Cesium.KeyboardEventModifier.SHIFT
    );

    screenSpaceEventHandler.setInputAction(
        function endClickShift() {
            mouseDown = false;
            firstPointSet = false;
            selector.rectangle.coordinates = rectangleSelector;
        },
        Cesium.ScreenSpaceEventType.LEFT_UP, Cesium.KeyboardEventModifier.SHIFT
    );

    selector = viewer.entities.add({
        id: 'rectangle',
        selectable: false,
        show: false,
        rectangle: {
            coordinates: getSelectorLocation,
            material: Cesium.Color.WHITE.withAlpha(0.9)
        }
    });

    $(document).on('keydown', function(e) {
        var code = e.keyCode || e.which;
        if (code === 46 && isLineHighlighted()) {
            clearLine();
            $.event.trigger({type: EVT_DELETE_LINE});
        }
    });

    var clearMap = function(text) {
        entities.remove(entities.getById('transect'));
        entities.remove(entities.getById('start-line'));
        entities.remove(entities.getById('end-line'));
        selector.show = false;
        viewer.scene.requestRender();
    };

    var displayAvailableTiles = function(lon, lat) {
        $.each(layers, function(i, layer){
            scene.imageryLayers.remove(layer);
        });
        $.event.trigger(
            {
                type: EVT_MAP_CLICK
            },
            {
                lon: lon,
                lat: lat
            }
        );
    };

    var displayOverlay = function(id, url, extents) {
        var provider = new Cesium.SingleTileImageryProvider({
            url: url,
            rectangle: Cesium.Rectangle.fromDegrees(
                extents.west,
                extents.south,
                extents.east,
                extents.north
            )
        })
        layers[id] = scene.imageryLayers.addImageryProvider(provider);
    };

    var drawLine = function(cartesian, lon, lat){
        if(!entities.getById('transect')){
            if(!entities.getById('start-line')){
                // no points founds found create starting position
                entities.add({
                    id: 'start-line',
                    position: cartesian,
                    point: {
                        color: Cesium.Color.WHITE,
                        pixelSize: 5
                    }
                });
            }
            else{
                // create end position
                entities.add({
                    id: 'end-line',
                    position: cartesian,
                    point: {
                        color: Cesium.Color.WHITE,
                        pixelSize: 5,
                        outlineWidth: 0
                    }
                });

                var positions = [
                    entities.getById('start-line').position.getValue(),
                    cartesian
                ];

                // create line
                entities.add({
                    id: 'transect',
                    polyline: {
                        positions: positions,
                        width: 5,
                        material: Cesium.Color.WHITE,
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
        }
    };

    var removeOverlay = function(id) {
        scene.imageryLayers.remove(layers[id]);
        delete layers[id]
    };

    var highlightLine = function() {
        var start = entities.getById('start-line');
        start.point.outlineColor = Cesium.Color.RED;
        start.point.outlineWidth = 2;
        var end = entities.getById('end-line');
        end.point.outlineColor = Cesium.Color.RED;
        end.point.outlineWidth = 2;
        viewer.scene.requestRender();
    };

    var isLineHighlighted = function() {
        var start = entities.getById('start-line');
        if(start && start.point.outlineWidth > 0){
            return true;
        }
        else{
            return false;
        }
    };

    var unHighlightLine = function() {
        entities.getById('start-line').point.outlineWidth = 0;
        entities.getById('end-line').point.outlineWidth = 0;
        viewer.scene.requestRender();
    };

    return {
        EVT_DELETE_LINE: EVT_DELETE_LINE,
        EVT_MAP_CLICK: EVT_MAP_CLICK,
        EVT_LINE_ADDED: EVT_LINE_ADDED,
        EVT_RECT_ADDED: EVT_RECT_ADDED,

        clearMap: clearMap,
        displayOverlay: displayOverlay,
        getTransectExtents(){
            var extents = entities.getById('transect').polyline.positions.getValue();
            var start = Cesium.Cartographic.fromCartesian(extents[0]);
            var end = Cesium.Cartographic.fromCartesian(extents[1]);
            return{
                xmin: Cesium.Math.toDegrees(start.longitude),
                ymin: Cesium.Math.toDegrees(start.latitude),
                xmax: Cesium.Math.toDegrees(end.longitude),
                ymax: Cesium.Math.toDegrees(end.latitude),
            }
        },
        getTimeSeriesExtents(){
            var rect = entities.getById('rectangle').rectangle.coordinates.getValue();
            return{
                xmin: Cesium.Math.toDegrees(rect.west),
                xmax: Cesium.Math.toDegrees(rect.east),
                ymin: Cesium.Math.toDegrees(rect.south),
                ymax: Cesium.Math.toDegrees(rect.north)
            }
        },
        removeOverlay: removeOverlay,
        setSelectType: function(type) {
            mapSelectType = type;
        }
    };
});
