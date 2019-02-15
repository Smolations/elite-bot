const Subscriber = require('../../interfaces/subscriber');

const Github = require('../../models/github/github');
const GithubEvent = require('../../models/github/github-event');
const Jenkins = require('../../models/jenkins/jenkins');
const JenkinsNotification = require('../../models/jenkins/jenkins-notification');

const GithubEventListenerGroup = require('./models/github-event-listener-group');
const JenkinsNotifyListenerGroup = require('./models/jenkins-notify-listener-group');

const QueueCollection = require('./db-models/queue-collection');
const UsersCollection = require('./db-models/users-collection');

const AddToQueueInteractionListener = require('./interaction-listeners/add-to-queue');

const DeployAllSlashCommandListener = require('./slash-command-listeners/deploy-all');
const DeployAppSlashCommandListener = require('./slash-command-listeners/deploy-app');
const DeployStorybookSlashCommandListener = require('./slash-command-listeners/deploy-storybook');
const DeployThemeSlashCommandListener = require('./slash-command-listeners/deploy-theme');
const DeployYourselfSlashCommandListener = require('./slash-command-listeners/deploy-yourself');
const HelpSlashCommandListener = require('./slash-command-listeners/help');
const ReleasePrepSlashCommandListener = require('./slash-command-listeners/release-prep');
const ReleaseQueueSlashCommandListener = require('./slash-command-listeners/release-queue');
const ShutdownSlashCommandListener = require('./slash-command-listeners/shutdown');
const VersionSlashCommandListener = require('./slash-command-listeners/version');

const PRMergeEventListener = require('./github-event-listeners/pr-merge-event-listener');

const NectarAppNotifyListener = require('./jenkins-notify-listeners/nectar-app-notify-listener');
const NectarStorybookNotifyListener = require('./jenkins-notify-listeners/nectar-storybook-notify-listener');
const NectarThemeNotifyListener = require('./jenkins-notify-listeners/nectar-theme-notify-listener');


const _dataInit = Symbol('dataInit');


/**
 *  @alias NectarSubscriber
 *  @extends Subscriber
 *  @private
 */
class NectarSubscriber extends Subscriber {
  /**
   *  An object enum identifying Jenkins job names related to nectar.
   *  @type {object.<string, string>}
   *  @readonly
   */
  get jobNames() {
    return {
      NECTARBOT: 'nectarbot.deploy',
      THEME: 'nectar.theme',
      STORYBOOK: 'nectar.storybook',
      I18N: 'nectar.i18n',
      APP: 'nectar.app',
      ALL: 'nectar.full-deploy',
    };
  }


  register(registry) {
    registry.set(new Github({ configKey: 'Tangogroup/nectar' }));
    registry.set(new Jenkins({ configKey: 'jenkins' }));
    registry.set(new QueueCollection({ registry }));
    // registry.set(new UsersCollection({ registry }));

    this.addListenerGroups([
      GithubEventListenerGroup,
      JenkinsNotifyListenerGroup,
    ]);
  }

  async subscribe(registry) {
    const server = registry.global('WebServer');
    const jenkins = registry.get('Jenkins');
    const nectarBot = registry.get('SlackBot');
    const slack = registry.get('Slack');

    this.interactionListenerGroup.add([
      AddToQueueInteractionListener,
    ]);

    this.slashCommandListenerGroup.add([
      DeployAllSlashCommandListener,
      DeployAppSlashCommandListener,
      DeployStorybookSlashCommandListener,
      DeployThemeSlashCommandListener,
      DeployYourselfSlashCommandListener,
      HelpSlashCommandListener,
      ReleasePrepSlashCommandListener,
      ReleaseQueueSlashCommandListener,
      ShutdownSlashCommandListener,
      VersionSlashCommandListener,
    ]);

    this.githubEventListenerGroup.add([
      PRMergeEventListener,
    ]);

    this.jenkinsNotifyListenerGroup.add([
      NectarAppNotifyListener,
      NectarStorybookNotifyListener,
      NectarThemeNotifyListener,
    ]);


    server.on('/github/nectar', ({ headers, data }) => {
      try {
        const ghEvent = new GithubEvent({ payload: data, headers });
        this._log.json(`incoming ghEvent (${ghEvent.event}${ghEvent.action ? `:${ghEvent.action}` : ''}) from /github/nectar:`, data);
        this.githubEventListenerGroup.process({ data: ghEvent });
      } catch (e) {
        this._log.error(`${e.message}\n${e.stack}`);
      }
    });

    server.on(jenkins._config.notifyUri, ({ data }) => {
      try {
        this._log.json(`saw a request from ${jenkins._config.notifyUri}`, data);
        const notification = new JenkinsNotification({ notification: data });
        this.jenkinsNotifyListenerGroup.process({ data: notification });
      } catch (e) {
        this._log.error(`${e.message}\n${e.stack}`);
      }
    });

    // just for test purposes...
    server.on('/github/polymerge', ({ headers, data }) => {
      const ghEvent = new GithubEvent({ payload: data, headers });
      this._log.json(`incoming github event (${ghEvent.event}${ghEvent.action ? `:${ghEvent.action}` : ''}) from /github/polymerge:`, data);
      this.githubEventListenerGroup.process({ data: ghEvent });
    });

    // grab some data
    await this[_dataInit](registry);

    // say hello
    const text = `Hey everyone! I just booted (*v${nectarBot.version}*) and am ready to do the things!`;
    slack.broadcast({ text });
  }


  /**
   *  A place to initialize data for this subscriber.
   *
   *  @param {Registry} registry
   *  @returns {*}
   *
   *  @private
   */
  async [_dataInit](registry) {
    // testing release queue...
    const queue = registry.get('QueueCollection');
    queue.clear();
  }
}


module.exports = NectarSubscriber;
