const LokiCollection = require('../../../db/loki/loki-collection');

const _getUsers = Symbol('getUsers');
const _slack = Symbol('slack');


class UsersCollection extends LokiCollection {
  constructor({ registry, ...superOpts } = {}) {
    const collectionKey = 'SLACK_USERS';

    super({ collectionKey, ...superOpts });

    this[_slack] = registry.get('Slack');
    this._init();
  }


  _init() {
    this[_getUsers]()
      .then((users) => {
        this._log.debug(`acquired ${users.length} (filtered) users.`);
        this._log.json(`who be dat?`, { names: users.map(user => user.name).join(', ') });
      });
  }


  // need to figure out how to merge this fetch with existing data so
  // associations (if any) or added fields (if any) are preserved
  async [_getUsers](cursor) {
    const limit = 50; // slack recommends <= 200
    let users = [];

    try {
      const usersResp = await this[_slack].getUsers({ cursor, limit });
      const { members, response_metadata } = usersResp;
      this._log.debug(`fetched ${members.length}/${limit} users...`);

      users.splice(users.length, 0, ...members);

      if (members.length === limit) {
        this._log.debug(`looks like there's another page; recursing...`);
        const nextUsers = await this[_getUsers](response_metadata.next_cursor);
        users.splice(users.length, 0, ...nextUsers);
      }

      return users.filter(user => !user.is_bot && !user.is_app_user && user.name !== 'slackbot');
    } catch (err) {
      this._log.error(err);
    }
  }
}


module.exports = UsersCollection;
