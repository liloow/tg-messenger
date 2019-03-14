import fs from 'fs'
import fetch from 'node-fetch'
import {PApi, ThreadListItem, ThreadHistoryItem} from 'index.d'
import {promisify} from 'util'
import {multiInlineReply, inlineReply, promisifyApi, isDef, getNameFrom} from './utils'
import login from 'facebook-chat-api'
import TelegramBot from 'node-telegram-bot-api'

const token = isDef(process.env.TELEGRAM_TOKEN, 'token') as string
const chatId = isDef(process.env.TELEGRAM_CHAT_ID, 'chatId') as string
const serviceChatId = isDef(process.env.TELEGRAM_SERVICE_CHAT_ID, 'serviceChatId') as string
const credentials: any = {
  email: isDef(process.env.FB_EMAIL, 'email'),
  password: isDef(process.env.FB_PASSWORD, 'password'),
}
let currentMessengerConvo: string = '100034595350702'
const bot = new TelegramBot(token, {
  polling: true,
})

async function init() {
  try {
    const api = await promisifyApi(login, credentials)
    listen(api)
    botListeners(bot, api)
  } catch (error) {
    console.log(error)
  }
}

function listen(api: PApi) {
  api.listen(async (err: Error, message: any) => {
    if (err) {
      throw err
    }
    console.log(message)
    const name = getNameFrom(await api.getUserInfo([message.threadID]))
    onMessengerMessage(message, bot, name)
  })
}

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
  bot.on('message', async msg => {
    try {
      if (msg.photo) {
        const id = await bot.getFileLink(msg.photo.reverse()[0].file_id)
        console.log(id)
        const path = '/tmp/' + id.replace(/^.+\//g, '')
        const piped = await (await fetch(id)).body
        piped.pipe(fs.createWriteStream(path))
        piped.on('end', () => {
          const mess = {attachment: [fs.createReadStream(path)]}
          console.log(mess)
          api.sendMessage(mess, currentMessengerConvo).then(r => fs.unlinkSync(path))
        })
      }
      if (msg.text && msg.text[0] !== '/') {
        api.sendMessage(msg.text, currentMessengerConvo)
        bot.sendMessage(serviceChatId, 'Message sent')
      }
    } catch (error) {
      console.error(error)
    }
  })
}

function onMessengerMessage(message: any, bot: TelegramBot, name: string) {
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
          senderID: el.senderID,
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
*${m.unreadCount ? '\nNew Messages\n' : ''}*
_${m.snippet.slice(0, 100)}_`
}
function onText(api: PApi) {
  bot.onText(/\/all/, async (msg: any) => {
    const list = await getConvoList(api, 10)
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
  bot.onText(/\/reset/, msg => (currentMessengerConvo = ''))
  bot.onText(/\/current/, async msg => {
    console.log(msg)
    try {
      if (currentMessengerConvo) {
        const body = await api.getThreadInfo(currentMessengerConvo)
        body.participantIDs.splice(body.participantIDs.indexOf('812117276'), 1)
        body.participants = await api.getUserInfo(body.participantIDs)
        if (body.participantIDs.length <= 2) {
          body.name = (await api.getUserInfo(body.participantIDs[0]))[body.participantIDs[0]].name
        }
        bot.sendMessage(serviceChatId, createSnip(body as any), {parse_mode: 'Markdown'})
        console.log(body)
      } else {
        bot.sendMessage(serviceChatId, 'null')
      }
    } catch (e) {
      console.error(e)
    }
  })
}

async function sendResults(data: ThreadHistoryItem[]) {
  buildSingleLongMessage(data).forEach(msg => bot.sendMessage(chatId, msg.timestamp + '\n' + msg.body))
}

function buildSingleLongMessage(messages: ThreadHistoryItem[]) {
  const MAX_LENGTH = 4096
  let currentIndex = -1
  return messages.reduce(
    (a, b) => {
      console.log(a[currentIndex] ? a[currentIndex].body.length : MAX_LENGTH - b.body.length, b.body)
      b.body = `${new Date(Number(b.timestamp)).toLocaleTimeString('en', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })} - ${b.body}`
      if (a[currentIndex] && a[currentIndex].body.length < MAX_LENGTH - b.body.length) {
        const sameSender = a[currentIndex].senderID === b.senderID
        a[currentIndex].senderID = b.senderID
        a[currentIndex].body += '\n' + (sameSender ? '' : '\n') + b.body
        return a
      }
      currentIndex += 1
      a[currentIndex] = b
      return a
    },
    [] as ThreadHistoryItem[],
  )
}

init()
