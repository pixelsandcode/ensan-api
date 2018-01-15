"use strict"
const Joi         = require('joi')
const _           = require('lodash')
const moment      = require('moment')
const Promise     = require('bluebird')
const Boom        = require('boom')
const bodybuilder = require('bodybuilder')

module.exports = (server, options) => {

  const UserMobile = require('./userMobile')(server, options)
  const UserDevices = require('./userDevices')(server, options)

  return class User extends server.methods.model.ensanBase('application') {
    PREFIX() {
      return 'ea_u'
    }

    props () {
      return {
        name: {
          schema: Joi.string(),
          whiteList: true
        },
        mobile: {
          schema: Joi.string().regex(new RegExp(options.keyRegexes.general.mobile)),
          whiteList: true
        },
        state: {
          schema: Joi.string().valid(_.values(options.users.states)),
          whiteList: false
        },
        guardians: {
          schema: Joi.array().items(Joi.object().keys({
            userKey: Joi.string().regex(new RegExp(options.keyRegexes.users.user)),
            name: Joi.string()
          })),
          whiteList: false
        },
        createdAt: {
          schema: Joi.string(),
          whiteList: false
        },
        joinedAt: {
          schema: Joi.string(),
          whiteList: false
        }
      }
    }

    beforeCreate () {
      this.doc.guardians = []
      this.doc.createdAt = moment().format()
      if(!this.doc.state) this.doc.state = options.users.states.joined
      const userMobile = new UserMobile({mobile: this.doc.mobile, userKey: this.key}, this.doc.mobile)
      const userDevices = new UserDevices({userKey: this.key}, this.key)
      const promises = [
        userMobile.create(),
        userDevices.create()
      ]
      return Promise.all(promises)
        .then(() => {
          this.userMobile = userMobile
          return true
        })
        .catch(err => {
          return false
        })
    }

    static signup ({mobile, name}) {
      return UserMobile.exists(mobile)
        .then(userMobile => {
          if(!userMobile) {
            const user = new User({mobile, name})
            user.doc.joinedAt = moment().format()
            return user.create()
              .then(() => {
                return user
              })
          }
          return User.get(userMobile.doc.userKey)
            .then(user => {
              if(user.doc.state == options.users.states.joined)
                throw Boom.conflict('mobile is already registered')
              user.doc.state = options.users.states.joined
              user.doc.name = name
              user.doc.joinedAt = moment().format()
              return user.update()
                .then(() => {
                  user.userMobile = userMobile
                  return user
                })
            })
        })
    }

    static checkCredentials ({mobile, auth}) {
      return UserMobile.checkCredentials(mobile, auth)
    }

    static generatePin (mobile) {
      return UserMobile.generatePin(mobile)
    }

    static verifyPin ({mobile, pin}) {
      return UserMobile.verifyPin(mobile, pin)
    }

    static addGuardian (userKey, {name, mobile}) {
      return this.get(userKey)
        .then(user => {
          return Promise.all([
            user,
            UserMobile.exists(mobile)
          ])
        })
        .spread((user, userMobile) => {
          const operation = () => {
            if(userMobile) return Promise.resolve(userMobile.doc.userKey)
            const newUser = new User({name, mobile})
            newUser.doc.state = options.users.states.pending
            return newUser.create()
              .then(() => {
                return newUser.key
              })
          }
          return operation()
            .then(userKey => {
              const index = _.findIndex(user.doc.guardians, guardian => {
                return guardian.userKey == userKey
              })
              if(index >= 0)
                throw Boom.conflict('the user already is added as your guardian')
              user.doc.guardians.push({userKey, name})
              return user.update()
                .then(() => {
                  return user.listGuardians(user.key)
                })
                .then(guardians => {
                  return {guardians}
                })
            })
        })
    }

    static listGuardians (userKey) {
      return this.get(userKey)
        .then(user => {
          return user.listGuardians()
        })
    }

    listGuardians () {
      if(this.doc.guardians.length < 1) return Promise.resolve([])
      const userKeys = _.map(this.doc.guardians, 'userKey')
      const keyMap = {}
      _.each(this.doc.guardians, guardian => {
        keyMap[guardian.userKey] = guardian
      })
      return User.find(userKeys, options.users.masks.guardian)
        .then(users => {
          return _.map(users, user => {
            user.name = keyMap[user.docKey].name
            return user
          })
        })
    }

    static addDevice (userKey, {token}) {
      return UserDevices.getByUser(userKey)
        .then(userDevices => {
          return userDevices.addDevice(token)
        })
    }

    static notifyGuardians (userKey, {type, location}) {
      return this.get(userKey)
        .then(user => {
          const {name, mobile, guardians} = user.doc
          if(guardians.length < 1) throw Boom.notFound('there are no guardians')
          const userKeys = _.map(guardians, 'userKey')
          return UserDevices.findByUser(userKeys, 'devices')
            .then(usersDevices => {
              let tokens = []
              let sendTo = 0
              _.each(usersDevices, userDevices => {
                if(userDevices.devices.length > 0) {
                  sendTo++
                  tokens = _.union(tokens, userDevices.devices)
                }
              })
              const message = {
                notification: {
                  title: options.users.notifyGuardians.title[type].replace(':name', name),
                  body: options.users.notifyGuardians.body[type].replace(':name', name).replace(':at', moment().format('HH:mm')),
                  sound: "default"
                },
                data: {
                  type, location, userKey, name, mobile, at: moment().format()
                }
              }
              server.methods.notification.send(tokens, message)
              return {sendTo}
            })
        })
    }

    static notifyInviters (page = 1, size = options.users.inviterListSize) {
      return User.listInviterToNotify(page, size)
        .then(result => {
          const promises = []
          _.each(result.list, inviter => {
            promises.push(this.notifyInviter(inviter.docKey))
          })
          return Promise.all(promises)
            .then(() => {
              if((page * size) < result.total)
                return Promise.delay(options.users.jobsPaginationDelay)
                  .then(() => {
                    return this.notifyInviters(page + 1)
                  })
              return true
            })
        })
    }

    static notifyInviter (userKey) {
      return this.listGuardians(userKey)
        .then(guardians => {
          let allJoined = true
          const pending = []
          _.each(guardians, guardian => {
            if(guardian.state == options.users.states.pending) {
              allJoined = false
              pending.push(guardian.name)
            }
          })
          if(allJoined) return true
          return UserDevices.getByUser(userKey)
            .then(usersDevice => {
              const message = {
                data: {
                  type: options.users.notifyInviter.type,
                  pending
                },
                notification: {
                  title: options.users.notifyInviter.title,
                  body: options.users.notifyInviter.body,
                  sound: "default",
                  icon: "ic_launcher"
                }
              }
              server.methods.notification.send(usersDevice.doc.devices, message)
              return true
            })
        })
    }

    static listInviterToNotify (page = 1, size = options.users.inviterListSize) {
      const weekAgo = moment().subtract(7, 'd')
      const twoWeeksAgo = moment().subtract(14, 'd')
      const threeWeeksAgo = moment().subtract(21, 'd')
      let body = bodybuilder()
        .from((page - 1) * size)
        .size(size)
        .orQuery('range', 'doc.joinedAt', {
          gte: weekAgo.startOf('day').format(),
          lte: weekAgo.endOf('day').format()
        })
        .orQuery('range', 'doc.joinedAt', {
          gte: twoWeeksAgo.startOf('day').format(),
          lte: twoWeeksAgo.endOf('day').format()
        })
        .orQuery('range', 'doc.joinedAt', {
          gte: threeWeeksAgo.startOf('day').format(),
          lte: threeWeeksAgo.endOf('day').format()
        })
        .queryMinimumShouldMatch(1)
      const query = {body: body.build('v1')}
      return this.buildInviterQuery(page, size)
        .then(query => {
          return Promise.resolve(User.search('user', query, {format: true}))
        })
    }

    static getByMobile (mobile) {
      return UserMobile.getByMobile(mobile)
        .then(userMobile => {
          return this.get(userMobile.doc.userKey)
        })
    }
  }
}
