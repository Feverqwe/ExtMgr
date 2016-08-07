/**
 * Created by Anton on 07.08.2016.
 */
var popup = {
    preferences: {},
    language: {},
    prepare: function (cb) {
        var _this = this;
        return mono.sendMessage({action: 'prepare'}, function (response) {
            mono.extend(_this.preferences, response.preferences);
            mono.extend(_this.language, response.language);

            cb();
        });
    },
    /**
     * @param {number} size
     * @param {[IconInfo]} arr
     */
    getIconUrl: function (size, arr) {
        var url = '';
        var lastSize = 0;

        arr && arr.sort(function (a, b) {
            return a.size > b.size ? 1 : -1;
        }).some(function (item) {
            if (item.size >= size) {
                lastSize = item.size;
                url = item.url;
                return true;
            } else
            if (item.size < size && item.size > lastSize) {
                lastSize = item.size;
                url = item.url;
            }
        });

        if (!url) {
            url = './img/empty.svg'
        }

        return url;
    },
    /**
     * @typedef {Object} IconInfo
     * @property {number} size
     * @property {string} url
     */
    /**
     * @typedef {Object} extensionInfo
     * @property {string} id
     * @property {string} name
     * @property {string} shortName
     * @property {string} description
     * @property {string} version
     * @property {string} [versionName]
     * @property {boolean} mayDisable
     * @property {boolean} enabled
     * @property {string} [disabledReason] // "unknown" or "permissions_increase"
     * @property {boolean} isApp
     * @property {string} type // "extension", "hosted_app", "packaged_app", "legacy_packaged_app", or "theme"
     * @property {string} [appLaunchUrl]
     * @property {string} [homepageUrl]
     * @property {string} [updateUrl]
     * @property {boolean} [offlineEnabled]
     * @property {string} [optionsUrl]
     * @property {[IconInfo]} [icons]
     * @property {[string]} permissions
     * @property {[string]} hostPermissions
     * @property {string} installType // "admin", "development", "normal", "sideload", or "other"
     * @property {string} launchType // "OPEN_AS_REGULAR_TAB", "OPEN_AS_PINNED_TAB", "OPEN_AS_WINDOW", or "OPEN_FULL_SCREEN"
     * @property {[string]} availableLaunchTypes
     */
    /**
     * @param {extensionInfo} extensionInfo
     */
    getListItem: function (extensionInfo) {
        var _this = this;
        var icon = null;
        var checkbox = null;

        var updateNodeState = function () {
            if (!extensionInfo.enabled) {
                node.classList.add('removed');
                checkbox.title = _this.language.enable;
            } else {
                node.classList.remove('removed');
                checkbox.title = _this.language.disable;
            }

            var desc = '';

            desc += 'Name: ' + extensionInfo.name;

            desc += '\n' + 'ID: ' + extensionInfo.id;

            if (extensionInfo.versionName) {
                desc += '\n' + 'Version: ' + extensionInfo.versionName + ' (' + extensionInfo.version + ')';
            } else {
                desc += '\n' + 'Version: ' + extensionInfo.version;
            }

            desc += '\n' + 'Type: ' + extensionInfo.type;

            if (extensionInfo.homepageUrl) {
                desc += '\n' + 'Homepage: ' + extensionInfo.homepageUrl;
            }

            if (extensionInfo.updateUrl) {
                desc += '\n' + 'Update url: ' + extensionInfo.updateUrl;
            }

            if (extensionInfo.offlineEnabled !== undefined) {
                desc += '\n' + 'Offline enabled: ' + extensionInfo.offlineEnabled;
            }

            desc += '\n' + 'Permissions: ' + extensionInfo.permissions.join(', ');
            desc += '\n' + 'Host permissions: ' + extensionInfo.hostPermissions.join(', ');
            desc += '\n' + 'Install type: ' + extensionInfo.installType;
            desc += '\n' + 'Launch type: ' + extensionInfo.launchType;

            if (!extensionInfo.enabled && extensionInfo.disabledReason) {
                desc += '\n' + 'Disabled reason: ' + extensionInfo.disabledReason;
            }

            desc += '\n' + 'Short name: ' + extensionInfo.shortName;
            desc += '\n' + 'Description: ' + extensionInfo.description;

            node.title = desc;
        };

        var node = mono.create('div', {
            class: 'row',
            on: ['click', function (e) {
                checkbox.checked = !checkbox.checked;
                checkbox.dispatchEvent(new CustomEvent('change'));
            }],
            append: [
                mono.create('div', {
                    class: ['cell', 'switch'],
                    append: [
                        checkbox = mono.create('input', {
                            checked: extensionInfo.enabled,
                            disabled: !extensionInfo.mayDisable,
                            type: 'checkbox',
                            on: [
                                ['change', function (e) {
                                    var _this = this;
                                    if (_this.disabled) {
                                        this.checked = extensionInfo.enabled;
                                        return;
                                    }

                                    _this.disabled = true;
                                    return chrome.management.setEnabled(extensionInfo.id, this.checked, function () {
                                        _this.disabled = false;
                                        extensionInfo.enabled = _this.checked;
                                        updateNodeState();
                                    });
                                }],
                                ['click', function (e) {
                                    e.stopPropagation();
                                }]
                            ]
                        })
                    ]
                }),
                icon = mono.create('div', {
                    class: ['cell', 'icon']
                }),
                mono.create('div', {
                    class: ['cell', 'name'],
                    append: [
                        mono.create('span', {
                            text: extensionInfo.name
                        })
                    ]
                }),
                mono.create('div', {
                    class: ['cell', 'action'],
                    on: ['click', function (e) {
                        e.stopPropagation();
                    }],
                    append: [
                        extensionInfo.optionsUrl && mono.create('a', {
                            title: _this.language.options,
                            href: '#options',
                            class: ['btn', 'options'],
                            on: ['click', function (e) {
                                e.preventDefault();
                                var _this = this;
                                chrome.tabs.create({
                                    url: extensionInfo.optionsUrl
                                });
                            }]
                        }),
                        mono.create('a', {
                            title: _this.language.uninstall,
                            href: '#remove',
                            class: ['btn', 'remove'],
                            on: ['click', function (e) {
                                e.preventDefault();
                                var _this = this;
                                if (_this.classList.contains('loading')) {
                                    return;
                                }

                                _this.classList.add('loading');
                                return chrome.management.uninstall(extensionInfo.id, {
                                    showConfirmDialog: true
                                }, function () {
                                    _this.classList.remove('loading');
                                });
                            }]
                        })
                    ]
                })
            ]
        });

        setTimeout(function () {
            icon.appendChild(mono.create('img', {
                src: _this.getIconUrl(19, extensionInfo.icons)
            }));
        }, 0);

        updateNodeState();

        return node;
    },
    /**
     *
     * @param {[extensionInfo]} arr
     * @param {[]} type
     * @param {boolean} [invert]
     * @returns {Element|DocumentFragment}
     */
    getListCategory: function (arr, type, invert) {
        var _this = this;
        var nodeList = [];
        var found;
        var typeList = [];
        arr.forEach(function (item) {
            found = type.indexOf(item.type) !== -1;
            if (invert) {
                found = !found;
            }
            if (found) {
                nodeList.push(_this.getListItem(item));

                if (typeList.indexOf(item.type) === -1) {
                    typeList.push(item.type);
                }
            }
        });

        var categoryName = typeList.map(function (type) {
            return _this.language['extType_' + type] || type;
        }).join(', ');

        if (!nodeList.length) {
            return document.createDocumentFragment();
        } else {
            nodeList.unshift(mono.create('div', {
                class: 'category',
                text: categoryName
            }));
            return mono.create(document.createDocumentFragment(), {
                append: nodeList
            });
        }
    },
    writeList: function () {
        var _this = this;
        var node = mono.create('div', {
            class: 'list'
        });
        chrome.management.getAll(function (result) {
            result.sort(function (a, b) {
                return a.name > b.name ? 1 : -1;
            });
            node.appendChild(_this.getListCategory(result, ['extension']));
            node.appendChild(_this.getListCategory(result, ['hosted_app']));
            node.appendChild(_this.getListCategory(result, ['packaged_app']));
            node.appendChild(_this.getListCategory(result, ['legacy_packaged_app']));
            node.appendChild(_this.getListCategory(result, ['theme']));
            node.appendChild(_this.getListCategory(result, [
                'extension', 'hosted_app', 'packaged_app', 'legacy_packaged_app', 'theme'
            ], true));
        });
        document.body.appendChild(node);
    },
    run: function () {
        this.writeList();

        document.body.classList.remove('loading');
    }
};

mono.onReady(function () {
    popup.prepare(function () {
        popup.run();
    });
});