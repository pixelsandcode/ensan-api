"use strict"
const Joi     = require('joi')
const _       = require('lodash')
const moment  = require('moment')
const Promise = require('bluebird')
const Boom    = require('boom')

module.exports = (server, options) => {

  return class UserDevices extends server.methods.model.ensanBase('application') {
    POSTFIX () {
      return 'devices'
    }

    props () {
      return {
        userKey: {
          schema: Joi.string().regex(new RegExp(options.keyRegexes.users.user)),
          whiteList: true
        },
        devices: {
          schema: Joi.array(),
          whiteList: false
        }
      }
    }

    constructor (doc, userKey) {
      super(doc, UserDevices.prototype._key(userKey))
    }

    _key (userKey) {
      return `${userKey}:${this.POSTFIX()}`
    }

    beforeCreate () {
      this.doc.devices = []
      return true
    }

    addDevice (token) {
      this.doc.devices = _.union(this.doc.devices, [token])
      if(this.doc.devices.length > options.users.devices.max)
        this.doc.devices.splice(0, this.doc.devices.length - options.users.devices.max)
      return this.update()
        .then(() => {
          return this.mask('docKey,userKey,devices')
        })
    }

    static getByUser (userKey) {
      const key = UserDevices.prototype._key(userKey)
      return this.get(key)
    }

    static findByUser (userKeys, raw, asObject) {
      const keys = []
      if(!_.isArray(userKeys)) userKeys = [userKeys]
      _.each(userKeys, userKey => {
        keys.push(UserDevices.prototype._key(userKey))
      })
      return this.find(keys, raw, asObject)
    }
  }
}