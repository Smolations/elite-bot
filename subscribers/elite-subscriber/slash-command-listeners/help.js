const SlashCommandListener = require('../../../interfaces/slash-command-listener');
const Registry = require('../../../models/registry');


class HelpSlashCommandListener extends SlashCommandListener {
  get pattern() {
    return /^help$/;
  }


  async process({ message }) {
    const registry = Registry.for(this);
    const slashCommand = '/nectarbot';
    const commands = [`These are the \`${slashCommand}\` commands (patterns) I recognize:`];

    for (const [key, value] of registry) {
      this._log.debug(`checking ${key}`);
      if (key.endsWith('SlashCommandListener') && value.pattern) {
        commands.push(`  \`RegExp(${value.pattern.toString()})\`${value.help ? ` - ${value.help}` : ''}`);
      }
    }

    try {
      return await message.respond({ text: commands.join('\n') });
    } catch (e) {
      this._log.error(`${e.message}\n${e.stack}`);
      return await message.respond({ text: 'Yikes! Something went wrong...' });
    }
  }
}


module.exports = HelpSlashCommandListener;
