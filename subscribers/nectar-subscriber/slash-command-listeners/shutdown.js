const SlashCommandListener = require('../../../interfaces/slash-command-listener');
const Registry = require('../../../models/registry');


class ShutdownSlashCommandListener extends SlashCommandListener {
  get pattern() {
    return /^shutdown$/;
  }


  async process({ message }) {
    const registry = Registry.for(this);
    const nectarBot = registry.get('SlackBot');
    const slack = registry.get('Slack');
    const text = [
      'Hey folks, I\'m gonna shutdown, so commands will be disabled.',
      'I\'ll be counting down the minutes until we can chat again... :relaxed:',
    ].join(' ');

    try {
      await slack.broadcast({ text });
      return nectarBot.stop();
    } catch (e) {
      this._log.error(`${e.message}\n${e.stack}`);
      return await message.whisper({ text: 'Yikes! Something went wrong...' });
    }
  }
}


module.exports = ShutdownSlashCommandListener;
