"use strict"
const _     = require('lodash')
const Boom  = require('boom')
const later = require('later')

module.exports = (server) => {

  require('./extentions')(server)

  server.method('model.ensanBase', database => {
    return class honeyBase extends server.methods.model.base(database) {
      static get (key, raw) {
        return super.get(key, raw)
          .then(result => {
            if(result instanceof Error) throw Boom.notFound(`Object with key '${key}' not found.`)
            return result
          })
      }

      create (mask) {
        return super.create(mask)
          .then(result => {
            if(result instanceof Error) throw Boom.conflict("The object is already exists.")
            return result
          })
      }

      update (mask) {
        return super.update(mask)
          .then(result => {
            if(result instanceof Error) throw Boom.badImplementation(`Something went wrong while updating object with key ${this.key}.`)
            return result
          })
      }

      remove (key) {
        return super.remove(key)
          .then(result => {
            if(result instanceof Error) throw Boom.badImplementation(`Something went wrong while removing object with key ${key}.`)
            return result
          })
      }

      static find (keys, mask, asObject) {
        return super.find(keys, mask, asObject)
          .then(result => {
            if(result instanceof Error) throw Boom.badImplementation("Something went wrong while finding data.")
            return result
          })
      }
    }
  })

  server.method('common.handleError', (err, data = {}, request, reply) => {
    console.log(err)
    const api = {api: `${request.method.toUpperCase()} ${request.path}`}
    if (err.isBoom) {
      err.data = _.merge(data, api)
      return reply(err)
    }
    _.merge(data, api)
    reply.badImplementation('something went wrong', data)
  })

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