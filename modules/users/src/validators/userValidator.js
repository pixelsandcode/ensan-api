"use strict"
const Joi = require('joi')
const _   = require('lodash')

module.exports = (options) => {

  const mobileRegex = new RegExp(options.keyRegexes.general.mobile)
  const userKeyRegex = new RegExp(options.keyRegexes.users.user)
  return {
    signup: {
      payload: {
        name: Joi.string().required(),
        mobile: Joi.string().regex(mobileRegex).required()
      },
      query: {}
    },
    verify: {
      payload: {
        mobile: Joi.string().regex(mobileRegex).required(),
        pin: Joi.number().required()
      },
      query: {}
    },
    login: {
      payload: {
        mobile: Joi.string().regex(mobileRegex).required(),
        auth: Joi.string()
      },
      query: {}
    },
    devices: {
      payload: {
        token: Joi.string().required()
      },
      query: {}
    },
    logout: {
      query: {}
    },
    addGuardian: {
      payload: Joi.alternatives().try(
        Joi.object().keys({
          name: Joi.string().required(),
          mobile: Joi.string().regex(mobileRegex).required()
        }),
        Joi.object().keys({
          guardians: Joi.array().items(
            Joi.object().keys({
              name: Joi.string().required(),
              mobile: Joi.string().regex(mobileRegex).required()
            })
          )
        })
      ),
      query: {}
    },
    listGuardians: {
      query: {}
    },
    deleteGuardian: {
      params: {
        guardianKey: Joi.string().regex(userKeyRegex).required()
      },
      query: {}
    },
    notify: {
      payload: {
        type: Joi.string().valid(_.keys(options.users.notifyingTypes)).required(),
        location: Joi.object().keys({
          lat: Joi.number().required(),
          lon: Joi.number().required()
        })
      },
      query: {}
    },
    admin: {
      notify: {
        payload: {
          type: Joi.string().valid(_.keys(options.users.notifications)).required(),
        },
        query: {}
      },
      deleteUserByMobile: {
        params: {
          mobile: Joi.string().regex(mobileRegex).required()
        },
        query: {}
      }
    }
  }
}
