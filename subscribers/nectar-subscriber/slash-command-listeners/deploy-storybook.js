const SlashCommandListener = require('../../../interfaces/slash-command-listener');
const Registry = require('../../../models/registry');


class DeployStorybookSlashCommandListener extends SlashCommandListener {
  get pattern() {
    return /deploy storybook/;
  }


  async process({ message }) {
    const { user } = message;
    const registry = Registry.for(this);
    const jenkins = registry.get('Jenkins');
    const jobName = registry.get('NectarSubscriber').jobNames.STORYBOOK;
    const text = `Alright <@${user.id}>, the storybook deploy job has been queued up!`;

    try {
      await message.respond({ text });
      return await jenkins.buildJob({ name: jobName });
    } catch (e) {
      this._log.error(`${e.message}\n${e.stack}`);
      return await message.respond({ text: 'Yikes! Something went wrong...' });
    }
  }
}


module.exports = DeployStorybookSlashCommandListener;
