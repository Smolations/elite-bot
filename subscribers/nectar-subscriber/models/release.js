const moment = require('moment');
require('moment-timezone');

/**
 *  @alias Release
 *  @memberOf subscribers.nectar
 *  @private
 */
class Release {
  constructor(opts = {}) {
    this.user = opts.user;
    this.channel = opts.channel;
    this.state = opts.state;
    this.version = opts.version;
    this.merged = opts.merged === true;
  }

  generateVersion(epochTime = Date.now()) {
    return moment(epochTime)
      .tz('America/Denver')
      .format('YYYYMMDD.HHmmss');
  }
}


module.exports = Release;
