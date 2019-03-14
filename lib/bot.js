"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const fs_1 = tslib_1.__importDefault(require("fs"));
const node_fetch_1 = tslib_1.__importDefault(require("node-fetch"));
const util_1 = require("util");
const utils_1 = require("./utils");
const facebook_chat_api_1 = tslib_1.__importDefault(require("facebook-chat-api"));
const node_telegram_bot_api_1 = tslib_1.__importDefault(require("node-telegram-bot-api"));
const token = utils_1.isDef(process.env.TELEGRAM_TOKEN, 'token');
const chatId = utils_1.isDef(process.env.TELEGRAM_CHAT_ID, 'chatId');
const serviceChatId = utils_1.isDef(process.env.TELEGRAM_SERVICE_CHAT_ID, 'serviceChatId');
const credentials = {
    email: utils_1.isDef(process.env.FB_EMAIL, 'email'),
    password: utils_1.isDef(process.env.FB_PASSWORD, 'password'),
};
let currentMessengerConvo = '100034595350702';
const bot = new node_telegram_bot_api_1.default(token, {
    polling: true,
});
function init() {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        try {
            const api = yield utils_1.promisifyApi(facebook_chat_api_1.default, credentials);
            listen(api);
            botListeners(bot, api);
        }
        catch (error) {
            console.log(error);
        }
    });
}
function listen(api) {
    api.listen((err, message) => tslib_1.__awaiter(this, void 0, void 0, function* () {
        if (err) {
            throw err;
        }
        console.log(message);
        const name = utils_1.getNameFrom(yield api.getUserInfo([message.threadID]));
        onMessengerMessage(message, bot, name);
    }));
}
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
    bot.on('message', (msg) => tslib_1.__awaiter(this, void 0, void 0, function* () {
        try {
            if (msg.photo) {
                const id = yield bot.getFileLink(msg.photo.reverse()[0].file_id);
                console.log(id);
                const path = '/tmp/' + id.replace(/^.+\//g, '');
                const piped = yield (yield node_fetch_1.default(id)).body;
                piped.pipe(fs_1.default.createWriteStream(path));
                piped.on('end', () => {
                    const mess = { attachment: [fs_1.default.createReadStream(path)] };
                    console.log(mess);
                    api.sendMessage(mess, currentMessengerConvo).then(r => fs_1.default.unlinkSync(path));
                });
            }
            if (msg.text && msg.text[0] !== '/') {
                api.sendMessage(msg.text, currentMessengerConvo);
                bot.sendMessage(serviceChatId, 'Message sent');
            }
        }
        catch (error) {
            console.error(error);
        }
    }));
}
function onMessengerMessage(message, bot, name) {
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
                        senderID: el.senderID,
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
*${m.unreadCount ? '\nNew Messages\n' : ''}*
_${m.snippet.slice(0, 100)}_`;
}
function onText(api) {
    bot.onText(/\/all/, (msg) => tslib_1.__awaiter(this, void 0, void 0, function* () {
        const list = yield getConvoList(api, 10);
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
    bot.onText(/\/reset/, msg => (currentMessengerConvo = ''));
    bot.onText(/\/current/, (msg) => tslib_1.__awaiter(this, void 0, void 0, function* () {
        console.log(msg);
        try {
            if (currentMessengerConvo) {
                const body = yield api.getThreadInfo(currentMessengerConvo);
                body.participantIDs.splice(body.participantIDs.indexOf('812117276'), 1);
                body.participants = yield api.getUserInfo(body.participantIDs);
                if (body.participantIDs.length <= 2) {
                    body.name = (yield api.getUserInfo(body.participantIDs[0]))[body.participantIDs[0]].name;
                }
                bot.sendMessage(serviceChatId, createSnip(body), { parse_mode: 'Markdown' });
                console.log(body);
            }
            else {
                bot.sendMessage(serviceChatId, 'null');
            }
        }
        catch (e) {
            console.error(e);
        }
    }));
}
function sendResults(data) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        buildSingleLongMessage(data).forEach(msg => bot.sendMessage(chatId, msg.timestamp + '\n' + msg.body));
    });
}
function buildSingleLongMessage(messages) {
    const MAX_LENGTH = 4096;
    let currentIndex = -1;
    return messages.reduce((a, b) => {
        console.log(a[currentIndex] ? a[currentIndex].body.length : MAX_LENGTH - b.body.length, b.body);
        b.body = `${new Date(Number(b.timestamp)).toLocaleTimeString('en', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
        })} - ${b.body}`;
        if (a[currentIndex] && a[currentIndex].body.length < MAX_LENGTH - b.body.length) {
            const sameSender = a[currentIndex].senderID === b.senderID;
            a[currentIndex].senderID = b.senderID;
            a[currentIndex].body += '\n' + (sameSender ? '' : '\n') + b.body;
            return a;
        }
        currentIndex += 1;
        a[currentIndex] = b;
        return a;
    }, []);
}
init();
//# sourceMappingURL=bot.js.map