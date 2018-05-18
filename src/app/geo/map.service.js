import { IdentifyMode } from 'api/map';

/**
 * @module mapService
 * @memberof app.geo
 * @description
 *
 * The `mapService` factory holds references to the map dom node and the currently active map object.
 *
 */
angular.module('app.geo').factory('mapService', mapServiceFactory);

function mapServiceFactory(
    $timeout,
    referenceService,
    gapiService,
    configService,
    identifyService,
    events,
    $translate,
    errorService,
    $http
) {
    const service = {
        destroyMap,
        makeMap,
        setAttribution,
        zoomToLatLong,

        getCenterPointInTargetBasemap,

        // TODO: should these functions be proxied through the geoService?
        addGraphicHighlight,
        addMarkerHighlight,
        clearHighlight,

        zoomToFeature,

        checkForBadZoom
    };

    let mApi = null;
    events.$on(events.rvApiMapAdded, (_, api) => (mApi = api));

    let fakeFileLayer = null;
    let firstBasemapFlag = true;

    return service;

    function setAttribution(config) {
        const cfgAtt = config.attribution;
        const mapInstance = configService.getSync.map.instance;
        const attNode = $(mapInstance.attribution.listNode.parentNode);
        const logoNode = attNode.parent().find('.logo-med');
        const listNode = mapInstance.attribution.listNode;

        // esri default logo
        const esriLogo =
            'url(data:image/png;base64,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)';

        // always remove custom text attribution when switch baseMaps
        if (listNode.childElementCount > 0 &&
                listNode.children[0].classList.toString().search(/esriAttribution*/) === -1) {
            listNode.removeChild(listNode.children[0]);
        }

        // if config is undefined, show attribution text from built in values and ESRI logo
        // if it is !== undefined then take values from config file
        if (typeof cfgAtt !== 'undefined') {
            if (cfgAtt.text.enabled && cfgAtt.text.value) {
                const attributionNode = document.createElement('span');
                attributionNode.innerText = cfgAtt.text.value + ' | ';
                listNode.insertAdjacentElement('afterbegin', attributionNode);
                attNode.show();
            } else if (!cfgAtt.text.enabled) {
                attNode.hide();
            }

            if (cfgAtt.logo.enabled) {
                // if values are supplied in the config file, use them. otherwise use default esri
                if (cfgAtt.logo.value) {
                    setCustomAttribLogo(mapInstance,logoNode, cfgAtt.logo);
                } else {
                    setEsriAttribLogo(mapInstance,logoNode, esriLogo);
                }
                logoNode.show();
                logoNode.css('visibility', 'visible');
            } else {
                logoNode.hide();
            }
        } else {
            // if not define in config, use service value for attribution and the ESRI default value for logo
            attNode.show();
            setEsriAttribLogo(mapInstance,logoNode, esriLogo);
            logoNode.show();
            logoNode.css('visibility', 'visible');
        }
    }

    /**
     * Set the proper attribution logo, altext and link value.
     *
     * @function setCustomAttribLogo
     * @private
     * @param {Object} mapInstance map instance
     * @param {Object} logoNode attribution logo node
     * @param {Object} config configuration piece for the logo
     */
    function setCustomAttribLogo(mapInstance, logoNode, config) {
        logoNode.css('background-image', `url(${config.value})`);
        logoNode[0].title = (config.altText) ? config.altText : 'Image';
        if (config.link) {
            logoNode[0].classList.remove('rv-nopointer');
            mapInstance.mapDefault('logoLink', config.link);
        } else {
            logoNode[0].classList.add('rv-nopointer');
            mapInstance.mapDefault('logoLink', '');
        }
    }

    /**
     * Set the esri attribution logo, altext and link value.
     *
     * @function setEsriAttribLogo
     * @private
     * @param {Object} mapInstance map instance
     * @param {Object} logoNode attribution logo node
     * @param {String} esriLogo default esri logo in base64
     */
    function setEsriAttribLogo(mapInstance, logoNode, esriLogo) {
        logoNode.css('background-image', esriLogo);
        logoNode[0].title = 'Esri';
        logoNode[0].classList.remove('rv-nopointer');
        mapInstance.mapDefault('logoLink', 'http://www.esri.com'); // TODO: create a function in geoapi to get default config value
    }

    /**
     * Destroys the current ESRI map objects and resets the typed map config object.
     *
     * @function destroyMap
     */
    function destroyMap() {
        const mapConfig = configService.getSync.map;

        mapConfig.instance._map.destroy();
        mapConfig.reset();

        referenceService.mapNode.empty();

        // unsubscribe events
        events.$unsubscribe(events.rvFeatureMouseOver, events.rvEPSGPreInited, events.rvIntentionsPreInited);

        // FIXME: do we need to destroy scalebar and overview map even after we empty the node
    }

    /**
     * Creates an ESRI map object using map settings from the config file and map node from the storage service.
     * The map node never changes, so for any subsequent map making, the same node is used.
     *
     * @function makeMap
     */
    function makeMap() {
        const gapi = gapiService.gapi;
        const { map: mapConfig, services: servicesConfig } = configService.getSync;

        // dom node to build the map on; need to be specified only the first time the map is created and stored for reuse;
        const mapNode = referenceService.mapNode;

        const mapSettings = {
            basemaps: mapConfig.basemaps,
            scalebar: mapConfig.components.scaleBar,
            overviewMap: mapConfig.components.overviewMap,
            extent: _getStartExtent(mapConfig, mapNode),
            lods: mapConfig.selectedBasemap.lods,
            tileSchema: mapConfig.selectedBasemap.tileSchema
        };

        // TODO: convert service section of the config to typed objects
        if (servicesConfig.proxyUrl) {
            mapSettings.proxyUrl = servicesConfig.proxyUrl;
        }
        const mapInstance = new gapi.Map(mapNode[0], mapSettings);

        // create a fake GeoJSON file to ensure an esri layer gets created which will trigger the load event on the esri map instance
        // (when first layer is added to the map) https://developers.arcgis.com/javascript/3/jsapi/map-amd.html#event-load
        // this way, if the default basemap is down, the app won't crash since it already triggered the event which results in the
        // correct chain of commands being executed
        let fakeGeoJSON = {
            type: 'FeatureCollection',
            features: [
                {
                    type: 'Feature',
                    geometry: { type: 'Point', coordinates: [-100, 50] },
                    properties: { key: 'value' }
                }
            ]
        };

        // avoid private variable
        const res = gapiService.gapi.layer.makeGeoJsonLayer(fakeGeoJSON, { targetWkid: mapInstance._map.extent.spatialReference.wkid });
        res.then(esriLayer => {
            firstBasemapFlag = true;
            fakeFileLayer = esriLayer;
            mapInstance.addLayer(esriLayer);
        });

        mapConfig.storeMapReference(mapInstance);
        _setMapListeners(mapConfig);
    }

    /**
     * Takes a location object in lat/long, converts to current map spatialReference using
     * reprojection method in geoApi, and zooms to the point.
     *
     * @function zoomToLatLong
     * @param {Object} location is a location object, containing geometries in the form of { longitude: <Number>, latitude: <Number> }
     */
    function zoomToLatLong(location) {
        configService.getSync.map.instance.zoomToPoint(location);
    }

    /**
     * Derives an initial extent using information from the bookmark
     * and the config file
     *
     * @function _getStartExtent
     * @private
     * @param {Map} mapConfig typed map config
     * @param {Object} mapNode dom node of the map
     * @returns {Object}            An extent where the map should initialize
     */
    function _getStartExtent(mapConfig, mapNode) {
        if (!mapConfig.startPoint) {
            return mapConfig.selectedBasemap.default;
        }

        // find the LOD set for the basemap in the config file,
        // then find the LOD closest to the scale provided by the bookmark.
        const zoomLod = gapiService.gapi.Map.findClosestLOD(mapConfig.selectedBasemap.lods, mapConfig.startPoint.scale);

        // using resolution of our target level of detail, and the size of the map in pixels,
        // calculate a rough extent of where our map should initialize.
        const xOffset = mapNode.outerHeight(true) * zoomLod.resolution / 2;
        const yOffset = mapNode.outerHeight(true) * zoomLod.resolution / 2;

        return {
            xmin: mapConfig.startPoint.x - xOffset,
            xmax: mapConfig.startPoint.x + xOffset,
            ymin: mapConfig.startPoint.y - yOffset,
            ymax: mapConfig.startPoint.y + yOffset,
            spatialReference: mapConfig.selectedBasemap.default.spatialReference
        };
    }

    /**
     * A helper function for reprojecting a center point of the source basemap to the target basemap.
     * Used for bookmarking.
     *
     * @function getCenterPointInTargetBasemap
     * @param {ESRIMapWrapper} mapInstance a geoapi map wrapper
     * @param {Basemap} sourceBasemap currently selected basemap
     * @param {Basemap} targetBasemap a target basemap to projection the center point to
     * @return {Object} in the form of { x: Number, y: Number, scale: Number }
     */
    function getCenterPointInTargetBasemap(mapInstance, sourceBasemap, targetBasemap) {
        const extentCenter = mapInstance.extent.getCenter();
        const scale = mapInstance._map.getScale();

        // find the LOD set for the basemap in the config file,
        // then find the LOD closest to the scale provided by the bookmark.
        const targetZoomLod = gapiService.gapi.Map.findClosestLOD(targetBasemap.lods, scale);

        // project bookmark point to the map's spatial reference
        const coords = gapiService.gapi.proj.localProjectPoint(
            sourceBasemap.default.spatialReference,
            targetBasemap.default.spatialReference,
            { x: extentCenter.x, y: extentCenter.y }
        );

        return {
            x: coords.x,
            y: coords.y,
            scale: targetZoomLod.scale
        };
    }

    /**
     * Ready a trigger on the map load event.
     * Also initialize map full extent.
     *
     * @function _setMapListeners
     * @param {Map} mapConfig typed map config object
     * @private
     */
    function _setMapListeners(mapConfig) {
        // we are returning a promise that resolves when the map load happens.
        const gapi = gapiService.gapi;
        let mapLoadingTimeout;

        // a flag indicating if a feature is being hover over
        let isFeatureMousedOver = false;

        _setLoadingFlag(true);

        events.$on(events.rvFeatureMouseOver, (event, value) => {
            isFeatureMousedOver = value;

            if (mApi.identifyMode !== 'none') {
                mapConfig.instance.setMapCursor(value ? 'pointer' : '');
            }
        });

        /*
        General flow of loading map and first layers.
        1.  Create the map. Basemap schema is supplied to the constructor.
        2.  Add an in-memory feature layer ("fake layer") to the map. This satisfies the map "load" condition,
            which happens when the first layer is added. Using a fake layer insulates the map load from a
            server being down.
        3.  When the map triggers its layer added event for the fake layer, remove it, and initialize the basemap
            gallery. At the same time, do a web call to the initial basemap service to see if the server is alive.
        4a. We see the initial basemap succesfully load via the map's layer added event. We tell the application
            to continue loading everything else.  If we didn't wait, and a different raster layer loaded first,
            the basemap gallery would remove it when it loaded the first basemap.
        4b. We see a failure condition on our web call to the initial basemap service. We track it, remove the
            overview map, and continue on with loading other layers. The map will have no basemap but will still
            be functional. In most cases (using the stock config), if one basemap is down, all on that server
            will be down.
        */
        gapi.events.wrapEvents(mapConfig.instance, {
            'layer-add': res => {
                if (fakeFileLayer && res.layer.id === fakeFileLayer.id) {
                    // remove the fake file layer from the map now
                    mapConfig.instance.removeLayer(fakeFileLayer);
                }

                if (res.layer._basemapGalleryLayerType === 'basemap') { // avoid private variable

                    // only broadcast the event the first time a basemap is loaded
                    if (firstBasemapFlag) {
                        events.$broadcast(events.rvBasemapLoaded);
                        firstBasemapFlag = false;

                        // if basemap loaded and it was the first load, initalize the map
                        _initMap();
                    }
                }
            },
            'layer-remove': res => {
                if (fakeFileLayer && res.layer.id === fakeFileLayer.id) {
                    fakeFileLayer = null;

                    // after the fake layer has been removed, initalize basemap gallery and select first basemap
                    mapConfig.instance.initGallery();
                    mapConfig.instance.selectBasemap(mapConfig.selectedBasemap);
                    setAttribution(mapConfig.selectedBasemap);

                    // poke the server to see if basemap load errored. if so, initalize the map anyway to ensure all the layers still get added
                    // this will handle only failure cases, the basemap success case is handled when the `layer-add` event is triggered
                    // for the basemap layer (only the first time a basemap layer is added)
                    $http.get(mapConfig.selectedBasemap.url + '?f=json')
                        .then(response => {

                            // response returned but its an error response since invalid URL, so initalize map
                            if (!response || typeof response.data.error !== 'undefined') {
                                _initMap();
                            }
                        })
                        .catch(() => _initMap());   // promise rejected due to server issues, so initialize map
                }
            },
            'update-start': () => {
                _setLoadingFlag(true, 300);
            },
            'extent-change': data => {
                // remove highlighted features and the haze when the map is panned, zoomed, etc.
                if (angular.isObject(data.delta) && (data.delta.x !== 0 || data.delta.y !== 0 || data.levelChange)) {
                    clearHighlight(false);
                }

                events.$broadcast(events.rvExtentChange, data);
            },
            'mouse-move': data => events.$broadcast(events.rvMouseMove, data.mapPoint),
            'update-end': () => {
                _setLoadingFlag(false, 100);
            },
            'zoom-start': () => {
                events.$broadcast(events.rvMapZoomStart);
            },
            click: clickEvent => {
                const areGraphicsHighlighted = mapConfig.highlightLayer.graphics.length > 0;

                // if not hovering, and something is highlighted, clear the haze and quit without running identify
                // FIXME: if you quickly move the cursor away after clicking, `isFeatureMousedOver` will be `false` cancelling the identify
                // maybe it's viable to check `clickEvent.target` - feature vs map; not sure this should be done though
                if (!isFeatureMousedOver && areGraphicsHighlighted) {
                    clearHighlight(false);
                    return;
                }

                // do not run identify query at all in `None` mode
                if (mApi.identifyMode === IdentifyMode.None) {
                    return;
                }

                // if not hovering, and not in `Silent` mode, add a graphic marker
                if (mApi.identifyMode !== IdentifyMode.Silent && !isFeatureMousedOver) {
                    addMarkerHighlight(clickEvent.mapPoint);
                }

                // run identify query
                const identifyResponse = identifyService.identify(clickEvent);

                // highlight any results if in `Highlight` mode
                if (mApi.identifyMode === IdentifyMode.Highlight) {
                    highlightIdentifyResults(identifyResponse);
                }
            }
        });

        /**
         * Creates the highlight layer and broadcasts the map loaded event.
         *
         * @function _initMap
         * @private
         */
        function _initMap() {
            if (!mapConfig.isLoaded) {
                // setup hilight layer
                mapConfig.highlightLayer = gapi.hilight.makeHilightLayer({});
                mapConfig.instance.addLayer(mapConfig.highlightLayer);

                // mark the map as loaded so data layers can be added
                mapConfig.isLoaded = true;

                // TODO: maybe it makes sense to fire `mapReady` event here instead of in geo service
                _setLoadingFlag(false);
                events.$broadcast(events.rvMapLoaded, mapConfig.instance);
            }
        }

        /**
         * Sets `isMapLoading` flag indicating map layers are updating.
         *
         * @function _setLoadingFlag
         * @param {Boolean} isLoading defaults to true; flag indicating if one or more layers begins updating their content
         * @param {Number}  delay     defaults to 0; delay before setting `isMapLoading` state; useful to avoid setting indicator for a small amounts of time
         * @private
         */
        function _setLoadingFlag(isLoading = true, delay = 0) {
            $timeout.cancel(mapLoadingTimeout);
            mapLoadingTimeout = $timeout(() => (mapConfig.isMapLoading = isLoading), delay);
        }
    }

    /**
     * Highlights all resolved identify results. Accepts the identify response returned by the identify service call.
     *
     * @param {Object} { details, requester }: { details: { isLoaded: Promise<boolean>, data: IdentifyResult[] }, requester: { mapPoint: MapPoint }}
     */
    function highlightIdentifyResults({ details, requester }) {
        // if `details` is not set, the identify call hasn't been complete (no layers added to the map, for example)
        if (!details) {
            return;
        }

        const mapConfig = configService.getSync.map;
        let isCleared = false;

        details.isLoaded.then(() => {
            // details.data contains a list of identify results; one result per feature layer or dynamic sublayer or wms layer
            details.data.forEach(identifyResult =>
                identifyResult.data.forEach(dataItem => {
                    // clear everything before adding more highlights, but only once after it's clear there is at least one result
                    if (!isCleared) {
                        isCleared = true;
                        clearHighlight();
                    }

                    const graphiBundlePromise = identifyResult.requester.proxy.fetchGraphic(dataItem.oid, {
                        map: mapConfig.instance,
                        geom: true,
                        attribs: true
                    });
                    addGraphicHighlight(graphiBundlePromise, true);
                })
            );
        });
    }

    /**
     * Adds the provided graphic to the highlight layer. Also can turn the "haze" on or off.
     *
     * @function addGraphicHighlight
     * @param {Object} graphicBundlePromise the promise resolving with the graphic bundle; these bundles are returned by `fetchGraphic` when called on a proxy layer object
     * @param {Boolean | null} showHaze [optional = null] `true` turns on the "haze"; `false`, turns it off; `null` keeps it's current state
     */
    function addGraphicHighlight(graphicBundlePromise, showHaze = false) {
        const gapi = gapiService.gapi;
        const mapConfig = configService.getSync.map;

        graphicBundlePromise.then(graphicBundle => {
            const ubGraphics = gapi.hilight.getUnboundGraphics([graphicBundle], mapConfig.instance.spatialReference);

            ubGraphics[0].then(unboundG => {
                console.log('unbound graphic for hilighting ', unboundG);
                mapConfig.highlightLayer.addHilight(unboundG);
            });
        });

        _toggleHighlightHaze(showHaze);
    }

    /**
     * Adds a marker to the highlight layer to accentuate the click point. Also can turn the "haze" on or off.
     *
     * @param {Object} mapPoint click point from the ESRI click event
     * @param {Boolean | null} showHaze [optional = null] `true` turns on the "haze"; `false`, turns it off; `null` keeps it's current state
     */
    function addMarkerHighlight(mapPoint, showHaze = null) {
        const mapConfig = configService.getSync.map;
        mapConfig.highlightLayer.addMarker(mapPoint);
        _toggleHighlightHaze(showHaze);
    }

    /**
     * Removes the highlighted features and markers.
     *
     * @function clearHighlight
     * @param {Boolean | null} [showHaze = null] `true` turns on the "haze"; `false`, turns it off; `null` keeps it's current state
     */
    function clearHighlight(showHaze = null) {
        const mapConfig = configService.getSync.map;
        mapConfig.highlightLayer.clearHilight();

        _toggleHighlightHaze(showHaze);
    }

    /**
     * Toggles the "haze" obscuring all other features and layers except the highlight layer.
     *
     * @function _toggleHighlightHaze
     * @private
     * @param {Boolean | null} value [optional = null] `true` turns on the "haze"; `false`, turns it off; `null` keeps it's current state
     */
    function _toggleHighlightHaze(value = null) {
        if (value !== null) {
            angular.element(referenceService.mapNode).toggleClass('rv-map-highlight', value);
        }
    }

    /**
     * Zoom to a single feature given its proxy layer object and oid.
     * Takes into account main panel offset and trigger `peekAtMap` if offsets are too great.
     *
     * @param {LayerProxy} proxy proxy layer object containing the feature
     * @param {Number} oid feature object id
     * @return {Promise} a promise resolving after map completes extent change
     */
    function zoomToFeature(proxy, oid) {
        const offset = referenceService.mainPanelsOffset;
        const peekFactor = 0.4;
        // if either of the offsets is greater than 80%, peek at the map instead of offsetting the map extent
        if (offset.x > peekFactor || offset.y > peekFactor) {
            offset.x = offset.y = 0;
            referenceService.peekAtMap();
        }

        const map = configService.getSync.map.instance;
        const zoomPromise = proxy.zoomToGraphic(oid, map, offset).then(() => {
            const graphiBundlePromise = proxy.fetchGraphic(oid, { map, geom: true, attribs: true });
            service.addGraphicHighlight(graphiBundlePromise, true);
        });

        return zoomPromise;
    }

    /**
     * Checks if the recent extent change moves the extent center outside of the current basemap's full extent and
     * displays a toast notification asking the user if they want to move to the adjusted extent.
     *
     * @function checkForBadZoom
     */
    function checkForBadZoom() {
        const mapConfig = configService.getSync.map;
        const map = mapConfig.instance;
        const fullExtent = map.enhanceConfigExtent(mapConfig.selectedBasemap.full);
        const checkResult = gapiService.gapi.Map.enforceBoundary(map.extent, fullExtent);

        if (checkResult.adjusted) {
            // create notification toast
            const toast = {
                textContent: $translate.instant('toc.boundaryZoom.badzoom'),
                action: $translate.instant('toc.boundaryZoom.undo'),
                parent: referenceService.panels.shell
            };

            // promise resolves with 'ok' when user clicks 'undo'
            errorService
                .display(toast)
                .then(response => (response === 'ok' ? map.setExtent(checkResult.newExtent, true) : () => {}));
        }
    }
}
