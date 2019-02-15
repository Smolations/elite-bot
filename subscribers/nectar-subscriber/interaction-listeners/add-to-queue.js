const InteractionListener = require('../../../interfaces/interaction-listener');
const Registry = require('../../../models/registry');

class AddToQueueInteractionListener extends InteractionListener {
  // if this is kicking off, it is assumed the user is not already queued
  addToQueue({ message }) {
    const { user } = message;
    const registry = Registry.for(this);
    const queue = registry.get('QueueCollection');
    let text;

    queue.add(user.id);

    text = queue.getListForMessage();

    // update private message
    // broadcast (if first in line)

    return message.respond({ text, replace_original: true });
  }
}


module.exports = AddToQueueInteractionListener;
