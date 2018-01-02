const Url = require('url');
const Qs = require('qs');

module.exports = (server) => {

  const onRequest = function (request, reply) {
    const uri = request.raw.req.url
    const parsed = Url.parse(uri, false)
    parsed.query = Qs.parse(parsed.query)
    request.setUrl(parsed)
    return reply.continue()
  }

  server.ext('onRequest', onRequest)
}

