/**
 * Created by Anton on 07.08.2016.
 */
/**
 * @param {string} head
 * @returns {Object}
 */
mono.parseXhrHeader = function(head) {
    head = head.split(/\r?\n/);
    var headers = {};
    head.forEach(function(line) {
        "use strict";
        var sep = line.indexOf(':');
        if (sep === -1) {
            return;
        }
        var key = line.substr(0, sep).trim().toLowerCase();
        var value = line.substr(sep + 1).trim();
        headers[key] = value;
    });
    return headers;
};

/**
 * @typedef {Object|string} requestDetails
 * @property {string} url
 * @property {string} [method] GET|POST
 * @property {string} [type] GET|POST
 * @property {string} [data]
 * @property {boolean} [cache]
 * @property {Object} [headers]
 * @property {string} [contentType]
 * @property {boolean} [json]
 * @property {boolean} [xml]
 * @property {number} [timeout]
 * @property {string} [mimeType]
 * @property {boolean} [withCredentials]
 * @property {boolean} [localXHR]
 */
/**
 * @callback requestResponse
 * @param {string|null} err
 * @param {Object} res
 * @param {string|Object|Array} data
 */
/**
 * @param {requestDetails} obj
 * @param {requestResponse} [origCb]
 * @returns {{abort: function}}
 */
mono.request = function(obj, origCb) {
    "use strict";
    var result = {};
    var cb = function(e, body) {
        cb = null;
        if (request.timeoutTimer) {
            mono.clearTimeout(request.timeoutTimer);
        }

        var err = null;
        if (e) {
            err = String(e.message || e) || 'ERROR';
        }
        origCb && origCb(err, getResponse(body), body);
    };

    var getResponse = function(body) {
        var response = {};

        response.statusCode = xhr.status;
        response.statusText = xhr.statusText;

        var headers = null;
        var allHeaders = xhr.getAllResponseHeaders();
        if (typeof allHeaders === 'string') {
            headers = mono.parseXhrHeader(allHeaders);
        }
        response.headers = headers || {};

        response.body = body;

        return response;
    };

    if (typeof obj !== 'object') {
        obj = {url: obj};
    }

    var url = obj.url;

    var method = obj.method || obj.type || 'GET';
    method = method.toUpperCase();

    var data = obj.data;
    if (typeof data !== "string") {
        data = mono.param(data);
    }

    if (data && method === 'GET') {
        url += (/\?/.test(url) ? '&' : '?') + data;
        data = undefined;
    }

    if (obj.cache === false && ['GET','HEAD'].indexOf(method) !== -1) {
        url += (/\?/.test(url) ? '&' : '?') + '_=' + Date.now();
    }

    obj.headers = obj.headers || {};

    if (data) {
        obj.headers["Content-Type"] = obj.contentType || obj.headers["Content-Type"] || 'application/x-www-form-urlencoded; charset=UTF-8';
    }

    var request = {};
    request.url = url;
    request.method = method;

    data && (request.data = data);
    obj.json && (request.json = true);
    obj.xml && (request.xml = true);
    obj.timeout && (request.timeout = obj.timeout);
    obj.mimeType && (request.mimeType = obj.mimeType);
    obj.withCredentials && (request.withCredentials = true);
    Object.keys(obj.headers).length && (request.headers = obj.headers);

    if (request.timeout > 0) {
        request.timeoutTimer = mono.setTimeout(function() {
            cb && cb(new Error('ETIMEDOUT'));
            xhr.abort();
        }, request.timeout);
    }

    var xhrSuccessStatus = {
        0: 200,
        1223: 204
    };

    var xhr = mono.request.getTransport(obj.localXHR);
    xhr.open(request.method, request.url, true);

    if (mono.isModule && request.xml) {
        request.mimeType = 'text/xml';
    }
    if (request.mimeType) {
        xhr.overrideMimeType(request.mimeType);
    }
    if (request.withCredentials) {
        xhr.withCredentials = true;
    }
    for (var key in request.headers) {
        xhr.setRequestHeader(key, request.headers[key]);
    }

    var readyCallback = xhr.onload = function() {
        var status = xhrSuccessStatus[xhr.status] || xhr.status;
        try {
            if (status >= 200 && status < 300 || status === 304) {
                var body = xhr.responseText;
                if (request.json) {
                    body = JSON.parse(body);
                } else
                if (request.xml) {
                    if (mono.isModule) {
                        body = xhr.responseXML;
                    } else {
                        body = (new DOMParser()).parseFromString(body, "text/xml");
                    }
                } else
                if (typeof body !== 'string') {
                    console.error('Response is not string!', body);
                    throw new Error('Response is not string!');
                }
                return cb && cb(null, body);
            }
            throw new Error(xhr.status + ' ' + xhr.statusText);
        } catch (e) {
            return cb && cb(e);
        }
    };

    var errorCallback = xhr.onerror = function() {
        cb && cb(new Error(xhr.status + ' ' + xhr.statusText));
    };

    var stateChange = null;
    if (xhr.onabort !== undefined) {
        xhr.onabort = errorCallback;
    } else {
        stateChange = function () {
            if (xhr.readyState === 4) {
                cb && mono.setTimeout(function () {
                    return errorCallback();
                });
            }
        };
    }

    if (stateChange) {
        xhr.onreadystatechange = stateChange;
    }

    try {
        xhr.send(request.data || null);
    } catch (e) {
        mono.setTimeout(function() {
            cb && cb(e);
        });
    }

    result.abort = function() {
        cb = null;
        xhr.abort();
    };

    return result;
};

mono.request.getTransport = function() {
    if (mono.isModule) {
        return new (require('sdk/net/xhr').XMLHttpRequest)();
    }

    return new XMLHttpRequest();
};

mono.extend = function() {
    var obj = arguments[0];
    for (var i = 1, len = arguments.length; i < len; i++) {
        var item = arguments[i];
        for (var key in item) {
            if (item[key] !== undefined) {
                obj[key] = item[key];
            }
        }
    }
    return obj;
};

mono.param = function(obj) {
    if (typeof obj === 'string') {
        return obj;
    }
    var itemsList = [];
    for (var key in obj) {
        if (!obj.hasOwnProperty(key)) {
            continue;
        }
        if (obj[key] === undefined || obj[key] === null) {
            obj[key] = '';
        }
        itemsList.push(encodeURIComponent(key)+'='+encodeURIComponent(obj[key]));
    }
    return itemsList.join('&');
};

/**
 * @param {string|Element|DocumentFragment} tagName
 * @param {Object} obj
 * @returns {Element|DocumentFragment}
 */
mono.create = function(tagName, obj) {
    "use strict";
    var el;
    var func;
    if (typeof tagName !== 'object') {
        el = document.createElement(tagName);
    } else {
        el = tagName;
    }
    for (var attr in obj) {
        var value = obj[attr];
        if (func = mono.create.hook[attr]) {
            func(el, value);
            continue;
        }
        el[attr] = value;
    }
    return el;
};
mono.create.hook = {
    text: function(el, value) {
        "use strict";
        el.textContent = value;
    },
    data: function(el, value) {
        "use strict";
        for (var item in value) {
            el.dataset[item] = value[item];
        }
    },
    class: function(el, value) {
        "use strict";
        if (Array.isArray(value)) {
            for (var i = 0, len = value.length; i < len; i++) {
                el.classList.add(value[i]);
            }
        } else {
            el.setAttribute('class', value);
        }
    },
    style: function(el, value) {
        "use strict";
        if (typeof value === 'object') {
            for (var item in value) {
                var key = item;
                if (key === 'float') {
                    key = 'cssFloat';
                }
                var _value = value[item];
                if (Array.isArray(_value)) {
                    for (var i = 0, len = _value.length; i < len; i++) {
                        el.style[key] = _value[i];
                    }
                } else {
                    el.style[key] = _value;
                }
            }
        } else {
            el.setAttribute('style', value);
        }
    },
    append: function(el, value) {
        "use strict";
        if (!Array.isArray(value)) {
            value = [value];
        }
        for (var i = 0, len = value.length; i < len; i++) {
            var node = value[i];
            if (!node && node !== 0) {
                continue;
            }
            if (typeof node !== 'object') {
                node = document.createTextNode(node);
            }
            el.appendChild(node);
        }
    },
    on: function(el, eventList) {
        "use strict";
        if (typeof eventList[0] !== 'object') {
            eventList = [eventList];
        }
        for (var i = 0, len = eventList.length; i < len; i++) {
            var args = eventList[i];
            if (!Array.isArray(args)) {
                continue;
            }
            mono.on.apply(mono, [el].concat(args));
        }
    },
    one: function (el, eventList) {
        "use strict";
        if (typeof eventList[0] !== 'object') {
            eventList = [eventList];
        }
        for (var i = 0, len = eventList.length; i < len; i++) {
            var args = eventList[i];
            if (!Array.isArray(args)) {
                continue;
            }
            mono.one.apply(mono, [el].concat(args));
        }
    }
};

/**
 * @param {Node} el
 * @param {String} type
 * @param {Function} onEvent
 * @param {Boolean} [capture]
 */
mono.on = function(el, type, onEvent, capture) {
    el.addEventListener(type, onEvent, capture);
};

/**
 * @param {Node} el
 * @param {String} type
 * @param {Function} onEvent
 * @param {Boolean} [capture]
 */
mono.off = function(el, type, onEvent, capture) {
    el.removeEventListener(type, onEvent, capture);
};

/**
 * @param {Node} el
 * @param {String} type
 * @param {Function} onEvent
 * @param {Boolean} [capture]
 */
mono.one = function(el, type, onEvent, capture) {
    var fnName = ['oneFn', type, !!capture].join('_');
    var fn = onEvent[fnName];
    if (!fn) {
        onEvent[fnName] = fn = function (e) {
            mono.off(this, type, fn, capture);
            onEvent.apply(this, arguments);
        }
    }
    mono.on(el, type, fn, capture);
    fnName = null;
    el = null;
};

mono.debounce = function(fn, delay) {
    var timer = null;
    return function () {
        var context = this, args = arguments;
        mono.clearTimeout(timer);
        timer = mono.setTimeout(function () {
            fn.apply(context, args);
        }, delay);
    };
};

/**
 * @param {Function} cb
 * @param {Object} [scope]
 * @returns {Function}
 */
mono.asyncFn = function (cb, scope) {
    return function () {
        var context = scope || this;
        var args = arguments;
        mono.setTimeout(function () {
            cb.apply(context, args);
        }, 0);
    };
};

/**
 * @param {Function} cb
 * @param {Object} [scope]
 * @returns {Function}
 */
mono.onceFn = function (cb, scope) {
    return function () {
        if (cb) {
            var context = scope || this;
            cb.apply(context, arguments);
            cb = null;
        }
    };
};

/**
 * @returns {Number}
 */
mono.getTime = function () {
    return parseInt(Date.now() / 1000);
};