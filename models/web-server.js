const _ = require('lodash');
const EventEmitter = require('events');
const fs = require('fs');
const http = require('http');
const https = require('https');
const path = require('path');
const url = require('url');

const Configable = require('../mixins/configable');
const Envable = require('../mixins/envable');
const Identifyable = require('../mixins/identifyable');
const Logable = require('../mixins/logable');

const _hooks = Symbol('hooks');
const _processRequest = Symbol('processRequest');
const _server = Symbol('server');
const _shouldIgnoreHooks = Symbol('shouldIgnoreHooks');
const _write = Symbol('write');


const MIMEs = {
  '.ico': 'image/x-icon',
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.css': 'text/css',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.eot': 'appliaction/vnd.ms-fontobject',
  '.ttf': 'aplication/font-sfnt',
};


/**
 *  A simple web server whose primary purpose is to listen for POST requests
 *  and surface the data via events.
 *
 *  @alias WebServer
 *  @memberOf module:slackbot/models
 *  @mixes Configable
 *  @mixes Envable
 *  @mixes Identifyable
 *  @mixes Logable
 *  @extends Configable
 *  @extends Envable
 *  @extends Identifyable
 *  @extends Logable
 *  @extends external:EventEmitter
 *
 *  @param {object}  options
 *  @param {boolean} [options.ssl=false] If `true`, provide a config that
 *                                       contains a pkcs12 file.
 *
 *  @see external:EventEmitter
 */
class WebServer extends Identifyable(Logable(Configable(Envable(EventEmitter)))) {
  /**
   *  Whether or not the server is currently ignoring hooks.
   *  @type {boolean}
   *  @readonly
   */
  get isIgnoringHooks() {
    return this[_shouldIgnoreHooks];
  }

  /**
   *  Whether or not the server is listening for requests. This also acts as
   *  a check to see if the server is running.
   *  @type {boolean}
   *  @readonly
   */
  get isListening() {
    return this[_server].listening;
  }


  constructor({ ssl = false, ...superOpts } = {}) {
    super(superOpts);

    const serverOpts = {
      pfx: this._config.pfx,
      passphrase: this._config.passphrase,
    };

    this[_hooks] = [];
    this[_shouldIgnoreHooks] = false;

    // binding is necessary so `this` works in the callback
    this[_server] = ssl
      ? https.createServer(serverOpts, this[_processRequest].bind(this))
      : http.createServer(this[_processRequest].bind(this));

    this.on('newListener', (event, listener) => {
      if (event && event.startsWith('/')) {
        this._log.debug(`new hook: ${event}`);
        this[_hooks].push({ event, listener });
      } else {
        this._log.warn(`Failed to add hook (${event}). Hooks must begin with a slash (/).`);
      }
    });
  }


  /**
   *  Choose whether or not to ignore incoming webhooks. This is useful if
   *  the bot needs to pause for any reason (e.g. redeploying).
   *
   *  @param {boolean} [shouldIgnore=true]
   */
  ignoreHooks(shouldIgnore = true) {
    this[_shouldIgnoreHooks] = Boolean(shouldIgnore);
  }

  /**
   *  Starts the server. Uses `process.env.PORT` or the port provided by the
   *  config.
   */
  start() {
    const PORT = process.env.PORT || this._config.port; // support heroku

    if (!this.isListening) {
      this[_server].listen(PORT, () => {
        this._log.debug(`Running on port ${PORT}`);
      });
    }
  }

  /**
   *  Stops the server.
   */
  stop() {
    this[_server].close();
  }


  /**
   *  Only GET/POST requests get any attention. The former for documentation, the
   *  latter for incoming webhooks. This method is provided to the server as
   *  the main callback for server requests.
   *
   *  @param {http.ClientRequest}  request
   *  @param {http.ClientResponse} response
   *  @private
   */
  [_processRequest](request, response) {
    const isPOST = request.method === 'POST';
    const isGET = request.method === 'GET';
    const parsedUrl = url.parse(request.url);
    const uri = parsedUrl.pathname;
    const matchedHooks = _.filter(this[_hooks], hook => hook.event === uri);
    let filePath = `./docs${uri}`;

    if (this[_shouldIgnoreHooks]) {
      this._log.debug('Server is currently ignoring hooks...');
    }

    if (isPOST && matchedHooks.length && !this[_shouldIgnoreHooks]) {
      let rawData = '';

      request.on('data', (data) => {
        rawData += data;
      });

      request.on('end', () => {
        const { headers } = request;
        const contentType = headers['content-type'];
        let data;
        let payload;

        if (contentType.includes(MIMEs['.json'])) {
          data = JSON.parse(rawData);
        } else if (contentType.includes('form-urlencoded')) {
          data = url.parse(`/?${rawData}`, true).query;

          if (headers['user-agent'].includes('slack.com') && data.payload) {
            payload = JSON.parse(data.payload);
            delete data.payload;
            Object.assign(data, payload);
          }
        }

        this._log.json('headers:', headers);
        // this._log.debug(`INCOMING REQUEST:  ${uri}`);
        // this._log.debug(`raw data\n${rawData}`);

        const listenerPromise = matchedHooks.reduce((promise, hook) => {
          return promise.then(() => hook.listener({ headers, data, response }))
        }, Promise.resolve());

        listenerPromise
          .then(() => this[_write](response, 200))
          .catch(() => this[_write](response, 500));
      });
    } else if (isGET) {
      fs.exists(filePath, (exist) => {
        if (!exist) {
          // if the file is not found, return 404
          this._log.error(`File ${uri} not found (@${filePath})!`);
          this[_write](response, 404, `File ${uri} not found!`);
          return;
        }
        // if is a directory, then look for index.html
        if (fs.statSync(filePath).isDirectory()) {
          filePath = filePath.replace(/\/?$/, '/index.html');
        }
        // read file from file system
        fs.readFile(filePath, (err, fileContents) => {
          if (err) {
            this._log.error(`Error getting the file: ${err}.`);
            this[_write](response, 500, `Error getting the file: ${err}.`);
          } else {
            this._log.debug(`docs request: ${uri}`);
            // based on the URL path, extract the file extention. e.g. .js, .doc, ...
            const ext = path.parse(filePath).ext;
            // if the file is found, set Content-type and send fileContents
            response.setHeader('Content-Type', MIMEs[ext] || 'text/plain' );
            this[_write](response, 200, fileContents);
          }
        });
      });
    } else {
      this._log.warn(`Forbid access to: ${uri}`);
      this[_write](response, 403); // forbidden
    }
  }

  /**
   *  Shortcut method for writing to and then closing a server response.
   *
   *  @param {http.ClientResponse} response
   *  @param {number}              code     An HTTP status code (e.g. `200`);
   *  @param {string}              data     The data to write.
   *  @private
   */
  [_write](response, code, data) {
    if (!response.finished) {
      response.writeHead(code);
      response.end(data);
    } else {
      this._log.debug(`~_write Tried to send response after response already sent!`);
    }
  }
}


module.exports = WebServer;
