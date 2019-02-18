/* eslint import/no-extraneous-dependencies:off, no-param-reassign:off, no-console: off */

const { taffy } = require('taffydb');
const dumper = require('jsdoc/util/dumper');
const env = require('jsdoc/env');
const fs = require('jsdoc/fs');
const helper = require('jsdoc/util/templateHelper');
const jsdocFilter = require('jsdoc/src/filter');
const jsdocScanner = require('jsdoc/src/scanner');
const logger = require('jsdoc/util/logger');
const path = require('jsdoc/path');
const template = require('jsdoc/template');

const tools = require('./publish-tools');

const hasOwnProp = Object.prototype.hasOwnProperty;


class Publisher {
  constructor({ taffyData, opts, tutorials }) {
    this.THEME_PATH = path.resolve(path.normalize(opts.template));
    this.TEMPLATE_PATH = path.resolve(this.THEME_PATH, 'tmpl');
    this.PROJECT_PATH = path.resolve(__dirname, '..');
    this.DOCS_DEST = path.resolve(this.PROJECT_PATH, opts.destination);

    this.conf = env.conf;
    this.data = taffyData;
    this.tutorials = tutorials;
    this.view = new template.Template(this.TEMPLATE_PATH);

    this.conf.templates = this.conf.templates || {};
    this.conf.templates.default = this.conf.templates.default || {};

    // sorta wrestling with webpack here...
    fs.mkPath(path.join(this.DOCS_DEST, 'dist'));

    // set up tutorials for helper
    helper.setTutorials(tutorials);
  }


  /**
   *  @returns {string} HTML collection of lists for members
   */
  buildMemberNav(items, itemHeading, itemsSeen, linktoFn) {
    const nav = [];

    if (items.length) {
      const itemsNav = [];

      items.forEach((item) => {
        let displayName;
        let html;

        if (!hasOwnProp.call(item, 'longname')) {
          displayName = item.name;
          html = linktoFn('', item.name);
          // itemsNav.push(linktoFn('', item.name));
        } else if (!hasOwnProp.call(itemsSeen, item.longname)) {
          if (this.conf.templates.default.useLongnameInNav) {
            displayName = item.longname;
          } else {
            displayName = item.name;
          }

          html = linktoFn(item.longname, displayName.replace(/\b(module|event):/g, ''));

          itemsSeen[item.longname] = true;
        }

        itemsNav.push({
          id: displayName,
          anchor: tools.anchorParse(html),
          items: [],
        });
      });

      if (itemsNav.length) {
        nav.push({
          id: itemHeading,
          anchor: tools.anchorParse(`<a href="">${itemHeading}</a>`),
          items: itemsNav,
        });
        // logger.warn(itemsNav);
      }
    }

    return nav;
  }

  /**
   * Create the navigation sidebar.
   *
   * @param {object} members The members that will be used to create the sidebar.
   * @param {array<object>} members.classes
   * @param {array<object>} members.externals
   * @param {array<object>} members.globals
   * @param {array<object>} members.mixins
   * @param {array<object>} members.modules
   * @param {array<object>} members.namespaces
   * @param {array<object>} members.tutorials
   * @param {array<object>} members.events
   * @param {array<object>} members.interfaces
   * @returns {string} The HTML for the navigation sidebar.
   */
  buildNav(members) {
    const seen = {};
    const seenTutorials = {};
    const nav = [{
      id: 'Home',
      anchor: tools.anchorParse('<a href="index.html">Home</a>'),
      items: [],
    }];
    let globalNavItems;

    nav.push(...this.buildMemberNav(members.modules, 'Modules', {}, helper.linkto));
    nav.push(...this.buildMemberNav(members.externals, 'Externals', seen, tools.linktoExternal));
    nav.push(...this.buildMemberNav(members.classes, 'Classes', seen, helper.linkto));
    nav.push(...this.buildMemberNav(members.events, 'Events', seen, helper.linkto));
    nav.push(...this.buildMemberNav(members.namespaces, 'Namespaces', seen, helper.linkto));
    nav.push(...this.buildMemberNav(members.mixins, 'Mixins', seen, helper.linkto));
    nav.push(...this.buildMemberNav(members.tutorials, 'Tutorials', seenTutorials, tools.linktoTutorial));
    nav.push(...this.buildMemberNav(members.interfaces, 'Interfaces', seen, helper.linkto));

    if (members.globals.length) {
      globalNavItems = [];

      members.globals.forEach((g) => {
        if (g.kind !== 'typedef' && !hasOwnProp.call(seen, g.longname)) {
          globalNavItems.push({
            id: g.longname, // maybe g.name better? check conf?
            anchor: tools.anchorParse(helper.linkto(g.longname, g.name)),
            items: [],
          });
        }
        seen[g.longname] = true;
      });

      if (!globalNavItems.length) {
        // turn the heading into a link so you can actually get to the global page
        nav.push({
          id: 'Global',
          anchor: tools.anchorParse(helper.linkto('global', 'Global')),
          items: [],
        });
      } else {
        nav.push({
          id: 'Global',
          anchor: tools.anchorParse('<a href="">Global</a>'), // this is weird...check it out later
          items: globalNavItems,
        });
      }
    }

    return nav;
  }

  copyStaticFiles() {
    // copy the template's static files to outdir
    const fromDir = path.join(this.THEME_PATH, 'static');
    const staticFiles = fs.ls(fromDir, 3);

    staticFiles.forEach((fileName) => {
      const toDir = fs.toDir(fileName.replace(fromDir, this.DOCS_DEST));

      fs.mkPath(toDir);
      fs.copyFileSync(fileName, toDir);
    });
  }

  copyStaticUserFiles() {
    const { templates: { default: { staticFiles } } } = this.conf;

    // copy user-specified static files to outdir
    if (staticFiles) {
      // The canonical property name is `include`. We accept `paths` for backwards compatibility
      // with a bug in JSDoc 3.2.x.
      const staticFilePaths = staticFiles.include || staticFiles.paths || [];
      const staticFileFilter = new (jsdocFilter).Filter(staticFiles);
      const staticFileScanner = new (jsdocScanner).Scanner();

      staticFilePaths.forEach((staticFilePath) => {
        const filePath = path.resolve(env.pwd, staticFilePath);
        const extraStaticFiles = staticFileScanner.scan([filePath], 10, staticFileFilter);

        extraStaticFiles.forEach((fileName) => {
          const sourcePath = fs.toDir(filePath);
          const toDir = fs.toDir(fileName.replace(sourcePath, this.DOCS_DEST));

          fs.mkPath(toDir);
          fs.copyFileSync(fileName, toDir);
        });
      });
    }
  }

  decorateExamples(doclet) {
    if (doclet.examples) {
      doclet.examples = doclet.examples.map((example) => {
        let caption = '';
        let code = example;

        if (example.match(/^\s*<caption>([\s\S]+?)<\/caption>(\s*[\n\r])([\s\S]+)$/i)) {
          caption = RegExp.$1;
          code = RegExp.$3;
        }

        return {
          caption,
          code,
        };
      });
    }
  }

  decorateSee(doclet) {
    if (doclet.see) {
      doclet.see.forEach((seeItem, i) => {
        doclet.see[i] = tools.hashToLink(doclet, seeItem);
      });
    }
  }

  dumpRawDocs() {
    // this.data({undocumented: true}).remove();
    const docs = this.data().get(); // <-- an array of Doclet objects

    fs.writeFileSync(path.resolve(this.DOCS_DEST, 'dist/docs_raw.json'), dumper.dump(docs), 'utf8');
  }

  generate({
    title, docs, filename, resolveLinks,
  }) {
    const shouldResolveLinks = resolveLinks !== false;
    const outPath = path.join(this.DOCS_DEST, filename);
    const docData = {
      env,
      title,
      docs,
    };

    let html = this.view.render('container.tmpl', docData);

    if (shouldResolveLinks) {
      html = helper.resolveLinks(html); // turn {@link foo} into <a href="foodoc.html">foo</a>
    }

    fs.writeFileSync(outPath, html, 'utf8');
  }

  generateFromMembers(members) {
    // set up the lists that we'll use to generate pages
    const classes = taffy(members.classes);
    const modules = taffy(members.modules);
    const namespaces = taffy(members.namespaces);
    const mixins = taffy(members.mixins);
    const externals = taffy(members.externals);
    const interfaces = taffy(members.interfaces);

    Object.keys(helper.longnameToUrl).forEach((longname) => {
      const myClasses = helper.find(classes, { longname });
      const myExternals = helper.find(externals, { longname });
      const myInterfaces = helper.find(interfaces, { longname });
      const myMixins = helper.find(mixins, { longname });
      const myModules = helper.find(modules, { longname });
      const myNamespaces = helper.find(namespaces, { longname });

      if (myModules.length) {
        this.generate({
          title: `Module: ${myModules[0].name}`,
          docs: myModules,
          filename: helper.longnameToUrl[longname],
        });
      }

      if (myClasses.length) {
        this.generate({
          title: `Class: ${myClasses[0].name}`,
          docs: myClasses,
          filename: helper.longnameToUrl[longname],
        });
      }

      if (myNamespaces.length) {
        this.generate({
          title: `Namespace: ${myNamespaces[0].name}`,
          docs: myNamespaces,
          filename: helper.longnameToUrl[longname],
        });
      }

      if (myMixins.length) {
        this.generate({
          title: `Mixin: ${myMixins[0].name}`,
          docs: myMixins,
          filename: helper.longnameToUrl[longname],
        });
      }

      if (myExternals.length) {
        this.generate({
          title: `External: ${myExternals[0].name}`,
          docs: myExternals,
          filename: helper.longnameToUrl[longname],
        });
      }

      if (myInterfaces.length) {
        this.generate({
          title: `Interface: ${myInterfaces[0].name}`,
          docs: myInterfaces,
          filename: helper.longnameToUrl[longname],
        });
      }
    });
  }

  generateSourceFiles(sourceFiles, encoding = 'utf8') {
    Object.keys(sourceFiles).forEach((file) => {
      // links are keyed to the shortened path in each doclet's `meta.shortpath` property
      const sourceOutfile = helper.getUniqueFilename(sourceFiles[file].shortened);
      let source;

      helper.registerLink(sourceFiles[file].shortened, sourceOutfile);

      try {
        source = {
          kind: 'source',
          code: helper.htmlsafe(fs.readFileSync(sourceFiles[file].resolved, encoding)),
        };
      } catch (e) {
        logger.error('Error while generating source file %s: %s', file, e.message);
      }

      this.generate(`Source: ${sourceFiles[file].shortened}`, [source], sourceOutfile, false);
    });
  }


  // TODO: move the tutorial functions to templateHelper.js
  generateTutorial(title, tutorial, filename) {
    const tutorialData = {
      title,
      header: tutorial.title,
      content: tutorial.parse(),
      children: tutorial.children,
    };
    const tutorialPath = path.join(this.DOCS_DEST, filename);
    let html = this.view.render('tutorial.tmpl', tutorialData);

    // yes, you can use {@link} in tutorials too!
    html = helper.resolveLinks(html); // turn {@link foo} into <a href="foodoc.html">foo</a>

    fs.writeFileSync(tutorialPath, html, 'utf8');
  }

  // todo: maybe this.data is being neglected?
  getSourceFileData(data) {
    const sourceFilePaths = [];
    const sourceFiles = {};

    data().each((doclet) => {
      let sourcePath;

      // build a list of source files
      if (doclet.meta) {
        sourcePath = tools.getPathFromDoclet(doclet);
        sourceFiles[sourcePath] = {
          resolved: sourcePath,
          shortened: null,
        };

        if (sourceFilePaths.indexOf(sourcePath) === -1) {
          sourceFilePaths.push(sourcePath);
        }
      }
    });

    return {
      paths: sourceFilePaths,
      files: sourceFiles,
    };
  }

  // tutorials can have only one parent so there is no risk for loops
  saveChildren(node) {
    node.children.forEach((child) => {
      this.generateTutorial(`Tutorial: ${child.title}`, child, helper.tutorialToUrl(child.name));
      this.saveChildren(child);
    });
  }

  setupViewHelpers(view) {
    // add template helpers
    // view.find = spec => helper.find(data, spec);
    view.linkto = helper.linkto;
    view.resolveAuthorLinks = tools.resolveAuthorLinks;
    view.tutoriallink = tools.tutorialLink;
    view.htmlsafe = helper.htmlsafe;
    // view.outputSourceFiles = outputSourceFiles;

    // once for all
    // view.nav = this.buildNav(members);
  }


  publish() {
    this.dumpRawDocs();

    // claim some special filenames in advance, so the All-Powerful Overseer of Filename Uniqueness
    // doesn't try to hand them out later
    const indexUrl = helper.getUniqueFilename('index');
    // don't call registerLink() on this one! 'index' is also a valid longname

    const globalUrl = helper.getUniqueFilename('global');
    helper.registerLink('global', globalUrl);

    // set up templating
    this.view.layout = this.conf.templates.default.layoutFile
      ? path.getResourcePath(
        path.dirname(this.conf.templates.default.layoutFile),
        path.basename(this.conf.templates.default.layoutFile),
      )
      : 'layout.tmpl';


    // /////////////////////////////////////////////////////////////////////////

    /**
     * Remove members that will not be included in the output, including:
     *
     * + Undocumented members.
     * + Members tagged `@ignore`.
     * + Members of anonymous classes.
     * + Members tagged `@private`, unless the `private` option is enabled.
     * + Members tagged with anything other than specified by the `access` options.
     */
    const data = helper.prune(this.data);

    data.sort('longname, version, since');

    /**
     * Iterates through all the doclets in `data`, ensuring that if a method `@listens` to an event,
     * then that event has a `listeners` array with the longname of the listener in it.
     */
    helper.addEventListeners(data);


    data().each((doclet) => {
      doclet.attribs = '';

      this.decorateExamples(doclet);
      this.decorateSee(doclet);
    });


    this.copyStaticFiles();
    this.copyStaticUserFiles();

    // build a list of source files
    const sourceFileData = this.getSourceFileData(data);
    const sourceFilePaths = sourceFileData.paths;
    let sourceFiles = sourceFileData.files;

    if (sourceFilePaths.length) {
      sourceFiles = tools.shortenPaths(sourceFiles, path.commonPrefix(sourceFilePaths));
    }

    data().each((doclet) => {
      const url = helper.createLink(doclet);
      let docletPath;

      helper.registerLink(doclet.longname, url);

      // add a shortened version of the full path
      if (doclet.meta) {
        docletPath = tools.getPathFromDoclet(doclet);
        docletPath = sourceFiles[docletPath].shortened;

        if (docletPath) {
          doclet.meta.shortpath = docletPath;
        }
      }
    });

    data().each((doclet) => {
      const url = helper.longnameToUrl[doclet.longname];

      if (url.indexOf('#') > -1) {
        doclet.id = helper.longnameToUrl[doclet.longname].split(/#/).pop();
      } else {
        doclet.id = doclet.name;
      }

      if (tools.needsSignature(doclet)) {
        tools.addSignatureParams(doclet);
        tools.addSignatureReturns(doclet);
        tools.addAttribs(doclet);
      }
    });

    // do this after the urls have all been generated
    data().each((doclet) => {
      doclet.ancestors = helper.getAncestorLinks(data, doclet);

      if (doclet.kind === 'member') {
        tools.addSignatureTypes(doclet);
        tools.addAttribs(doclet);
      }

      if (doclet.kind === 'constant') {
        tools.addSignatureTypes(doclet);
        tools.addAttribs(doclet);
        doclet.kind = 'member';
      }
    });

    const members = helper.getMembers(data);
    members.tutorials = this.tutorials.children;

    this.setupViewHelpers(this.view);

    const nav = this.buildNav(members);

    tools.attachModuleSymbols(helper.find(data, { longname: { left: 'module:' } }), members.modules);

    // output pretty-printed source files by default
    const outputSourceFiles = this.conf.default && this.conf.default.outputSourceFiles !== false;

    // generate the pretty-printed source files first so other pages can link to them
    if (outputSourceFiles) {
      this.generateSourceFiles(sourceFiles, this.conf.opts.encoding);
    }

    // if (false && members.globals.length) {
    //   this.generate({
    //     title: 'Global',
    //     docs: [{ kind: 'globalobj' }],
    //     filename: globalUrl,
    //   });
    // }

    // index page displays information from package.json and lists files
    // files = find({kind: 'file'});
    // packages = find({kind: 'package'});

    // generate('Home',
    //     packages.concat(
    //         [{
    //             kind: 'mainpage',
    //             readme: opts.readme,
    //             longname: (opts.mainpagetitle) ? opts.mainpagetitle : 'Main Page'
    //         }]
    //     ).concat(files), indexUrl);

    // this.generateFromMembers(members);


    // /////////////////////////////////////////////////////////////////////////

    const docs = data().get();

    if (this.conf.opts.destination === 'console') {
      console.log(dumper.dump(docs));
    } else {
      fs.writeFileSync(path.resolve(this.DOCS_DEST, 'dist/docs.json'), dumper.dump(docs), 'utf8');
      fs.writeFileSync(path.resolve(this.DOCS_DEST, 'dist/members.json'), dumper.dump(members), 'utf8');
      fs.writeFileSync(path.resolve(this.DOCS_DEST, 'dist/nav.json'), dumper.dump(nav), 'utf8');

      this.generate({
        title: 'Documentation',
        docs: [],
        filename: indexUrl,
      });

      // this.saveChildren(this.tutorials);
    }
  }
}

/**
    @param {TAFFY} data
    @param {object} opts
 */
exports.publish = (taffyData, opts, tutorials) => {
  const publisher = new Publisher({ taffyData, opts, tutorials });
  publisher.publish();
};

// opts: { _:
//    [ './externals.jsdoc',
//      './modules.jsdoc',
//      './interfaces',
//      './mixins',
//      './models' ],
//   configure: './jsdoc.conf.json',
//   template: '/Users/smola/Workspaces/elite-bot/docs_theme',
//   encoding: 'utf8',
//   destination: './docs/',
//   tutorials: './tutorials',
//   recurse: true,
//   readme: undefined }


// { plugins:
//    [ '/Users/smola/Workspaces/elite-bot/node_modules/jsdoc/plugins/markdown.js' ],
//   recurseDepth: 10,
//   source:
//    { includePattern: '.+\\.js(doc|x)?$',
//      excludePattern: '(^|\\/|\\\\)_',
//      include:
//       [ './externals.jsdoc',
//         './modules.jsdoc',
//         './interfaces',
//         './mixins',
//         './models' ],
//      exclude: [] },
//   sourceType: 'module',
//   tags:
//    { allowUnknownTags: true, dictionaries: [ 'jsdoc', 'closure' ] },
//   templates:
//    { monospaceLinks: false,
//      cleverLinks: true,
//      name: 'elitebot',
//      default: { staticFiles: [Object] },
//      logo:
//       { url: '/img/elite_logo_185x185.png',
//         width: '75px',
//         height: '75px',
//         link: '/' } },
//   opts:
//    { template: './docs_theme',
//      encoding: 'utf8',
//      destination: './docs/',
//      tutorials: './tutorials',
//      recurse: true } }

