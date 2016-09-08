/**
 * Created by Anton on 07.08.2016.
 */
var popup = {
    list: [],
    extList: [],
    prepare: function (cb) {
        var _this = this;

        var wait = 1;
        var onReady = function () {
            wait--;
            if (wait === 0) {
                cb();
            }
        };

        wait++;
        chrome.storage.sync.get({
            list: []
        }, function (storage) {
            _this.list = storage.list;

            onReady();
        });

        var selfId = chrome.runtime.id;

        wait++;
        chrome.management.getAll(function (result) {
            result = result.sort(function (a, b) {
                return a.name > b.name ? 1 : -1;
            }).filter(function (item) {
                return item.id !== selfId;
            });

            _this.extList = result;

            onReady();
        });

        onReady();
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
    getGroup: function (prev) {
        while (prev && !prev.classList.contains('group')) {
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
        var checkbox = null;

        var updateNodeState = function () {
            if (!extensionInfo.enabled) {
                node.classList.add('removed');
                checkbox.title = chrome.i18n.getMessage('enable');
            } else {
                node.classList.remove('removed');
                checkbox.title = chrome.i18n.getMessage('disable');
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
                    checkbox.dispatchEvent(new CustomEvent('change', {detail: 'byGroup'}));
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

                                        if (e.detail !== 'byGroup') {
                                            var group = _this.getGroup(node);
                                            group.dispatchEvent(new CustomEvent('updateState'));
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
                mono.create('div', {
                    class: ['cell', 'icon'],
                    title: chrome.i18n.getMessage('move'),
                    append: [
                        mono.create('img', {
                            src: _this.getIconUrl(19, extensionInfo.icons)
                        })
                    ]
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
                            title: chrome.i18n.getMessage('launch'),
                            href: '#launch',
                            class: ['btn', 'launch'],
                            on: ['click', function (e) {
                                e.preventDefault();
                                chrome.management.launchApp(extensionInfo.id);
                            }]
                        }),
                        extensionInfo.optionsUrl && mono.create('a', {
                            title: chrome.i18n.getMessage('options'),
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
                            title: chrome.i18n.getMessage('uninstall'),
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

                                    window.close();
                                });
                            }]
                        })
                    ]
                })
            ]
        });

        updateNodeState();

        return node;
    },
    getGroupItems: function (node) {
        var list = [];
        var childNode = node;
        do {
            childNode = childNode.nextElementSibling;
            if (!childNode || childNode.classList.contains('group')) {
                break;
            }
            list.push(childNode);
        } while (true);
        return list;
    },
    /**
     * @param {string} name
     * @param {boolean} isCustom
     * @param {boolean} isChecked
     * @returns {Element|DocumentFragment}
     */
    createGroupNode: function (name, isCustom, isChecked) {
        var _this = this;
        var checkbox = null;
        var inputNode = null;
        var nameNode = null;
        var save = function () {
            var name = inputNode.value;
            if (!name) {
                return;
            }

            node.classList.remove('edit');
            var textNode = mono.create('span', {
                text: name
            });
            nameNode.replaceChild(textNode, nameNode.firstChild);
            inputNode = null;
            _this.saveList();
        };
        var edit = function () {
            if (!isCustom || node.classList.contains('edit')) {
                return;
            }
            node.classList.add('edit');

            inputNode = mono.create('input', {
                value: nameNode.firstChild.textContent,
                type: 'text',
                on: [
                    ['keyup', function (e) {
                        if (e.keyCode === 13) {
                            save();
                        }
                    }],
                    ['click', function (e) {
                        e.stopPropagation();
                    }]
                ]
            });
            nameNode.replaceChild(inputNode, nameNode.firstChild);

            inputNode.focus();
        };

        var updateNodeState = function () {
            if (!checkbox.checked) {
                checkbox.title = chrome.i18n.getMessage('enable');
            } else {
                checkbox.title = chrome.i18n.getMessage('disable');
            }
        };

        var node = mono.create('div', {
            class: ['row', 'group'],
            on: [
                ['click', function (e) {
                    checkbox.checked = !checkbox.checked;
                    checkbox.dispatchEvent(new CustomEvent('change'));
                }],
                ['updateState', function () {
                    var isChecked = false;
                    var list = _this.getGroupItems(this);
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

                    updateNodeState();
                }]
            ],
            append: [
                mono.create('div', {
                    class: ['cell', 'switch'],
                    append: [
                        checkbox = mono.create('input', {
                            type: 'checkbox',
                            checked: !!isChecked,
                            on: [
                                ['change', function () {
                                    var detail = {state: this.checked};
                                    _this.getGroupItems(node).forEach(function (item) {
                                        item.dispatchEvent(new CustomEvent('changeState', {
                                            detail: detail
                                        }));
                                    });

                                    updateNodeState();
                                }],
                                ['click', function (e) {
                                    e.stopPropagation();
                                }]
                            ]
                        })
                    ]
                }),
                nameNode = mono.create('div', {
                    class: ['cell', 'name'],
                    append: [
                        mono.create('span', {
                            text: name
                        })
                    ]
                }),
                mono.create('div', {
                    class: ['cell', 'action'],
                    on: ['click', function (e) {
                        e.stopPropagation();
                    }],
                    append: [
                        isCustom && mono.create('a', {
                            title: chrome.i18n.getMessage('edit'),
                            href: '#edit',
                            class: ['btn', 'edit'],
                            on: ['click', function (e) {
                                e.preventDefault();
                                edit();
                            }]
                        }),
                        isCustom && mono.create('a', {
                            title: chrome.i18n.getMessage('save'),
                            href: '#save',
                            class: ['btn', 'save'],
                            on: ['click', function (e) {
                                e.preventDefault();
                                save();
                            }]
                        })
                    ]
                })
            ]
        });

        if (isCustom) {
            node.classList.add('custom_group');
        }

        updateNodeState();

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
    getListGroup: function (arr, type, invert, name) {
        var _this = this;
        var nodeList = [];
        var found;
        var typeList = [];
        var hasEnabled = false;
        arr.forEach(function (item) {
            found = type.indexOf(item.type) !== -1;
            if (invert) {
                found = !found;
            }
            if (found) {
                if (item.enabled) {
                    hasEnabled = true;
                }

                nodeList.push(_this.getListItem(item));

                if (typeList.indexOf(item.type) === -1) {
                    typeList.push(item.type);
                }
            }
        });

        var map = {
            extension: 'Extensions',
            hosted_app: 'Hosted apps',
            packaged_app: 'Packaged apps',
            legacy_packaged_app: 'Legacy packaged apps',
            theme: 'Themes'
        };

        var groupName = name || typeList.map(function (type) {
            return map[type] || type;
        }).join(', ');

        if (!nodeList.length) {
            return document.createDocumentFragment();
        } else {
            nodeList.unshift(this.createGroupNode(groupName, !!name, hasEnabled));
            return mono.create(document.createDocumentFragment(), {
                append: nodeList
            });
        }
    },
    saveList: function () {
        var _this = this;
        var list = [];
        [].slice.call(document.querySelectorAll('.list > .row.custom_group')).forEach(function (group) {
            var name = group.querySelector('.name span').textContent;
            var ids = _this.getGroupItems(group).map(function (item) {
                return item.dataset.id;
            });
            list.push({name: name, ids: ids});
        });
        if (JSON.stringify(_this.list) !== JSON.stringify(list)) {
            _this.list = list;
            chrome.storage.sync.set({
                list: list
            });
        }
    },
    getIdList: function(list) {
        var idObj = {};
        list.forEach(function (item) {
            idObj[item.id] = item;
        });
        return idObj;
    },
    writeList: function () {
        var _this = this;
        var node = mono.create('div', {
            class: 'list'
        });

        var extList = _this.extList;
        var idList = _this.getIdList(extList);

        _this.list.forEach(function (group) {
            var list = [];
            group.ids.forEach(function (id) {
                var item = idList[id];
                if (item) {
                    list.push(item);
                    var pos = extList.indexOf(item);
                    extList.splice(pos, 1);
                }
            });
            node.appendChild(_this.getListGroup(list, [], true, group.name));
        });

        node.appendChild(_this.getListGroup(extList, ['extension']));
        node.appendChild(_this.getListGroup(extList, ['hosted_app']));
        node.appendChild(_this.getListGroup(extList, ['packaged_app']));
        node.appendChild(_this.getListGroup(extList, ['legacy_packaged_app']));
        node.appendChild(_this.getListGroup(extList, ['theme']));
        node.appendChild(_this.getListGroup(extList, [
            'extension', 'hosted_app', 'packaged_app', 'legacy_packaged_app', 'theme'
        ], true));

        document.body.appendChild(node);
    },
    initSort: function (Sortable) {
        var _this = this;
        var list = document.querySelector('.list');

        var startGroup = null;
        Sortable.create(list, {
            handle: '.cell.icon',
            onStart: function (evt) {
                var item = evt.item;
                startGroup = _this.getGroup(item);
                list.classList.add('is-sortable');
            },
            onEnd: function (evt) {
                var item = evt.item;
                list.classList.remove('is-sortable');
                var endGroup = _this.getGroup(item);
                if (!endGroup) {
                    endGroup = _this.createGroupNode('Group', true, false);
                    list.insertBefore(endGroup, item);
                }
                startGroup.dispatchEvent(new CustomEvent('updateState'));
                endGroup.dispatchEvent(new CustomEvent('updateState'));

                _this.saveList();
            }
        });
    },
    run: function () {
        var _this = this;
        _this.writeList();

        document.body.classList.remove('loading');

        setTimeout(function () {
            document.head.appendChild(mono.create('script', {
                src: './lib/require.min.js',
                on: ['load', function () {
                    requirejs.config({
                        baseUrl: "./lib",
                        paths: {
                            sortable: 'sortable.min'
                        }
                    });
                    require(['sortable'], function (Sortable) {
                        _this.initSort(Sortable);
                    });
                }]
            }));
        }, 250);
    }
};

mono.onReady(function () {
    popup.prepare(function () {
        popup.run();
    });
});