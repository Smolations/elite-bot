const Envable = require('../../mixins/envable');
const Logable = require('../../mixins/logable');

const Registry = require('../../mixins/logable');

const _api = Symbol('api');


/**
 *  A model representation of a github repo. Convenience instance methods
 *  are provided for common operations.
 *
 *  @alias GithubRepo
 *  @memberOf subscribers
 *  @mixes module:slackbot/mixins~Configable
 *  @mixes module:slackbot/mixins~Eventable
 *  @mixes module:slackbot/mixins~Logable
 *  @extends module:slackbot/mixins~Configable
 *  @extends module:slackbot/mixins~Eventable
 *  @extends module:slackbot/mixins~Logable
 *
 *  @see external:github-api
 *  @private
 */
class GithubRepo extends Logable(Envable()) {
  constructor({ ...superOpts } = {}) {
    super(superOpts);
    this[_api] = Registry.context('nectarBot').get('Github');
  }

  /**
   *  Get latest tag.
   *
   *  @returns {Promise} Resolves with the tag name.
   */
  async latestTag() {
    const opts = this._mergeOwnerRepoOpts();
    const { data } = await this[_api].repos.getLatestRelease(opts);
    return data.tagName;
  }

  /**
   *  The repo will be considered "dirty" if the latest commit sha does not
   *  match up with the latest tag's sha.
   *
   *  @returns {Promise} Resolves with a boolean.
   */
  isDirty() {
    return this._latestSha(this._config.defaultBranch)
      .then(latestSha => this._latestTagSha()
        .then(latestTagSha => Promise.resolve(latestSha !== latestTagSha)));
  }

  /**
   *  Publish a release.
   *
   *  @param {object} options
   *  @param {string} options.tag         The tag for the release
   *  @param {string} options.description A description of the release.
   *  @returns {Promise} Resolves with the github URL pointing to the release.
   */
  async publishRelease({ tag, description }) {
    const opts = this._mergeOwnerRepoOpts({
      tag_name: tag,
      name: tag,
      body: description,
    });

    const { data } = await this[_api].repos.createRelease(opts);
    return data.html_url;
  }


  // private

  _latestSha(branch) {
    const opts = this._mergeOwnerRepoOpts({
      ref: `heads/${branch}`,
    });
    // this._log.debug('GithubRepo#_latestSha submitting request with opts: ', opts);
    return this[_api].repos.getShaOfCommitRef(opts)
      .then((response) => {
        const { sha } = response.data;
        return sha;
      });
  }

  _latestTagSha() {
    return this.latestTag()
      .then((tag) => {
        const opts = this._mergeOwnerRepoOpts({
          ref: `tags/${tag}`,
        });
        return this[_api].gitdata.getReference(opts)
          .then(resp => resp.data.object.sha);
      });
  }

  _mergeOwnerRepoOpts(opts = {}) {
    const ownerRepoOpts = {
      owner: this._config.owner,
      repo: this._config.name,
    };
    return Object.assign({}, ownerRepoOpts, opts);
  }
}


module.exports = GithubRepo;
