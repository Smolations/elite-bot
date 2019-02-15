const InteractionBuilder = require('../../../models/interaction-builder');
const SlashCommandListener = require('../../../interfaces/slash-command-listener');
const Registry = require('../../../models/registry');


class ReleaseQueueSlashCommandListener extends SlashCommandListener {
  get help() {
    return 'e.g. "release queue" or "queue" or just "q" (or even "get me in the dang queue")';
  }

  get pattern() {
    return /(release )?q(ueue)?$/;
  }


  async process({ message }) {
    const { user } = message;
    const registry = Registry.for(this);
    const queue = registry.get('QueueCollection');
    const interactionBuilder = new InteractionBuilder();
    const queueCount = queue.count();
    let attachments = [];
    let text = 'No one is in the queue right now.';

    try {
      interactionBuilder
        .callbackId('addToQueue')
        .fallback('Release Queue')
        .color('warning')
        .title('Queue is empty!')
        .button({ text: 'Get in line', name: 'queueUp' });

      if (queueCount > 0) {
        this._log.debug(`queue contains ${queueCount} users`);
        text = queue.getListForMessage();
      }

      if (!queue.isQueued(user.id)) {
        this._log.debug(`user is not in queue. building attachments...`);
        attachments = interactionBuilder
          .title('Wanna queue up?')
          .build();
      }

      return await message.respond({ text, attachments });
    } catch (e) {
      this._log.error(`${e.message}\n${e.stack}`);
      return await message.respond({ text: 'Yikes! Something went wrong...' });
    }
  }
}


module.exports = ReleaseQueueSlashCommandListener;
