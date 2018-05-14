'use strict';

/* global Cesium */

define(function(require) {
    var EVT_DELETE_LINE = 'EVT_DELETE_LINE';
    var EVT_DELETE_RECT = 'EVT_DELETE_RECT';
    var EVT_LINE_ADDED = 'EVT_LINE_ADDED';
    var EVT_RECT_ADDED = 'EVT_RECT_ADDED';
    var EVT_MAP_CLICK = 'EVT_MAP_CLICK';

    var mapSelectType = 'tiles';

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

    /**
     * Clear map of entities.
     */
    var clearMap = function() {
        removeLine();
        removeRect();
    };

    /**
     * User has selected to display available tile for a given point.
     * @param lon Longitude of point.
     * @param lat Latitude of point.
     */
    var displayAvailableTiles = function(lon, lat) {
        // remove any tiles currently visible
        $.each(layers, function(i, layer) {
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

    /**
     * Draw image overlay of map.
     * @param id Unique identifier of layer.
     * @param url URL of image.
     * @param extents Bounds of image.
     */
    var displayOverlay = function(id, url, extents) {
        var provider = new Cesium.SingleTileImageryProvider({
            url: url,
            rectangle: Cesium.Rectangle.fromDegrees(
                extents.west,
                extents.south,
                extents.east,
                extents.north
            )
        });
        layers[id] = scene.imageryLayers.addImageryProvider(provider);
    };

    /**
     * Draw line on map for a given point.
     * @param cartesian Cesium position object.
     */
    var drawLine = function(cartesian) {
        var line = entities.getById('transect');
        if (!line) {
            // no line currently exists
            var points = getPointsInTransect();
            entities.add({
                id: 'line-' + (points.length + 1),
                position: cartesian,
                point: {
                    color: Cesium.Color.WHITE,
                    pixelSize: 5
                }
            });

            if (points.length === 1) {
                // create line if this is 2nd point
                var positions = [
                    entities.getById('line-1').position.getValue(),
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

                $.event.trigger({type: EVT_LINE_ADDED});
            }
        }
        else {
            // append next point to line
            var linePositions = line.polyline.positions.getValue();
            linePositions.push(cartesian);
            line.polyline.positions = linePositions;

            entities.add({
                id: 'line-' + linePositions.length,
                position: cartesian,
                point: {
                    color: Cesium.Color.WHITE,
                    pixelSize: 5,
                    outlineWidth: 0
                }
            });

            viewer.scene.requestRender();
        }
    };

    /**
     * @return Array of Points in current transect.
     */
    var getPointsInTransect = function() {
        var points = [];
        for (var i = 1; i < 100; i++) {
            var point = entities.getById('line-' + i);
            if (point) {
                points.push(point);
            }
            else {
                break;
            }
        }

        return points;
    };

    /**
     * Delete overlay from map based on id.
     * @param id
     */
    var removeOverlay = function(id) {
        scene.imageryLayers.remove(layers[id]);
        delete layers[id];
    };

    /**
     * Remove the transect line from map.
     */
    var removeLine = function() {
        entities.remove(entities.getById('transect'));
        $.each(getPointsInTransect(), function(i, point) {
            entities.remove(point);
        });

        viewer.scene.requestRender();
    };

    /**
     * Remove(hide) the rectangle line from map.
     */
    var removeRect = function() {
        selector.show = false;
        viewer.scene.requestRender();
    };

    /**
     * @return True if the transect is currently highlighted.
     */
    var isLineHighlighted = function() {
        var start = entities.getById('line-1');
        if (start && start.point.outlineWidth > 0) {
            return true;
        }
        else {
            return false;
        }
    };

    /**
     * @return True if the rectangle is currently highlighted.
     */
    var isRectHighlighted = function() {
        var rect = entities.getById('rectangle');
        if (rect && selector.show && rect.rectangle.outline.getValue()) {
            return true;
        }
        else {
            return false;
        }
    };

    /** ***************  events   ****************/

    /* mouse left click */
    var handler = new Cesium.ScreenSpaceEventHandler(viewer.canvas);
    handler.setInputAction(function(click) {
        var cartesian = viewer.camera.pickEllipsoid(click.position, scene.globe.ellipsoid);
        var cartographic = Cesium.Cartographic.fromCartesian(cartesian);
        if (mapSelectType === 'tiles') {
            displayAvailableTiles(
                Cesium.Math.toDegrees(cartographic.longitude),
                Cesium.Math.toDegrees(cartographic.latitude));
        }
        else {
            if (mapSelectType === 'transect') {
                drawLine(cartesian);
            }
            else {
                var pickedObject = scene.pick(click.position);
                var rectangle = entities.getById('rectangle');

                if (pickedObject) {
                    if (pickedObject.id.id === 'transect') {
                        $.each(getPointsInTransect(), function(i, point) {
                            point.point.outlineWidth = 2;
                        });
                    }
                    else {
                        rectangle.rectangle.outline = true;
                    }
                }
                else {
                    $.each(getPointsInTransect(), function(i, point) {
                        point.point.outlineWidth = 0;
                    });

                    if (rectangle) {
                        rectangle.rectangle.outline = false;
                    }
                }
            }
            viewer.scene.requestRender();
        }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    /* rectangle - shift, mouse down  */
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
        if (!mouseDown || mapSelectType !== 'rectangle') {
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
        function startClickShift() {
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
            material: Cesium.Color.WHITE.withAlpha(0.9),
            outline: false,
            outlineWidth: 2,
            height: 0
        }
    });

    $(document).on('keydown', function(e) {
        var code = e.keyCode || e.which;
        if (code === 46) {
            if (isLineHighlighted()) {
                removeLine();
                $.event.trigger({type: EVT_DELETE_LINE});
            }
            if (isRectHighlighted()) {
                entities.getById('rectangle').rectangle.outline = false;
                removeRect();
                $.event.trigger({type: EVT_DELETE_RECT});
            }
        }
    });

    /** ***************  public interface   ****************/
    return {
        // events
        EVT_DELETE_LINE: EVT_DELETE_LINE,
        EVT_DELETE_RECT: EVT_DELETE_RECT,
        EVT_MAP_CLICK: EVT_MAP_CLICK,
        EVT_LINE_ADDED: EVT_LINE_ADDED,
        EVT_RECT_ADDED: EVT_RECT_ADDED,

        clearMap: clearMap,
        displayOverlay: displayOverlay,

        /**
         * Get extents of current transect.
         * @return xmin,ymin,xmax,ymax if simple line with 2 points, else return
         * WKT linestriong.
         */
        getTransectExtents() {
            var extents = entities.getById('transect').polyline.positions.getValue();
            if (extents.length === 2) {
                var start = Cesium.Cartographic.fromCartesian(extents[0]);
                var end = Cesium.Cartographic.fromCartesian(extents[1]);
                return {
                    xmin: Cesium.Math.toDegrees(start.longitude),
                    ymin: Cesium.Math.toDegrees(start.latitude),
                    xmax: Cesium.Math.toDegrees(end.longitude),
                    ymax: Cesium.Math.toDegrees(end.latitude)
                };
            }
            else {
                var text = 'LINESTRING(';
                for (var i = 0; i < extents.length; i++) {
                    if (i > 0) {
                        text += ',';
                    }
                    var point = Cesium.Cartographic.fromCartesian(extents[i]);
                    text += Cesium.Math.toDegrees(point.longitude) + ' ' +
                        Cesium.Math.toDegrees(point.latitude);
                }

                return text + ')';
            }
        },

        /**
         * @return type transect, rectangle or tiles
         */
        getSelectType: function(type) {
            return mapSelectType;
        },

        /**
         * @return xmin,ymin,xmax,ymax of current rectangle
         */
        getTimeSeriesExtents() {
            var rect = entities.getById('rectangle').rectangle.coordinates.getValue();
            return {
                xmin: Cesium.Math.toDegrees(rect.west),
                xmax: Cesium.Math.toDegrees(rect.east),
                ymin: Cesium.Math.toDegrees(rect.south),
                ymax: Cesium.Math.toDegrees(rect.north)
            };
        },

        /**
         * @return Is the line currently displayed on map?
         */
        isLineVisible() {
            return entities.getById('transect') !== undefined;
        },

        /**
         * @return Is the rectangle currently displayed on map?
         */
        isRectVisible() {
            return selector.show;
        },

        /**
         * Delete overlay from map based on id.
         * @param id
         */
        removeOverlay: removeOverlay,

        /**
         * Inform map of current selection type.
         * @param type transect, rectangle or tiles
         */
        setSelectType: function(type) {
            mapSelectType = type;
        }
    };
});
