import fs from 'fs'
import {promisify} from 'util'
import {Api, PApi} from 'index.d'

export const inlineReply = (text: string, data: any) => {
  return {reply_markup: {inline_keyboard: [[{text, callback_data: data}]]}}
}
export const multiInlineReply = (arr: Array<{text: string; data: any; row: number; url?: string}>) => {
  const matrix: Array<Array<{text: string; callback_data: any; url?: string}>> = [[]]
  for (const b of arr) {
    matrix[b.row] = [
      ...(matrix[b.row] || []),
      {
        text: b.text,
        callback_data: b.data,
        url: b.url,
      },
    ]
  }
  return {inline_keyboard: matrix}
}

const creds = () => {
  if (fs.existsSync('appstate.json')) {
    return {
      appState: JSON.parse(fs.readFileSync('appstate.json', 'utf8')),
    }
  }
}

export async function promisifyApi(login: any, credentials: {email: string; password: string}): Promise<PApi | {}> {
  return new Promise((resolve, reject) => {
    return login(creds() ? creds() : credentials, (err: Error, api: Api) => {
      if (err) {
        return reject(err)
      }
      fs.writeFileSync('appstate.json', JSON.stringify(api.getAppState()))
      return resolve(transformIntoPromise(api))
    })
  })
}

export function isDef(data: any, name: string) {
  if (!data) {
    throw Error(`<${name}> is not defined.`)
  }
  return data
}

function transformIntoPromise(api: Api) {
  return Object.keys(api).reduce(
    (a, b) => {
      if (typeof api[b] === 'function') {
        a[b] = promisify(api[b])
      } else {
        a[b] = api[b]
      }
      return a
    },
    {} as PApi,
  )
}

export function getNameFrom(userInfos: any) {
  let name = ''
  for (const prop in userInfos) {
    if (userInfos.hasOwnProperty(prop) && userInfos[prop].name) {
      name = userInfos[prop].name
    }
  }
  return name
}
