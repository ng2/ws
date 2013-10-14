/**
* @ngdoc service
* @name ng2ws.providers:wsProvider
* @description
* Provider configuration docs.
*/

/**
* @ngdoc service
* @name ng2ws.services:ws
* @description
* Service consumption docs.
*/

angular
.module('ng2ws')
.provider('ng2ws', function () {

  var url
    , protocols
    , socket
    , map;

  return {

    /**
     * Inject services used within your service here
     */
    $get: ['$rootScope', '$timeout'
    , function ($rootScope, $timeout) {

      map = {};

      if(!url) {
        $rootScope.$broadcast('ng2ws:log', "Using "+window.location.origin+" as websockets server.");
        url = "ws://"+window.location.origin.split('//').pop();
      }

      var connect = function () {
        socket = new WebSocket(url, protocols);
        $rootScope.$broadcast('ng2ws:socket::connect', socket);

        socket.onmessage = function (e) {
          var msg = JSON.parse(e.data);
          if(msg.data) {
            msg.data = JSON.parse(msg.data);
          }
          $rootScope.$broadcast('ng2ws:socket::message', msg);
          if(msg.label) {
            map[msg.label].forEach(function (listener) {
              listener(msg.data);
            });
          } else {
            Object.keys(map).forEach(function (label) {
              map[label].forEach(function (listener) {
                listener(msg);
              });
            });
          }
        };

        socket.onopen = function (e) {
          $rootScope.$broadcast('ng2ws:socket::open', e);
        };

        socket.onerror = function (error) {
          $rootScope.$broadcast('ng2ws:socket::error', error);
        };
      };

      var disconnect = function () {
        $rootScope.$broadcast('ng2ws:socket::disconnect', socket);
        socket.close();
        $rootScope.$broadcast('ng2ws:socket::close', socket);
      }

      /**
       * @ngdoc function
       * @name apply
       * @propertyOf ng2ws.services:ws
       * @description
       * Private service function.
       */
      var apply = function (callback) {
        return function (data) {
          return $timeout(function () {
            $rootScope.$apply(function () {
              callback(data);
            });
          },0);
        };
      };

      return {
        open: connect,
        close: disconnect,
        on: function (name, callback) {
          if(map[name] === undefined) {
            map[name] = [];
          }
          return map[name].push(apply(callback));
        }
      };
    }],

    setUrl: function (string) {
      url = string;
    },

    setProtocols: function (array) {
      if(typeof array === 'string') {
        array = [array];
      }
      protocols = array;
    }
  }
});