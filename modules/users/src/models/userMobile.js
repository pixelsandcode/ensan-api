"use strict"
const Joi  = require('joi')
const _    = require('lodash')
const uuid = require('node-uuid')
const Boom = require('boom')
const Kavenegar = require('kavenegar');

module.exports = (server, options) => {
  return class UserMobile extends server.methods.model.base('application') {
    PREFIX() {
      return 'ea_um'
    }

    props () {
      return {
        mobile: {
          schema: Joi.string().regex(new RegExp(options.keyRegexes.general.mobile)),
          whiteList: true
        },
        userKey: {
          schema: Joi.string().regex(new RegExp(options.keyRegexes.users.user)),
          whiteList: true
        },
        auth: {
          schema: Joi.string(),
          whiteList: false
        },
        verificationPin: {
          schema: Joi.number(),
          whiteList: false
        }
      }
    }

    constructor (doc, mobile) {
      super(doc, UserMobile.prototype._key(mobile))
    }

    _key (mobile) {
      if(mobile.charAt(0) == '0')
        mobile = `+98${mobile.substring(1)}`
      return `${this.PREFIX()}:${mobile}`
    }

    beforeCreate () {
      this.doc.auth = uuid.v4()
      return true
    }

    static getByMobile (mobile) {
      const key = UserMobile.prototype._key(mobile)
      return this.get(key)
    }

    static checkCredentials (mobile, auth) {
      return this.getByMobile(mobile)
        .then(userMobile => {
          if(userMobile.doc.auth != auth)
            throw Boom.unauthorized('credentials are not match')
          return userMobile.doc.userKey
        })
    }

    static generatePin (mobile) {
      return this.getByMobile(mobile)
        .then(userMobile => {
          userMobile.doc.verificationPin = _.random(1000, 9999)
          return userMobile.update()
            .then(() => {
              const smsApi = Kavenegar.KavenegarApi({apikey: options.kavenegar.apiKey})
              smsApi.VerifyLookup({
                token: userMobile.doc.verificationPin,
                template: options.kavenegar.templates.verification,
                receptor: mobile
              });
              console.log(userMobile.doc.verificationPin, ">>>>>>>>>>>>> sms")
              return true
            })
        })
    }

    static verifyPin (mobile, pin) {
      return this.getByMobile(mobile)
        .then(userMobile => {
          if(!userMobile.doc.verificationPin || userMobile.doc.verificationPin != pin)
            throw Boom.forbidden('access denied')
          delete userMobile.doc.verificationPin
          return userMobile.update()
            .then(() => {
              return userMobile.mask('userKey,auth')
            })
        })
    }

    static exists (mobile) {
      return this.getByMobile(mobile)
        .catch(() => {
          return false
        })
    }
  }
}