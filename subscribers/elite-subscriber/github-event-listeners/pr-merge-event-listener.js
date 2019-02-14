const AttachmentsBuilder = require('../../../models/attachments-builder');
const Registry = require('../../../models/registry');

const GithubEventListener = require('../models/github-event-listener');

const _prAttachments = Symbol('prAttachments');


class PRMergeEventListener extends GithubEventListener {
  get event() {
    return 'pull_request';
  }


  /**
   *  @param {object}        options
   *  @param {GithubEvent} options.data
   *  @returns {Promise}
   *  @private
   */
  async process({ data }) {
    this._log.debug('we have a PR hook!');
    try {
      const registry = Registry.for(this);
      const jenkins = registry.get('Jenkins');
      const nectarSubscriber = registry.get('NectarSubscriber');
      const slack = registry.get('Slack');

      const attachments = this[_prAttachments](data);
      const jobName = nectarSubscriber.jobNames.ALL;

      this._log.debug(`${attachments.length} attachments built...`);
      if (data.isMergedPullRequest) {
        if (attachments.length) {
          await slack.broadcast({ attachments });
          return await jenkins.buildJob({ name: jobName });
        } else {
          return await slack.broadcast({ text: 'Yikes! Something went wrong getting the message attachments...' });
        }
      }
    } catch (e) {
      this._log.error(e.stack);
    }
  }


  [_prAttachments](webhook) {
    try {
      const attachmentsBuilder = new AttachmentsBuilder();
      const pr = webhook.pull_request;
      const repo = webhook.repository;
      const { additions, deletions, changed_files, html_url, number, title, user } = pr;
      const prNum = `#${number}`;
      const aTitle = `${repo.full_name}${prNum} ${title}`;
      const details = `(+${additions} additions/-${deletions} deletions) across ${changed_files} files`;
      let pretext;

      if (webhook.isMergedPullRequest) {
        pretext = `This bad boy just got *merged*. Starting deploy...`;
      }

      return attachmentsBuilder
        .fallback(`PR${prNum} seen from ${user.login}`)
        .pretext(pretext)
        .author({ name: user.login, link: user.html_url })
        .title({ title: aTitle, link: html_url })
        .image({ thumb: user.avatar_url })
        .field({ title: 'Details', value: details })
        .build();
    } catch (e) {
      this._log.error(e);
      return [];
    }
  }
}


module.exports = PRMergeEventListener;
