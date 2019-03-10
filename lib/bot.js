"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const fs_1 = tslib_1.__importDefault(require("fs"));
const util_1 = require("util");
const utils_1 = require("./utils");
const facebook_chat_api_1 = tslib_1.__importDefault(require("facebook-chat-api"));
const node_telegram_bot_api_1 = tslib_1.__importDefault(require("node-telegram-bot-api"));
const token = utils_1.isDef(process.env.TELEGRAM_TOKEN, 'token');
const chatId = utils_1.isDef(process.env.TELEGRAM_CHAT_ID, 'chatId');
const credentials = {
    email: utils_1.isDef(process.env.FB_EMAIL, 'email'),
    password: utils_1.isDef(process.env.FB_PASSWORD, 'password'),
};
let currentMessengerConvo = '';
// prettier-ignore
const bot = new node_telegram_bot_api_1.default(token, {
    polling: true,
});
(() => tslib_1.__awaiter(this, void 0, void 0, function* () {
    const api = yield utils_1.promisifyApi(facebook_chat_api_1.default, credentials);
    api.listen((err, message) => tslib_1.__awaiter(this, void 0, void 0, function* () {
        try {
            if (err) {
                throw err;
            }
            console.log(message);
            const ret = yield api.getUserInfo([message.threadID]);
            let name = '';
            for (const prop in ret) {
                if (ret.hasOwnProperty(prop) && ret[prop].name) {
                    name = ret[prop].name;
                }
            }
            onMessage(message, bot, name);
        }
        catch (error) {
            console.log(error);
        }
    }));
    botListeners(bot, api);
}))();
function botListeners(bot, api) {
    onText(api);
    bot.on('callback_query', msg => {
        const user = msg.from.id;
        const data = msg.data;
        if (data && /^\$.+\$/g.test(data)) {
            const id = data.split('$');
            console.log(id);
            getConvo(api, id[2], id[1]);
        }
        else {
            bot.sendMessage(user, 'new message' + '\'' + data + '\'');
        }
    });
    bot.on('message', msg => {
        if (msg.text && msg.text[0] !== '/') {
            api.sendMessage(msg.text, currentMessengerConvo);
            bot.sendMessage(chatId, 'Message sent');
        }
    });
}
function onMessage(message, bot, name) {
    if (message.type === 'read_receipt') {
        bot.sendMessage(chatId, `(Messenger) New Message from ${name}`);
    }
    else {
        bot.sendMessage(chatId, name + ' (Messenger): ' + message.body, utils_1.inlineReply('✏️ Reply to a ' + name, message.threadID));
    }
}
function getConvo(api, id, action) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        try {
            if (action === 'fetch') {
                const tInfos = yield api.getThreadInfo(id);
                const userInfos = yield api.getUserInfo(tInfos.participantIDs);
                const data = (yield api.getThreadHistory(id, tInfos.unreadCount + 20, null)).map((el) => {
                    console.log(el);
                    return {
                        body: `${userInfos[el.senderID].name}: ${el.body || el.snippet || el.attachments[0].url}`,
                        senderId: el.senderID,
                        isUnread: el.isUnread,
                        timestamp: el.timestamp,
                    };
                });
                currentMessengerConvo = id;
                return yield sendResults(data);
            }
            else if (action === 'mark') {
                yield api.markAsRead(id);
            }
        }
        catch (error) {
            console.error(error);
        }
    });
}
function getConvoList(api, n = 10, onlyNew = true) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        try {
            const all = yield api.getThreadList(n, null, []);
            return onlyNew ? all.filter(th => th.unreadCount > 0) : all;
        }
        catch (error) {
            console.error(error);
            return [];
        }
    });
}
function starConvo(api, favs, id) {
    const exist = favs.findIndex(el => el === id);
    if (exist) {
        favs.splice(exist, 1);
        util_1.promisify(fs_1.default.unlink)(`history/${id}`).catch(e => console.error(e));
        return favs;
    }
    fs_1.default.writeFileSync(`${id}.json`, JSON.stringify([]));
    favs.push(id);
}
function createSnip(m) {
    return `Convo: *${m.name ? m.name : 'Multi'}*
_${m.participants.length > 2 ? m.participants.map(p => p.name.replace(/(?!(.+\ ))[a-z]+/g, '')).join(', ') : ''}_

*${m.unreadCount ? '\nNew Messages' : ''}*

_${m.snippet.slice(0, 100)}_`;
}
function onText(api) {
    bot.onText(/\/all/, (msg) => tslib_1.__awaiter(this, void 0, void 0, function* () {
        const list = yield getConvoList(api, 10);
        console.log(list);
        list.forEach((m) => {
            bot.sendMessage(chatId, createSnip(m), {
                parse_mode: 'Markdown',
                reply_markup: utils_1.multiInlineReply([
                    { text: 'Load', data: '$fetch$' + m.threadID, row: 1 },
                    { text: 'Mark read', data: '$mark$' + m.threadID, row: 1 },
                ]),
            });
        });
    }));
}
function sendResults(data) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        let messages = data.reduce((a, b) => {
            a[0] && a[0].senderId === b.senderId ? (a[0].body += '\n' + b.body) : a.unshift(b);
            return a;
        }, []);
        if (messages.length > 9) {
            const groupBy = messages.length / 10;
            messages = messages.reduce((a, b, i) => {
                const index = Math.floor(i / groupBy);
                a[index].body ? (a[index].body += '\n' + b.body) : (a[index] = b);
                return a;
            }, []);
        }
        messages.reverse().forEach(msg => bot.sendMessage(chatId, msg.timestamp + '\n' + msg.body));
    });
}
//# sourceMappingURL=bot.js.map