const LokiAdapter = require('./db/loki/loki-fs-adapter');

const SlackBot = require('./models/slack-bot');


// bring in desired subscribers
const EliteSubscriber = require('./subscribers/elite-subscriber');

// get some persistence action goin...
const env = process.env.NODE_ENV || 'development';

// TODO: if forced to use eddb.io nightly files, should probably
// initiate download here...

// TODO: choose appropriate database here
const dbAdapter = new LokiAdapter({ fileName: `db/data/${env}.db` });

// set global server opts for all slack bots
SlackBot.serverOpts({ configKey: 'webServer' });


// create the bot instance
const eliteBot = new SlackBot({ configKey: 'eliteBot', dbAdapter });

// add the subscribers ("subscribe them")
eliteBot.addSubscriber(EliteSubscriber);

// and awaaaaAAAAaaay we go!
eliteBot.start();

