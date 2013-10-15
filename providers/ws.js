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
    , map
    , queue
    , retryMax
    , coolDown;

  return {

    /**
     * Inject services used within your service here
     */
    $get: ['$rootScope', '$timeout'
    , function ($rootScope, $timeout) {

      queue = [];
      map = {};
      retryCount = 0;

      if(!url) {
        $rootScope.$broadcast('ng2ws:log', "Using "+window.location.origin+" as websockets server.");
        url = "ws://"+window.location.origin.split('//').pop();
      }

      retryMax = retryMax || 5;
      coolDown = coolDown || 2000; 

      var connect = function () {
        retryCount = 0;
        socket = new WebSocket(url, protocols);
        $rootScope.$broadcast('ng2ws:socket::connect', socket);

        socket.onmessage = function (e) {
          var msg = JSON.parse(e.data);
          if(typeof msg.data === 'string' && msg.data[0] === '{') {
            msg.data = JSON.parse(msg.data);
          }
          $rootScope.$broadcast('ng2ws:socket::message', msg);
          if(msg.label) {
            map[msg.label] && map[msg.label].forEach(function (listener) {
              listener.fn(msg.data);
            });
          } else {
            Object.keys(map).forEach(function (label) {
              map[label].forEach(function (listener) {
                listener.fn(msg);
              });
            });
          }
        };

        socket.onopen = function (e) {
          $rootScope.$broadcast('ng2ws:socket::open', e);
          queue.forEach(function (msg) {
            socket.send(msg);
          });
        };

        socket.onerror = function (error) {
          $rootScope.$broadcast('ng2ws:socket::error', error);
        };

        socket.onclose = function (e) {
          $rootScope.$broadcast('ng2ws:socket::close', e);
          if (!e.wasClean) {
            if(retryCount >= retryMax) {
              return $rootScope.$broadcast('ng2ws:socket::retrylimit');
            }
            $timeout(function (argument) {
              $rootScope.$broadcast('ng2ws:socket::reconnect', e);
              connect();
              retryCount += 1;
            }, coolDown);
          } else {
            retryCount = 0;
          }
        }
      };

      var disconnect = function () {
        socket.close();
        $rootScope.$broadcast('ng2ws:socket::disconnect', socket);
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
        send: function (label, data) {
          var msg = JSON.stringify({label: label, data: data});
          if(socket && socket.readyState === 1) {
            socket.send(msg);
          } else {
            queue.push(msg);
          }
        },
        on: function (name, callback) {
          if(map[name] === undefined) {
            map[name] = []
          }
          var something = map[name].filter(function (obj) {
              return obj.original === callback.toString();
            });
          if(something.length > 0) {
            return;
          } else {
            return map[name].push({original: callback.toString(), fn: apply(callback)});
          }
        }
      };
    }],

    setRetryLimit: function (number) {
      retryMax = typeof number === 'Number' ? number : 5;
    },

    setCooldown: function (ms) {
      coolDown = typeof ms === 'Number' ? ms : 2000;
    },

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