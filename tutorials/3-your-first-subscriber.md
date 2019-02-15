In the previous section we set up the Slack app through the Slack admin page, created a config file and edited it with the information for the app, and set up our "main" initialization file that starts the web server and the slackbot. In this section, we will create a subscriber and add it to our bot.

### Create the Subscriber

This part is pretty basic. We just need to extend from the `Subscriber` interface and then add that subscriber to the bot. Let's start by creating a directory for our subscriber and the subscriber file itself:
```
$ mkdir -p subscribers/wonder-subscriber
$ touch !$/index.js
```

For those unfamiliar, `!$` is an alias for the previous command's _last_ argument. So the `!$/index.js` above resolves to `subscribers/wonder-subscriber/index.js`.

OK, time for the code stuffs...
```javascript
// ./subscribers/wonder-subscriber/index.js
const Subscriber = require('../../interfaces/subscriber');

// extending from the `Subscriber` model ensures that the slack bot will
// be able to provide the common functionality to all of your processors
class WonderSubscriber extends Subscriber {
  subscribe(registry) {}
}

module.exports = WonderSubscriber;
```

Before we get into the nitty gritty of processors, you might want check out some of the provided items that come with every `Subscriber` instance [here]{@tutorial 3.1-free-with-every-subscriber}. If you'd rather move on it's time to check out {@tutorial 4-your-first-listener}.
