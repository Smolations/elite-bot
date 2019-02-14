const Listener = require('../../../interfaces/listener');


class GithubEventListener extends Listener {
  static get [Symbol.species]() {
    return GithubEventListener;
  }

  get event() {
    throw new Error('Subclasses must implement the "event" getter!');
  }


  match({ data }) {
    return data.event && (data.event === this.event);
  }
}


module.exports = GithubEventListener;
