const SlashCommandListener = require('../../../interfaces/slash-command-listener');
const Registry = require('../../../models/registry');


class DeployYourselfSlashCommandListener extends SlashCommandListener {
  get pattern() {
    return /deploy yourself/;
  }


  async process({ message }) {
    const { user } = message;
    const registry = Registry.for(this);
    const jenkins = registry.get('Jenkins');
    const jobName = registry.get('NectarSubscriber').jobNames.NECTARBOT;
    const server = registry.global('WebServer');
    const slack = registry.get('Slack');
    const text = `Hey @channel, it's high time I get an upgrade (or so says <@${user.id}>). Commands are suspended until I restart. BRB!`;

    try {
      await slack.broadcast({ text });
      await jenkins.buildJob({ name: jobName });
      return server.ignoreHooks();
    } catch (e) {
      this._log.error(`${e.message}\n${e.stack}`);
      return await slack.broadcast({ text: 'Yikes! Something went wrong...' });
    }
  }
}


module.exports = DeployYourselfSlashCommandListener;
