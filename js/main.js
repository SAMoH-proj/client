'use strict';

/* global require */

$(document).ready(function() {
    require(['map', 'panel', 'config'], function(map, panel, config) {
/*        var websocket = new WebSocket(config.backend_url);
        websocket.onmessage = function(evt) {
            $('#server-messages').show();
            $('#server-messages-text').text(evt.data);
        };

        $('#server-messages .close').on('click', function() {
            $('#server-messages').hide();
        });
*/
        $('#alert .close').on('click', function() {
            $('#alert').hide();
        });

    });
});
