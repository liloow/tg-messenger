"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const fs_1 = tslib_1.__importDefault(require("fs"));
const util_1 = require("util");
exports.inlineReply = (text, data) => {
    return { reply_markup: { inline_keyboard: [[{ text, callback_data: data }]] } };
};
exports.multiInlineReply = (arr) => {
    const matrix = [[]];
    for (const b of arr) {
        matrix[b.row] = [...(matrix[b.row] || []), { text: b.text, callback_data: b.data }];
    }
    return { inline_keyboard: matrix };
};
const creds = () => {
    if (fs_1.default.existsSync('appstate.json')) {
        return {
            appState: JSON.parse(fs_1.default.readFileSync('appstate.json', 'utf8')),
        };
    }
};
function promisifyApi(login, credentials) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        try {
            const api = yield util_1.promisify(login)(creds() ? creds() : credentials);
            fs_1.default.writeFileSync('appstate.json', JSON.stringify(api.getAppState()));
            return Object.keys(api).reduce((a, b) => {
                if (typeof api[b] === 'function') {
                    a[b] = util_1.promisify(api[b]);
                }
                else {
                    a[b] = api[b];
                }
                return a;
            }, {});
        }
        catch (error) {
            console.log(error);
            throw error;
        }
    });
}
exports.promisifyApi = promisifyApi;
function isDef(data, name) {
    if (!data) {
        throw Error(`<${name}> is not defined.`);
    }
    return data;
}
exports.isDef = isDef;
//# sourceMappingURL=utils.js.map