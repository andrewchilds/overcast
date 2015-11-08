'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var _request = require('request');

var _request2 = _interopRequireDefault(_request);

var RequestHelper = (function () {
  /**
   * Request Helper
   * @param {string} token - Your Private API Token
   * @constructor
   */

  function RequestHelper(token) {
    _classCallCheck(this, RequestHelper);

    this.headers = {
      'authorization': 'Bearer ' + token,
      'content_type': 'application/json'
    };
    this.apiUrl = 'https://api.digitalocean.com/v2/';
  }

  /**
   * Check the required Request & Trigger
   * @param {*} options - Request Options
   * @param {*} callback - Function to execute on completion
   */

  _createClass(RequestHelper, [{
    key: 'request',
    value: function request(options, callback) {
      if (options.includeAll) {
        this.getAllPages(options.key, options, callback);
      } else {
        this.submitRequest(options, callback);
      }
    }

    /**
     * Submit the Request
     * @param {*} options - Request Options Object
     * @param {*} callback - Function to execute on completion
     */
  }, {
    key: 'submitRequest',
    value: function submitRequest(options, callback) {
      var requestOptions = this.requestBuilder(options);
      (0, _request2['default'])(requestOptions, function (err, response, body) {
        if (err) {
          callback(err);
        } else {
          callback(null, response, body);
        }
      });
    }

    /**
     * Get All Pages
     * @param {string} key - Type of Item
     * @param {*} options - Request Options
     * @param {*} callback - Function to execute on completion
     */
  }, {
    key: 'getAllPages',
    value: function getAllPages(key, options, callback) {
      var items = [],
          total = 0,
          required = 0,
          completed = 1;

      options.qs.page = 1;

      this.submitRequest(options, (function (err, response, body) {
        if (err) {
          callback(err);
        }
        total = body.meta.total;
        items = items.concat(body[key]);
        required = total / (options.qs.per_page || 25);
        if (items.length >= total) {
          return callback(null, response, items);
        } else {
          this.getRemainingPages(options, 2, required, function (err, response, body) {
            if (err) {
              callback(err);
            }
            completed++;
            items = items.concat(body[key]);
            if (completed === required) {
              callback(null, response, items);
            }
          });
        }
      }).bind(this));
    }

    /**
     * Get the Remaining Pages
     * @param {*} options - Request Options
     * @param {number} first - The first page to retrieve
     * @param {number} last - The last page to retrieve
     * @param {*} callback - Function to execute on completion
     */
  }, {
    key: 'getRemainingPages',
    value: function getRemainingPages(options, first, last, callback) {
      for (var current = first; current <= last; current++) {
        options.qs.page = current;
        this.submitRequest(options, callback);
      }
    }

    /**
     * Build Options for Request
     * @param {*} options - Options Object
     * @returns {*}
     */
  }, {
    key: 'requestBuilder',
    value: function requestBuilder(options) {
      return {
        uri: this.apiUrl + options.actionPath,
        method: options.method || 'GET',
        headers: options.headers || this.headers,
        body: options.body || {},
        strictSSL: true,
        json: true,
        qs: options.qs || {}
      };
    }
  }]);

  return RequestHelper;
})();

exports['default'] = RequestHelper;
module.exports = exports['default'];