/**
 * Created by Anton on 07.08.2016.
 */
var bg = {
    preferences: {},
    language: {},
    prepare: function (cb) {
        var _this = this;
        var keys = Object.keys(_this.preferences);

        var lsKey = bg.liteStorage.getStorageKey();
        keys.push(lsKey);
        return mono.storage.get(keys, function (storage) {
            bg.liteStorage.setStorage(storage);
            delete storage[lsKey];

            mono.extend(_this.preferences, storage);

            return mono.getLanguage(mono.getLoadedLocale(), function (err, language) {
                if (err) {
                    console.error('Load language error!', err);
                } else {
                    mono.extend(_this.language, language);
                }

                mono.onMessage.addListener(_this.onMessage);

                cb();
            });
        });
    },
    onMessage: function (msg, response) {
        var _this = bg;
        switch (msg.action) {
            case "prepare":
                response({
                    preferences: _this.preferences,
                    language: _this.language
                });
                break;
        }
    },
    run: function () {
        var _this = this;
    }
};

bg.liteStorage = (function () {
    var storageKey = 'liteStorage';
    var store = {};
    /**
     * @param {*} value
     */
    var cloneObj = function(value) {
        return JSON.parse(JSON.stringify({w: value})).w;
    };
    /**
     * @param {Function} cb
     */
    var save = function (cb) {
        var obj = {};
        obj[storageKey] = store;
        return mono.storage.set(obj, cb);
    };
    var debounceSave = function () {
        console.error('liteStorage is not set!');
    };
    /**
     * @param {String} key
     * @param {*} value
     */
    var setValue = function (key, value) {
        if (store[key] !== value) {
            store[key] = value;
            debounceSave();
        }
    };
    /**
     * @param {string} key
     * @param {*} defaultValue
     * @returns {*}
     */
    var getValue = function (key, defaultValue) {
        var value = store[key];
        if (value === undefined) {
            value = defaultValue;
        }
        return cloneObj(value);
    };
    /**
     * @returns {string}
     */
    var getStorageKey = function () {
        return storageKey;
    };
    /**
     * @param {Object} storage
     */
    var setStorage = function (storage) {
        store = storage[storageKey] || {};
        debounceSave = mono.debounce(save, 100);
    };
    /**
     * @param {string} key
     * @param {number} time
     */
    var setExpire = function (key, time) {
        return setValue(key, mono.getTime() + time);
    };
    /**
     * @param {string} key
     * @returns {boolean}
     */
    var isTimeout = function (key) {
        return getValue(key, 0) > mono.getTime();
    };
    /**
     * @param {string} key
     * @returns {boolean}
     */
    var isExpire = function (key) {
        return getValue(key, 0) < mono.getTime();
    };
    return {
        getStorageKey: getStorageKey,
        setStorage: setStorage,
        set: setValue,
        get: getValue,
        isTimeout: isTimeout,
        setTimeout: setExpire,
        isExpire: isExpire,
        setExpire: setExpire
    };
})();

mono.onReady(function () {
    bg.prepare(function () {
        bg.run();
    });
});