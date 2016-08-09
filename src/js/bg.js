/**
 * Created by Anton on 07.08.2016.
 */
var bg = {
    language: {},
    prepare: function (cb) {
        var _this = this;
        return mono.getLanguage(mono.getLoadedLocale(), function (err, language) {
            if (err) {
                console.error('Load language error!', err);
            } else {
                mono.extend(_this.language, language);
            }

            mono.onMessage.addListener(_this.onMessage);

            cb();
        });
    },
    onMessage: function (msg, response) {
        var _this = bg;
        switch (msg.action) {
            case "prepare":
                response({
                    language: _this.language
                });
                break;
        }
    },
    run: function () {
        var _this = this;
    }
};

mono.onReady(function () {
    bg.prepare(function () {
        bg.run();
    });
});