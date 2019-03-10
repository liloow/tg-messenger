export declare interface Api {
  [key: string]: (...args: any) => any | any
  addUserToGroup: (...args: any) => any
  changeAdminStatus: (...args: any) => any
  changeArchivedStatus: (...args: any) => any
  changeBlockedStatus: (...args: any) => any
  changeGroupImage: (...args: any) => any
  changeNickname: (...args: any) => any
  changeThreadColor: (...args: any) => any
  changeThreadEmoji: (...args: any) => any
  createPoll: (...args: any) => any
  deleteMessage: (...args: any) => any
  deleteThread: (...args: any) => any
  forwardAttachment: (...args: any) => any
  getAppState: (...args: any) => any
  getCurrentUserID: (...args: any) => any
  getEmojiUrl: (...args: any) => any
  getFriendsList: (...args: any) => any
  getThreadHistory: (...args: any) => any
  getThreadInfo: (...args: any) => any
  getThreadList: (...args: any) => any
  getThreadPictures: (...args: any) => any
  getUserID: (...args: any) => any
  getUserInfo: (...args: any) => any
  handleMessageRequest: (...args: any) => any
  listen: (...args: any) => any
  logout: (...args: any) => any
  markAsRead: (...args: any) => any
  muteThread: (...args: any) => any
  removeUserFromGroup: (...args: any) => any
  resolvePhotoUrl: (...args: any) => any
  searchForThread: (...args: any) => any
  sendMessage: (...args: any) => any
  sendTypingIndicator: (...args: any) => any
  setMessageReaction: (...args: any) => any
  setTitle: (...args: any) => any
  threadColors: (...args: any) => any
}

export declare interface PApi {
  [key: string]: (...args: any) => Promise<any>
  addUserToGroup: (...args: any) => Promise<any>
  changeAdminStatus: (...args: any) => Promise<any>
  changeArchivedStatus: (...args: any) => Promise<any>
  changeBlockedStatus: (...args: any) => Promise<any>
  changeGroupImage: (...args: any) => Promise<any>
  changeNickname: (...args: any) => Promise<any>
  changeThreadColor: (...args: any) => Promise<any>
  changeThreadEmoji: (...args: any) => Promise<any>
  createPoll: (...args: any) => Promise<any>
  deleteMessage: (...args: any) => Promise<any>
  deleteThread: (...args: any) => Promise<any>
  forwardAttachment: (...args: any) => Promise<any>
  getAppState: (...args: any) => Promise<any>
  getCurrentUserID: (...args: any) => Promise<any>
  getEmojiUrl: (...args: any) => Promise<any>
  getFriendsList: (...args: any) => Promise<any>
  getThreadHistory: (...args: any) => Promise<any>
  getThreadInfo: (...args: any) => Promise<any>
  getThreadList: (...args: any) => Promise<any>
  getThreadPictures: (...args: any) => Promise<any>
  getUserID: (...args: any) => Promise<any>
  getUserInfo: (...args: any) => Promise<any>
  handleMessageRequest: (...args: any) => Promise<any>
  listen: (...args: any) => Promise<any>
  logout: (...args: any) => Promise<any>
  markAsRead: (...args: any) => Promise<any>
  muteThread: (...args: any) => Promise<any>
  removeUserFromGroup: (...args: any) => Promise<any>
  resolvePhotoUrl: (...args: any) => Promise<any>
  searchForThread: (...args: any) => Promise<any>
  sendMessage: (...args: any) => Promise<any>
  sendTypingIndicator: (...args: any) => Promise<any>
  setMessageReaction: (...args: any) => Promise<any>
  setTitle: (...args: any) => Promise<any>
  threadColors: (...args: any) => Promise<any>
}

export interface ThreadListItem {
  threadID: string
  name: string
  unreadCount: number
  messageCount: number
  imageSrc: null
  emoji: null
  color: null
  nicknames: string[]
  muteUntil: null
  participants: [{[key: string]: string}]
  adminIDs: string[]
  folder: string
  isGroup: false
  customizationEnabled: true
  participantAddMode: null
  montageThread: null
  reactionsMuteMode: string
  mentionsMuteMode: string
  isArchived: false
  isSubscribed: true
  timestamp: string
  snippet: string
  snippetAttachments: null
  snippetSender: string
  lastMessageTimestamp: string
  lastReadTimestamp: string
  cannotReplyReason: null
  participantIDs: string[]
  threadType: number
}

export declare interface ThreadHistoryItem {
  type: string
  attachments: any[]
  body: string
  isGroup: boolean
  messageID: string
  senderID: string
  threadID: string
  timestamp: string
  mentions: {[key: string]: string}
  isUnread: boolean
  messageReactions: string[]
  isSponsored: boolean
  snippet?: string
}
