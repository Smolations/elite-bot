const Subscriber = require('../../interfaces/subscriber');


const _dataInit = Symbol('dataInit');


/**
 *  @alias EliteSubscriber
 *  @extends Subscriber
 *  @private
 */
class EliteSubscriber extends Subscriber {

  register(registry) {
    // registry.set(new UsersCollection({ registry }));

    // this.addListenerGroups([
    // ]);
  }

  async subscribe(registry) {
    const server = registry.global('WebServer');
    const eliteBot = registry.get('SlackBot');
    const slack = registry.get('Slack');


    // this.slashCommandListenerGroup.add([
    // ]);


    // grab some data
    await this[_dataInit](registry);

    // say hello
    const text = `Hey everyone! I just booted (*v${eliteBot.version}*) and am ready to do the things!`;
    // slack.broadcast({ text });
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
    // const queue = registry.get('QueueCollection');
    // queue.clear();
  }
}


module.exports = EliteSubscriber;
