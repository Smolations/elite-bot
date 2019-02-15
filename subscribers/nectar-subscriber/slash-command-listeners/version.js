const SlashCommandListener = require('../../../interfaces/slash-command-listener');
const Registry = require('../../../models/registry');


class VersionSlashCommandListener extends SlashCommandListener {
  get help() {
    return 'e.g. "version" or just "v"';
  }

  get pattern() {
    return /^v(ersion)?$/;
  }


  async process({ message }) {
    const { user, channel } = message;
    const registry = Registry.for(this);
    const bot = registry.get('SlackBot');
    const text = `nectarbot version is: *${bot.version}*`;

    try {
      return await message.respond({ text });
    } catch (e) {
      this._log.error(`${e.message}\n${e.stack}`);
      return await message.respond({ text: 'Yikes! Something went wrong...' });
    }
  }
}


module.exports = VersionSlashCommandListener;
