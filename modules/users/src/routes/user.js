module.exports = (server, options) => {

  const User = require('../handlers/user')(server, options)
  const UserValidator = require('../validators/userValidator')(options)

  return [
    {
      method: 'POST',
      path: '/v1/user/signup',
      config: {
        handler: User.signup,
        validate: UserValidator.signup,
        description: 'User can sign up to system',
        tags: ['user', 'signup']
      }
    },
    {
      method: 'POST',
      path: '/v1/user/verify',
      config: {
        handler: User.verify,
        validate: UserValidator.verify,
        description: 'User can verify his/her mobile number',
        tags: ['user', 'verify']
      }
    },
    {
      method: 'POST',
      path: '/v1/user/login',
      config: {
        handler: User.login,
        validate: UserValidator.login,
        description: 'User can login to system',
        tags: ['user', 'login']
      }
    },
    {
      method: 'POST',
      path: '/v1/user/devices',
      config: {
        handler: User.devices,
        validate: UserValidator.devices,
        auth: server.methods.auth.user(),
        description: "User can register his/her device's token",
        tags: ['user', 'devices', 'add']
      }
    },
    {
      method: 'POST',
      path: '/v1/user/logout',
      config: {
        handler: User.logout,
        validate: UserValidator.logout,
        auth: server.methods.auth.user(),
        description: "User can logout from system",
        tags: ['user', 'login']
      }
    },
    {
      method: 'POST',
      path: '/v1/user/guardians',
      config: {
        handler: User.addGuardian,
        validate: UserValidator.addGuardian,
        auth: server.methods.auth.user(),
        description: "User can add a guardian",
        tags: ['user', 'guardian', 'add']
      }
    },
    {
      method: 'GET',
      path: '/v1/user/guardians',
      config: {
        handler: User.listGuardians,
        validate: UserValidator.listGuardians,
        auth: server.methods.auth.user(),
        description: "User can see list of his/her guardians",
        tags: ['user', 'guardian', 'list']
      }
    },
    {
      method: 'POST',
      path: '/v1/user/notify',
      config: {
        handler: User.notify,
        validate: UserValidator.notify,
        auth: server.methods.auth.user(),
        description: "User can notify his/her guardians about his/her status",
        tags: ['user', 'notify']
      }
    }
  ]
}
