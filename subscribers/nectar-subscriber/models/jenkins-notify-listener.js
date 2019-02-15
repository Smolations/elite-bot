const Listener = require('../../../interfaces/listener');
const Registry = require('../../../models/registry');


class JenkinsNotifyListener extends Listener {
  static get [Symbol.species]() {
    return JenkinsNotifyListener;
  }

  /**
   *  This should be the name of the job.
   *  @type {string}
   *  @readonly
   */
  get name() {
    throw new SyntaxError('Subclasses must implement the "name" getter!');
  }


  match({ data }) {
    return data.name === this.name;
  }

  /**
   *  Grab the duration data from the most recent build. This will only
   *  be useful once the build has completed
   *
   *  @param {JenkinsNotification} notification
   *  @returns {object} Duration data from {@link JenkinsBuild#duration}.
   */
  async getDuration(notification) {
    const jenkins = Registry.for(this).get('Jenkins');
    const build = await jenkins.getBuild({
      name: notification.name,
      number: notification.build.number,
    });
    return build.duration;
  }
}


module.exports = JenkinsNotifyListener;
