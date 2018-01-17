"use strict"
const _ = require('lodash')
const Boom = require('boom')

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
          const token = server.methods.jwt.create({
            userKey:result.userKey,
            scope: 'user'
          })
          reply.success(result)
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
              const token = server.methods.jwt.create({
                userKey: userKey,
                scope: 'user'
              })
              return reply.success()
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
      User.addGuardian(request.auth.credentials.userKey, request.payload)
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
