const Registry = require('../../../models/registry');

const JenkinsNotifyListener = require('../models/jenkins-notify-listener');


class NectarStorybookNotifyListener extends JenkinsNotifyListener {
  get name() {
    return Registry.for(this).get('NectarSubscriber').jobNames.STORYBOOK;
  }


  /**
   *  @param {object}              options
   *  @param {JenkinsNotification} options.data
   */
  async process({ data }) {
    this._log.debug(`Processing notify processor for ${this.name}`);
    try {
      const registry = Registry.for(this);
      const slack = registry.get('Slack');
      const { build } = data;
      let text;

      switch (build.phase) {
        case 'STARTED':
          text = this.startMessage(data);
          break;

        case 'FINALIZED':
          if (build.status === 'SUCCESS') {
            text = await this.successMessage(data);
          } else if (build.status === 'FAILURE') {
            text = this.failureMessage(data);
          }
          break;
      }

      if (text) {
        return await slack.broadcast({ text });
      } else {
        this._log.debug('No phase/status matched for response.');
      }
    } catch (e) {
      this._log.error(e.stack);
    }
  }

  startMessage(notification) {
    return `Nectar storybook deploy started...`;
  }

  async successMessage(notification) {
    const urlsPattern = /([^ ]+) now points to ([^ ]+)/;
    const [, prodUrl, uniqueUrl] = urlsPattern.exec(notification.build.log) || [];
    const duration = await this.getDuration(notification);
    return [
      `Nectar storybook deployed! Deploy duration: *${duration.pretty}*`,
      `<https://${prodUrl}|${prodUrl}> now points to <https://${uniqueUrl}|${uniqueUrl}>`,
    ].join('\n');
  }

  failureMessage(notification) {
    const { build } = notification;
    return [
      `Oh noes! The storybook deploy failed. Here's an excerpt from the <${build.full_url}/console|Console>:`,
      '```',
      build.log,
      '```',
    ].join('\n');
  }
}


module.exports = NectarStorybookNotifyListener;
