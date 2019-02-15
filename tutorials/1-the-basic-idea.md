The api docs can be intimidating at first glance, so let's see if we can't make it a bit simpler and lay out the basic concepts here.

Configuration
-------------

First thing's first: you need some place to store your config, and a straightforward way to access it. You can home-roll your own implementation or you can work with slackbot's established paradigm. The config files are basic JSON files. The app is able to consume configs based on the environment (with which it basically aligns with `process.env.NODE_ENV`, but you can configure a custom value). The test config is committed to the repo, so you should see it in `./config/test.json`. This file exists for test purposes, but it doubles as a template for your `development.json`. So let's get started by creating that file.
```
// if you don't have the specified version, install it
$ nvm use
$ npm install
$ npm run bootstrap-dev
```

The final command above creates your `development.json` as well as a secure pkcs12 cert for use with SSL. SSL is disabled by default, but if you ever want to enable it, you won't need to remember to create a new cert.


Concept Hierarchy
-----------------

A slackbot is basically a receiver/dispatcher for hooks and messages. It listens for hooks, and then chooses to ignore or process those hooks based on the implementation. The RTM (Real-Time Messaging) API sends events over a websocket, the Slack API POSTs requests to a server for slash commands and interactions, and other services can be configured to send webhooks to the server. This commonality of communication is the foundation for this project. Here's the basic hierarchy:
```
|--------------------|
| SlackBot           |     _________________    ________________
| __________________ |     |               |    |              |
| |   Slack and    | | --> | Subscriber(s) | -> | Listener(s)  |
| |   WebServer    | |     |_______________|    |______________|
| |   controls     | |
|--------------------|
                                    ^                   ^
          ^                         |                   |
          |                         |                   |
______________________________________________________________________________
|                                 Registry                                   |
|                                                                            |
| _____________ _____________ ____________ ____________________ ____________ |
| |           | |  Slack    | |          | |  ListenerGroup   | | Whatever | |
| | WebServer | | (RTM/Web) | | Database | | (per subscriber) | | you want | |
|_|___________|_|___________|_|__________|_|__________________|_|__________|_|
```

The slack bot controls the web server for incoming requests, initializes a {@link Slack} instance (which contains the RTM client (Real-Time Messaging) for websocket communication with Slack and the web client for web requests to Slack), initializes the database persistence layer (if configured), and all of which are available to subscribers and processors via the `Registry`. Subscribers are added
to the slack bot, which then _subscribe_ to desired uri hooks. When one of these hooks triggers from a web request, the incoming data (usually slack messages) is then passed on to one or more processors, which then do whatever they want with the data.

### Slackbot

Each Slackbot instance corresponds to a single Slack app. A Slack app can be configured with three URLs:
  - an endpoint to which slash commands are sent
  - an endpoint to which options load requests are sent (to dynamically populate `select` elements)
  - an endpoint to which interactions are sent (when a `select` option is chosen or when a button is clicked)

It is entirely possible to create multiple slack apps that all point to the same URLs, but the single Slackbot instance would have to respond to requests with all sorts of responsibilities and the code would get complicated really fast. Try and stick to the one-slack-app-one-slackbot paradigm.

### Subscribers

A single Slackbot can have any number of subscribers. Each subscriber holds any number of processors. Given these facts, you should try and create subscribers that encapsulate common functionality. For instance, if you want your Slackbot to work with two separate projects (like a website and a component library) you should probably create one subscriber for each project. This keeps the code clean, encapsulated, and more easily maintainable. On the other hand, if you find yourself using the registry to gain access to other subscribers and/or processors from other subscribers, you should consider consolidating that functionality into a single subscriber.

### ListenerGroup

Each processor should be single responsibility. One processor per slash command, one processor per options load request, and one processor per message trigger (like parsing a command from an RTM message). Again, this lends to separation of concerns and maintainability of code.


That's Really It
----------------
To start digging in, checkout the next tutorial: {@tutorial 2-your-first-slackbot}.
