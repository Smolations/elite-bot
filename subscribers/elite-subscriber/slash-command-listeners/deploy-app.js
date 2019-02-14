const SlashCommandListener = require('../../../interfaces/slash-command-listener');
const Registry = require('../../../models/registry');


class DeployAppSlashCommandListener extends SlashCommandListener {
  get pattern() {
    return /deploy app/;
  }


  async process({ message }) {
    const { user } = message;
    const registry = Registry.for(this);
    const jenkins = registry.get('Jenkins');
    const jobName = registry.get('NectarSubscriber').jobNames.APP;
    const text = `Alright <@${user.id}>, the app deploy job has been queued up!`;

    try {
      await message.respond({ text });
      return await jenkins.buildJob({ name: jobName });
    } catch (e) {
      this._log.error(`${e.message}\n${e.stack}`);
      return await message.respond({ text: 'Yikes! Something went wrong...' });
    }
  }
}


module.exports = DeployAppSlashCommandListener;
