/**
 * Created by Anton on 07.08.2016.
 */
var popup = {
    list: [],
    language: {},
    prepare: function (cb) {
        var _this = this;
        return mono.sendMessage({action: 'prepare'}, function (response) {
            mono.extend(_this.list, response.list);
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
     * @param {Node} prev
     * @returns {Node}
     */
    getCategory: function (prev) {
        while (prev && !prev.classList.contains('category')) {
            prev = prev.previousElementSibling;
        }
        return prev;
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
     * @property {boolean} offlineEnabled
     * @property {string} optionsUrl
     * @property {[IconInfo]} [icons]
     * @property {[string]} permissions
     * @property {[string]} hostPermissions
     * @property {string} installType // "admin", "development", "normal", "sideload", or "other"
     * @property {string} [launchType] // "OPEN_AS_REGULAR_TAB", "OPEN_AS_PINNED_TAB", "OPEN_AS_WINDOW", or "OPEN_FULL_SCREEN"
     * @property {[string]} [availableLaunchTypes]
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

            desc += '\n' + 'Offline enabled: ' + extensionInfo.offlineEnabled;

            if (extensionInfo.appLaunchUrl) {
                desc += '\n' + 'App launch url: ' + extensionInfo.appLaunchUrl;
            }

            desc += '\n' + 'Permissions: ' + extensionInfo.permissions.join(', ');
            desc += '\n' + 'Host permissions: ' + extensionInfo.hostPermissions.join(', ');
            desc += '\n' + 'Install type: ' + extensionInfo.installType;

            if (extensionInfo.launchType) {
                desc += '\n' + 'Launch type: ' + extensionInfo.launchType;
            }

            if (!extensionInfo.enabled && extensionInfo.disabledReason) {
                desc += '\n' + 'Disabled reason: ' + extensionInfo.disabledReason;
            }

            desc += '\n' + 'Short name: ' + extensionInfo.shortName;
            desc += '\n' + 'Description: ' + extensionInfo.description;

            node.title = desc;
        };

        var node = mono.create('div', {
            class: 'row',
            data: {
                id: extensionInfo.id
            },
            on: [
                ['click', function (e) {
                    checkbox.checked = !checkbox.checked;
                    checkbox.dispatchEvent(new CustomEvent('change'));
                }],
                ['changeState', function (e) {
                    checkbox.checked = e.detail.state;
                    checkbox.dispatchEvent(new CustomEvent('change', {detail: 'byCategory'}));
                }]
            ],
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
                                    var __this = this;
                                    if (__this.disabled) {
                                        this.checked = extensionInfo.enabled;
                                        return;
                                    }

                                    __this.disabled = true;
                                    return chrome.management.setEnabled(extensionInfo.id, this.checked, function () {
                                        __this.disabled = false;
                                        extensionInfo.enabled = __this.checked;
                                        updateNodeState();

                                        if (e.detail !== 'byCategory') {
                                            var category = _this.getCategory(node);
                                            category.dispatchEvent(new CustomEvent('updateState'));
                                        }
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
                        extensionInfo.launchType && mono.create('a', {
                            title: _this.language.launch,
                            href: '#launch',
                            class: ['btn', 'launch'],
                            on: ['click', function (e) {
                                e.preventDefault();
                                chrome.management.launchApp(extensionInfo.id);
                            }]
                        }),
                        extensionInfo.optionsUrl && mono.create('a', {
                            title: _this.language.options,
                            href: '#options',
                            class: ['btn', 'options'],
                            on: ['click', function (e) {
                                e.preventDefault();
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
    getCategoryItems: function (node) {
        var list = [];
        var childNode = node;
        do {
            childNode = childNode.nextElementSibling;
            if (!childNode || childNode.classList.contains('category')) {
                break;
            }
            list.push(childNode);
        } while (true);
        return list;
    },
    onCategoryCheckboxChange: function (node, e) {
        var _this = popup;
        var detail = {state: this.checked};
        _this.getCategoryItems(node).forEach(function (item) {
            item.dispatchEvent(new CustomEvent('changeState', {
                detail: detail
            }));
        });
    },
    /**
     * @param {string} name
     * @param {boolean} isCustom
     * @returns {Element|DocumentFragment}
     */
    createCategoryNode: function (name, isCustom) {
        var _this = this;
        var checkbox = null;
        var node = mono.create('div', {
            class: ['row', 'category'],
            on: ['updateState', function () {
                var isChecked = false;
                var list = _this.getCategoryItems(this);
                list.some(function (item) {
                    if (!item.classList.contains('removed')) {
                        isChecked = true;
                        return true;
                    }
                });
                checkbox.checked = isChecked;
                if (list.length === 0) {
                    node.parentNode.removeChild(node);
                }
            }],
            append: [
                mono.create('div', {
                    class: ['cell', 'switch'],
                    append: [
                        checkbox = mono.create('input', {
                            type: 'checkbox',
                            on: ['change', function () {
                                _this.onCategoryCheckboxChange.call(this, node);
                            }]
                        })
                    ]
                }),
                mono.create('div', {
                    class: 'cell name',
                    append: mono.create('span', {
                        text: name
                    })
                })
            ]
        });
        if (isCustom) {
            node.classList.add('custom_category');
        }
        return node;
    },
    /**
     *
     * @param {[extensionInfo]} arr
     * @param {[]} type
     * @param {boolean} [invert]
     * @param {string} [name]
     * @returns {Element|DocumentFragment}
     */
    getListCategory: function (arr, type, invert, name) {
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

        var categoryName = name || typeList.map(function (type) {
            return _this.language['extType_' + type] || type;
        }).join(', ');

        if (!nodeList.length) {
            return document.createDocumentFragment();
        } else {
            nodeList.unshift(this.createCategoryNode(categoryName, !!name));
            return mono.create(document.createDocumentFragment(), {
                append: nodeList
            });
        }
    },
    saveList: function () {
        var _this = this;
        var list = [];
        [].slice.call(document.querySelectorAll('.list > .row.custom_category')).forEach(function (category) {
            var name = category.querySelector('.name span').textContent;
            var ids = _this.getCategoryItems(category).map(function (item) {
                return item.dataset.id;
            });
            list.push({name: name, ids: ids});
        });
        mono.sendMessage({
            action: 'list',
            list: list
        });
    },
    writeList: function () {
        var _this = this;
        var node = mono.create('div', {
            class: 'list'
        });
        var excludeIdList = [chrome.runtime.id];
        chrome.management.getAll(function (result) {
            result = result.sort(function (a, b) {
                return a.name > b.name ? 1 : -1;
            }).filter(function (item) {
                return excludeIdList.indexOf(item.id) === -1;
            });

            _this.list.forEach(function (item) {
                var list = result.slice(0).filter(function (_item) {
                    var exists = item.ids.indexOf(_item.id) !== -1;
                    if (exists) {
                        var pos = result.indexOf(_item);
                        result.splice(pos, 1);
                    }
                    return exists;
                });
                var category = _this.getListCategory(list, [], true, item.name);
                node.appendChild(category);
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
        setTimeout(function () {
            [].slice.call(node.querySelectorAll('.category')).forEach(function (category) {
                category.dispatchEvent(new CustomEvent('updateState'));
            });
        }, 100);
    },
    initSort: function () {
        var _this = this;
        var list = document.querySelector('.list');

        var startCategory = null;
        $(list).sortable({
            handle: '.cell.icon',
            start: function (e, ui) {
                var item = ui.item.get(0);
                startCategory = _this.getCategory(item);
                list.classList.add('is-sortable');
            },
            stop: function (e, ui) {
                var item = ui.item.get(0);
                list.classList.remove('is-sortable');
                var endCategory = _this.getCategory(item);
                if (!endCategory) {
                    endCategory = _this.createCategoryNode('Category', true);
                    list.insertBefore(endCategory, item);
                }
                startCategory.dispatchEvent(new CustomEvent('updateState'));
                endCategory.dispatchEvent(new CustomEvent('updateState'));

                _this.saveList();
            }
        });
    },
    run: function () {
        var _this = this;
        _this.writeList();

        setTimeout(function () {
            document.head.appendChild(mono.create('script', {
                src: './lib/require.min.js',
                on: ['load', function () {
                    requirejs.config({
                        baseUrl: "./lib",
                        paths: {
                            jquery: 'jquery-3.1.0.min',
                            jqueryui: 'jquery-ui.min'
                        }
                    });
                    require(['jquery', 'jqueryui'], function (jq) {
                        _this.initSort();
                    });
                }]
            }));
        }, 250);

        document.body.classList.remove('loading');
    }
};

mono.onReady(function () {
    popup.prepare(function () {
        popup.run();
    });
});