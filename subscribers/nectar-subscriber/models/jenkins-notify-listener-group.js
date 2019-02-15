const ListenerGroup = require('../../../interfaces/listener-group');
const JenkinsNotifyListener = require('./jenkins-notify-listener');


class JenkinsNotifyListenerGroup extends ListenerGroup {
  constructor({ ...superOpts } = {}) {
    super({ itemClass: JenkinsNotifyListener, ...superOpts });
  }
}


module.exports = JenkinsNotifyListenerGroup;
