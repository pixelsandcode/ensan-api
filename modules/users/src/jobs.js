"use strict"
const _       = require('lodash')
const Promise = require('bluebird')

module.exports = (server, options) => {

  server.methods.job.recur(
    server.methods.users.notifyInviters,
    options.users.jobs.notifyInviters
  )

}