"use strict"
const _     = require('lodash')
const Boom  = require('boom')
const later = require('later')

module.exports = (server) => {

  require('./extentions')(server)

  server.method('auth.user', (mode = 'required') => {
    return {
      strategy: 'jwt',
      access: {
        scope: 'user'
      },
      mode
    }
  })

  server.method('job.recur', (task, schedule, useUtc = false) => {
    if (!useUtc) later.date.localTime()
    later.setInterval(task, later.parse.text(schedule))
  })
}