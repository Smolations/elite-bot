const moment = require('moment');
const LokiCollection = require('../../../db/loki/loki-collection');

const _recordTemplate = Symbol('recordTemplate');

/**
 *  @alias Queue
 *  @memberOf subscribers.nectar
 *  @private
 */
class QueueCollection extends LokiCollection {
  constructor({ registry, ...superOpts } = {}) {
    const collectionKey = 'QUEUE';

    super({ collectionKey, ...superOpts });

    // this[_slack] = registry.get('Slack');
  }

  add(slackId) {
    if (!this.isQueued(slackId)) {
      this._log.debug('adding user %s to queue', slackId);
      this.insert(this.getRecordTemplate({ slackId }));
      return true;
    } else {
      this._log.debug('user %s already in queue!', slackId);
    }
    return false;
  }

  shift() {}
  unshift() {}


  remove(release) {
    if (this.isQueued(release)) {
      const index = this._releaseIndex(release);
      this.releases.splice(index, 1);
      return true;
    }
    return false;
  }

  all() {
    return this.find();
  }

  length() {
    return this.count();
  }

  isQueued(slackId) {
    const user = this.findOne({ slackId });
    return (user !== null);
  }

  isCurrent(slackId) {
    const [first] = this.chain().find().limit(1).data();
    return first && first.slackId === slackId;
  }

  currentRelease() {
    return this.releases[0];
  }

  findByUser(user) {
    let targetRelease = null;
    this.releases.forEach((release) => {
      if (release.user === user) {
        targetRelease = release;
      }
    });
    return targetRelease;
  }

  getPosition(release) {
    let position = null;
    if (this.isQueued(release)) {
      const index = this._releaseIndex(release);
      position = index + 1;
    }
    return position;
  }

  setPosition(release, position) {
    if (this.isQueued(release)) {
      if (this.getPosition(release) === position) {
        return false;
      }
      this.remove(release);
      this.releases.splice(position - 1, 0, release);
      return true;
    }
    return false;
  }

  timeSinceQueued(slackId) {
    let since = 'not queued';
    if (this.isQueued(slackId)) {
      const record = this.findOne({ slackId });
      const startTime = moment(record.meta.created);
      since = startTime.from(moment());
    }
    return since;
  }


  // private

  _releaseIndex(release) {
    let releaseIndex = null;
    this.releases.forEach((aRelease, index) => {
      if (aRelease.user === release.user) {
        releaseIndex = index;
      }
    });
    return releaseIndex;
  }

  getListForMessage() {
    const records = this.find();
    const text = records.reduce((list, record, ndx) => {
      let item = `*${ndx + 1}.* <@${record.slackId}>`;
      let meta = '';
      if (ndx === 0) {
        meta += 'active; ';
      }
      meta += `${this.timeSinceQueued(record.slackId)}`;
      item += ` _(${meta})_`;
      return list.concat([item]);
    }, []);
    text.unshift(`Queue contains ${text.length} user(s):`);
    return text.join('\n');
  }

  getRecordTemplate(overrides = {}) {
    const tmpl = {
      slackId: null,
    };
    return Object.assign({}, tmpl, overrides);
  }
}


module.exports = QueueCollection;
