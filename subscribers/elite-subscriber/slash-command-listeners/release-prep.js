const SlashCommandListener = require('../../../interfaces/slash-command-listener');
const Registry = require('../../../models/registry');


class ReleasePrepSlashCommandListener extends SlashCommandListener {
  get help() {
    return 'e.g. "prepping a release" or "prep release" or "preprelease" or "preppy releasezzzzzz"';
  }

  get pattern() {
    return /(^|\s)prep.*release/;
  }


  async process({ message }) {
    try {
    const { user } = message;
    const registry = Registry.for(this);
    const queue = registry.get('QueueCollection');
    // const interactionBuilder = new InteractionBuilder();
    const userIsQueued = queue.isQueued(user.id);
    const queueCount = queue.count();
    let attachments = [];
    let text = 'Sweet action! You just reserved your spot!';

      if (userIsQueued) {
        text = 'You are already in the queue. Wait your turn!';
      } else {
        queue.add(user.id);
      }


      // interactionBuilder
      //   .callbackId('addToQueue')
      //   .fallback('Release Queue')
      //   .color('warning')
      //   .title('Queue is empty!')
      //   .button({ text: 'Get in line', name: 'queueUp' });

      // if (queueCount > 0) {
      //   this._log.debug(`queue contains ${queueCount} users`);
      //   text = queue.getListForMessage();
      // }

      // if (!queue.isQueued(user.id)) {
      //   this._log.debug(`user is not in queue. building attachments...`);
      //   attachments = interactionBuilder
      //     .title('Wanna queue up?')
      //     .build();
      // }

      return await message.respond({ text, attachments });
    } catch (e) {
      this._log.error(`${e.message}\n${e.stack}`);
      return await message.respond({ text: 'Yikes! Something went wrong...' });
    }
  }
}


module.exports = ReleasePrepSlashCommandListener;
