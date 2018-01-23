"use strict"
const _ = require('lodash')
const Boom = require('boom')
const moment = require('moment')

module.exports = (server, options) => {

  const User = require('../models/user')(server, options)

  return {
    signup (request, reply) {
      User.signup(request.payload)
        .then(user => {
          const token = server.methods.jwt.create({
            userKey: user.key,
            scope: 'user'
          })
          const data = user.mask(options.users.masks.details)
          data.auth = user.userMobile.doc.auth
          reply.success(data)
            .header('Authorization', token)
        })
        .catch(err => {
          reply.error(err, {payload: request.payload})
        })
    },
    verify (request, reply) {
      User.verifyPin(request.payload)
        .then(result => {
          return User.get(result.userKey)
        })
        .then(user => {
          const token = server.methods.jwt.create({
            userKey: user.key,
            scope: 'user'
          })
          reply.success(user.mask(options.users.masks.login))
            .header('Authorization', token)
        })
        .catch(err => {
          reply.error(err, {payload: request.payload})
        })
    },
    login (request, reply) {
      const operation = () => {
        if(request.payload.auth)
          return User.checkCredentials(request.payload)
            .then(userKey => {
              return User.get(userKey)
            })
            .then(user => {
              const token = server.methods.jwt.create({
                userKey: user.key,
                scope: 'user'
              })
              return reply.success(user.mask(options.users.masks.login))
                .header('Authorization', token)
            })
        return User.generatePin(request.payload.mobile)
          .then(() => {
            return reply.success()
          })
      }
      operation()
        .catch(err => {
          reply.error(err, {payload: request.payload})
        })
    },
    devices (request, reply) {
      User.addDevice(request.auth.credentials.userKey, request.payload)
        .then(result => {
          reply.success(result)
        })
        .catch(err => {
          reply.error(err, {payload: request.payload})
        })
    },
    logout (request, reply) {
      server.methods.jwt.block(request.auth.token)
      reply.success()
    },
    addGuardian (request, reply) {
      const guardians = request.payload.guardians || [request.payload]
      User.addGuardians(request.auth.credentials.userKey, guardians)
        .then(result => {
          reply.success(result)
        })
        .catch(err => {
          reply.error(err, {payload: request.payload})
        })
    },
    listGuardians (request, reply) {
      User.listGuardians(request.auth.credentials.userKey)
        .then(result => {
          reply.success(result)
        })
        .catch(err => {
          reply.error(err, {})
        })
    },
    deleteGuardian (request, reply) {
      User.deleteGuardian(request.auth.credentials.userKey, request.params.guardianKey)
        .then(result => {
          reply.success(result)
        })
        .catch(err => {
          reply.error(err, {})
        })
    },
    notify (request, reply) {
      User.notifyGuardians(request.auth.credentials.userKey, request.payload)
        .then(result => {
          reply.success(result)
        })
        .catch(err => {
          reply.error(err, {})
        })
    },
    admin: {
      notify (request, reply) {
        if(request.headers.authorization != options.admin.apiKey)
          return reply(Boom.unauthorized('not authorized to access the API'))
        switch(request.payload.type) {
          case options.users.notifications.notifyInviter:
            User.getByMobile(request.params.mobile)
              .then(user => {
                return User.notifyInviter(user.key)
              })
              .then(() => {
                reply.success()
              })
              .catch(err => {
                reply.error(err, {mobile: request.params.mobile, type: request.payload.type})
              })
            break
          case options.users.notifications.inDanger:
          case options.users.notifications.healthy:
            User.getByMobile(request.params.mobile)
              .then(user => {
                user.getDevices()
                  .then(devices => {
                    const message = {
                      notification: {
                        title: options.users.notifyGuardians.title[request.payload.type].replace(':name', user.doc.name),
                        body: options.users.notifyGuardians.body[request.payload.type].replace(':name',  user.doc.name).replace(':at', moment().format('HH:mm')),
                        sound: "default"
                      },
                      data: {
                        type: request.payload.type,
                        lat: 35.6892,
                        lon: 51.3890,
                        userKey: user.key,
                        name: user.doc.name,
                        mobile: user.doc.mobile,
                        at: moment().format()
                      }
                    }
                    if(request.payload.type == options.users.notifyingTypes.inDanger) message.notification.click_action = "DANGER_CATEGORY"
                    server.methods.notification.send(devices, message)
                    reply.success()
                  })
              })
            break
          default:
            reply.error('type is not defined')
        }
      },
      deleteUserByMobile (request, reply) {
        if(request.headers.authorization != options.admin.apiKey)
          return reply(Boom.unauthorized('not authorized to access the API'))
        User.deleteUserByMobile(request.params.mobile)
          .then(() => {
            reply.success()
          })
          .catch(err => {
            reply.error(err, {})
          })
      }
    }
  }
}
