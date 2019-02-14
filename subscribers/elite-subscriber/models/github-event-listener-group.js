const ListenerGroup = require('../../../interfaces/listener-group');
const GithubEventListener = require('./github-event-listener');


class GithubEventListenerGroup extends ListenerGroup {
  constructor({ ...superOpts } = {}) {
    super({ itemClass: GithubEventListener, ...superOpts });
  }
}


module.exports = GithubEventListenerGroup;
