import fs from 'fs'
import {PApi, ThreadListItem, ThreadHistoryItem} from 'index.d'
import {promisify} from 'util'
import {multiInlineReply, inlineReply, promisifyApi, isDef} from './utils'
import login from 'facebook-chat-api'
import TelegramBot from 'node-telegram-bot-api'

const token = isDef(process.env.TELEGRAM_TOKEN, 'token') as string
const chatId = isDef(process.env.TELEGRAM_CHAT_ID, 'chatId') as string
const credentials: any = {
  email: isDef(process.env.FB_EMAIL, 'email'),
  password: isDef(process.env.FB_PASSWORD, 'password'),
}
let currentMessengerConvo = ''
// prettier-ignore
const bot = new TelegramBot(token, {
  polling: true,
  // tslint:disable-next-line
});
(async () => {
  const api = await promisifyApi(login, credentials)
  api.listen(async (err: Error, message: any) => {
    try {
      if (err) {
        throw err
      }
      console.log(message)
      const ret = await api.getUserInfo([message.threadID])
      let name = ''
      for (const prop in ret) {
        if (ret.hasOwnProperty(prop) && ret[prop].name) {
          name = ret[prop].name
        }
      }
      onMessage(message, bot, name)
    } catch (error) {
      console.log(error)
    }
  })
  botListeners(bot, api)
})()

function botListeners(bot: TelegramBot, api: PApi) {
  onText(api)

  bot.on('callback_query', msg => {
    const user = msg.from.id
    const data = msg.data
    if (data && /^\$.+\$/g.test(data)) {
      const id = data.split('$') as ['', string, string]
      console.log(id)
      getConvo(api, id[2], id[1])
    } else {
      bot.sendMessage(user, 'new message' + '\'' + data + '\'')
    }
  })
  bot.on('message', msg => {
    if (msg.text && msg.text[0] !== '/') {
      api.sendMessage(msg.text, currentMessengerConvo)
      bot.sendMessage(chatId, 'Message sent')
    }
  })
}

function onMessage(message: any, bot: TelegramBot, name: string) {
  if (message.type === 'read_receipt') {
    bot.sendMessage(chatId, `(Messenger) New Message from ${name}`)
  } else {
    bot.sendMessage(
      chatId,
      name + ' (Messenger): ' + message.body,
      inlineReply('✏️ Reply to a ' + name, message.threadID),
    )
  }
}

async function getConvo(api: PApi, id: string, action: string) {
  try {
    if (action === 'fetch') {
      const tInfos = await api.getThreadInfo(id)
      const userInfos = await api.getUserInfo(tInfos.participantIDs)
      const data = (await api.getThreadHistory(id, tInfos.unreadCount + 20, null)).map((el: ThreadHistoryItem) => {
        console.log(el)
        return {
          body: `${userInfos[el.senderID].name}: ${el.body || el.snippet || el.attachments[0].url}`,
          senderId: el.senderID,
          isUnread: el.isUnread,
          timestamp: el.timestamp,
        }
      })
      currentMessengerConvo = id
      return await sendResults(data)
    } else if (action === 'mark') {
      await api.markAsRead(id)
    }
  } catch (error) {
    console.error(error)
  }
}
async function getConvoList(api: PApi, n: number = 10, onlyNew = true) {
  try {
    const all: ThreadListItem[] = await api.getThreadList(n, null, [])
    return onlyNew ? all.filter(th => th.unreadCount > 0) : all
  } catch (error) {
    console.error(error)
    return []
  }
}
function starConvo(api: PApi, favs: string[], id: string) {
  const exist = favs.findIndex(el => el === id)
  if (exist) {
    favs.splice(exist, 1)
    promisify(fs.unlink)(`history/${id}`).catch(e => console.error(e))
    return favs
  }
  fs.writeFileSync(`${id}.json`, JSON.stringify([]))
  favs.push(id)
}

function createSnip(m: ThreadListItem) {
  return `Convo: *${m.name ? m.name : 'Multi'}*
_${m.participants.length > 2 ? m.participants.map(p => p.name.replace(/(?!(.+\ ))[a-z]+/g, '')).join(', ') : ''}_

*${m.unreadCount ? '\nNew Messages' : ''}*

_${m.snippet.slice(0, 100)}_`
}
function onText(api: PApi) {
  bot.onText(/\/all/, async (msg: any) => {
    const list = await getConvoList(api, 10)
    console.log(list)
    list.forEach((m: ThreadListItem) => {
      bot.sendMessage(chatId, createSnip(m), {
        parse_mode: 'Markdown',
        reply_markup: multiInlineReply([
          {text: 'Load', data: '$fetch$' + m.threadID, row: 1},
          {text: 'Mark read', data: '$mark$' + m.threadID, row: 1},
        ]),
      })
    })
  })
}

async function sendResults(data: Array<{[key: string]: string | boolean}>) {
  let messages = data.reduce(
    (a, b) => {
      a[0] && a[0].senderId === b.senderId ? (a[0].body += '\n' + b.body) : a.unshift(b)
      return a
    },
    [] as any[],
  )
  if (messages.length > 9) {
    const groupBy = messages.length / 10
    messages = messages.reduce((a, b, i) => {
      const index = Math.floor(i / groupBy)
      a[index] ? (a[index].body += '\n' + b.body) : (a[index] = b)
      return a
    }, [])
  }
  messages.reverse().forEach(msg => bot.sendMessage(chatId, msg.timestamp + '\n' + msg.body))
}
