const SlashCommandListener = require('../../../interfaces/slash-command-listener');
const Registry = require('../../../models/registry');


class ReleasePrepSlashCommandListener extends SlashCommandListener {
  get pattern() {
    return /(^|\s)prep.*release/;
  }


  async process({ message }) {
    const { user, channel } = message;
    const registry = Registry.for(this);
    const nectarSubscriber = registry.get('NectarSubscriber');
    const queue = registry.get('QueueCollection');
    const slack = registry.get('Slack');
    const channelIds = nectarSubscriber.notificationChannelIds;
    const text = [
    ].join(' ');

    // most messages ephemeral

    try {
      const record = queue.findOne({ slackId: user.id });

      if (record) {
        // message
      } else {
        // message indicating addition; show queue?
      }
      // await Promise.all(channelIds.map((channelId) => {
      //   return slack.postMessage({ channel: channelId, text });
      // }));
    } catch (e) {
      this._log.error(`${e.message}\n${e.stack}`);
      return await slack.postMessage({ channel: channel.id, text: 'Yikes! Something went wrong...' });
    }
  }
}


module.exports = ReleasePrepSlashCommandListener;
