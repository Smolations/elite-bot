const LokiCollection = require('../../../db/loki/loki-collection');

const _defaultPrefs = Symbol('defaultPrefs');

// slack preferences table
// {
//   slackId:,
//   ...,
// }

// users table (index by id, name)
// {
//   ...slackUser
// }

// githubUsers table (index by id, login)
// {
//   slackId,
//   ...githubUser
// }



class UserPrefsCollection extends LokiCollection {
  /**
   *  @type {UserPreferences}
   *  @readonly
   *  @private
   */
  get [_defaultPrefs]() {
    return {
      pref: null,
    };
  }


  constructor({ ...superOpts } = {}) {
    const collectionKey = 'USER_PREFERENCES';
    super({ collectionKey, ...superOpts });
  }

  /**
   *  Creates a new record with default preferences associated with the given
   *  `slackId`.
   *
   *  @param {string} slackId
   *  @returns {UserPreferences}
   *
   *  @throws {TypeError} If `slackId` is missing or invalid.
   */
  add(slackId) {
    if (!slackId) {
      throw new TypeError('UserPrefsCollection#add requires valid slack ID!');
    }

    const newPrefs = Object.assign({ slackId }, this[_defaultPrefs]);
    this._proxied.insert(newPrefs);
    return newPrefs;
  }
}


module.exports = UserPrefsCollection;


/**
 *  @typedef {object} UserPreferences
 *  @property {string} whatever
 */
