"use strict"
const FCM = require('fcm-push')
const _   = require('lodash')

module.exports = (server, options) => {

  const fcm = new FCM(options.fcm.serverKey)
  const User = require("./models/user")(server, options)

  server.method('notification.send', (tokens, message) => {
    _.each(tokens, token => {
      const newMessage = _.cloneDeep(message)
      newMessage.to = token
      fcm.send(newMessage)
    })
  })

  server.method('users.notifyInviters', () => {
    return User.notifyInviters()
  })
}
