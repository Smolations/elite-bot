const SlashCommandListener = require('../../../interfaces/slash-command-listener');
const Registry = require('../../../models/registry');


class DeployThemeSlashCommandListener extends SlashCommandListener {
  get pattern() {
    return /deploy theme/;
  }


  async process({ message }) {
    const { user } = message;
    const registry = Registry.for(this);
    const jenkins = registry.get('Jenkins');
    const jobName = registry.get('NectarSubscriber').jobNames.THEME;
    const text = `Alright <@${user.id}>, the theme deploy job has been queued up!`;

    try {
      await message.respond({ text });
      return await jenkins.buildJob({ name: jobName });
    } catch (e) {
      this._log.error(`${e.message}\n${e.stack}`);
      return await message.respond({ text: 'Yikes! Something went wrong...' });
    }
  }
}


module.exports = DeployThemeSlashCommandListener;
