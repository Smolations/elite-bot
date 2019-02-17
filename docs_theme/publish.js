'use strict';

const dumper = require('jsdoc/util/dumper');
const env = require('jsdoc/env');
const fs = require('jsdoc/fs');
const helper = require('jsdoc/util/templateHelper');
const path = require('jsdoc/path');
const taffy = require('taffydb').taffy;
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
    let nav = '';

    if (items.length) {
      let itemsNav = '';

      items.forEach((item) => {
        let displayName;

        if ( !hasOwnProp.call(item, 'longname') ) {
          itemsNav += '<li>' + linktoFn('', item.name) + '</li>';

        } else if ( !hasOwnProp.call(itemsSeen, item.longname) ) {
          if (this.conf.templates.default.useLongnameInNav) {
              displayName = item.longname;
          } else {
              displayName = item.name;
          }
          itemsNav += '<li>' + linktoFn(item.longname, displayName.replace(/\b(module|event):/g, '')) + '</li>';

          itemsSeen[item.longname] = true;
        }
      });

      if (itemsNav !== '') {
        nav += '<h3>' + itemHeading + '</h3><ul>' + itemsNav + '</ul>';
      }
    }

    return nav;
  }

  /**
   * Create the navigation sidebar.
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
   * @return {string} The HTML for the navigation sidebar.
   */
  buildNav(members) {
    const seen = {};
    const seenTutorials = {};
    let nav = '<h2><a href="index.html">Home</a></h2>';
    let globalNav;

    nav += this.buildMemberNav(members.modules, 'Modules', {}, helper.linkto);
    nav += this.buildMemberNav(members.externals, 'Externals', seen, tools.linktoExternal);
    nav += this.buildMemberNav(members.classes, 'Classes', seen, helper.linkto);
    nav += this.buildMemberNav(members.events, 'Events', seen, helper.linkto);
    nav += this.buildMemberNav(members.namespaces, 'Namespaces', seen, helper.linkto);
    nav += this.buildMemberNav(members.mixins, 'Mixins', seen, helper.linkto);
    nav += this.buildMemberNav(members.tutorials, 'Tutorials', seenTutorials, tools.linktoTutorial);
    nav += this.buildMemberNav(members.interfaces, 'Interfaces', seen, helper.linkto);

    if (members.globals.length) {
      globalNav = '';

      members.globals.forEach((g) => {
        if ( g.kind !== 'typedef' && !hasOwnProp.call(seen, g.longname) ) {
          globalNav += '<li>' + helper.linkto(g.longname, g.name) + '</li>';
        }
        seen[g.longname] = true;
      });

      if (!globalNav) {
        // turn the heading into a link so you can actually get to the global page
        nav += `<h3>${helper.linkto('global', 'Global')}</h3>`;

      } else {
        nav += `'<h3>Global</h3><ul>${globalNav}</ul>'`;
      }
    }

    return nav;
  }

  copyStaticFiles() {
    // copy the template's static files to outdir
    const fromDir = path.join(this.THEME_PATH, 'static');
    const staticFiles = fs.ls(fromDir, 3);

    staticFiles.forEach((fileName) => {
      const toDir = fs.toDir( fileName.replace(fromDir, this.DOCS_DEST) );

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
      const staticFileFilter = new (require('jsdoc/src/filter')).Filter(staticFiles);
      const staticFileScanner = new (require('jsdoc/src/scanner')).Scanner();

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

  generate({ title, docs, filename, resolveLinks }) {
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

  generateSourceFiles(sourceFiles, encoding = 'utf8') {
    Object.keys(sourceFiles).forEach((file) => {
      // links are keyed to the shortened path in each doclet's `meta.shortpath` property
      const sourceOutfile = helper.getUniqueFilename(sourceFiles[file].shortened);
      let source;

      helper.registerLink(sourceFiles[file].shortened, sourceOutfile);

      try {
        source = {
          kind: 'source',
          code: helper.htmlsafe( fs.readFileSync(sourceFiles[file].resolved, encoding) )
        };
      } catch (e) {
        logger.error('Error while generating source file %s: %s', file, e.message);
      }

      this.generate('Source: ' + sourceFiles[file].shortened, [source], sourceOutfile, false);
    });
  }


  // TODO: move the tutorial functions to templateHelper.js
  generateTutorial(title, tutorial, filename) {
    const tutorialData = {
      title: title,
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
          shortened: null
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

  graft(parentNode, childNodes, parentLongname) {
    childNodes
      .filter((element) => {
        return (element.memberof === parentLongname);
      })
      .forEach((element) => {
        let i;
        let len;
        let thisClass;
        let thisEvent;
        let thisFunction;
        let thisMixin;
        let thisNamespace;

        if (element.kind === 'namespace') {
          if (!parentNode.namespaces) {
            parentNode.namespaces = [];
          }

          thisNamespace = {
            'name': element.name,
            'description': element.description || '',
            'access': element.access || '',
            'virtual': Boolean(element.virtual)
          };

          parentNode.namespaces.push(thisNamespace);

          this.graft(thisNamespace, childNodes, element.longname);
        } else if (element.kind === 'mixin') {
          if (!parentNode.mixins) {
            parentNode.mixins = [];
          }

          thisMixin = {
            'name': element.name,
            'description': element.description || '',
            'access': element.access || '',
            'virtual': Boolean(element.virtual)
          };

          parentNode.mixins.push(thisMixin);

          this.graft(thisMixin, childNodes, element.longname);
        } else if (element.kind === 'function') {
          if (!parentNode.functions) {
            parentNode.functions = [];
          }

          thisFunction = {
            'name': element.name,
            'access': element.access || '',
            'virtual': Boolean(element.virtual),
            'description': element.description || '',
            'parameters': [],
            'examples': []
          };

          parentNode.functions.push(thisFunction);

          if (element.returns) {
            thisFunction.returns = {
              'type': element.returns[0].type? (element.returns[0].type.names.length === 1 ? element.returns[0].type.names[0] : element.returns[0].type.names) : '',
              'description': element.returns[0].description || ''
            };
          }

          if (element.examples) {
            for (i = 0, len = element.examples.length; i < len; i++) {
              thisFunction.examples.push(element.examples[i]);
            }
          }

          if (element.params) {
            for (i = 0, len = element.params.length; i < len; i++) {
              thisFunction.parameters.push({
                'name': element.params[i].name,
                'type': element.params[i].type? (element.params[i].type.names.length === 1 ? element.params[i].type.names[0] : element.params[i].type.names) : '',
                'description': element.params[i].description || '',
                'default': hasOwnProp.call(element.params[i], 'defaultvalue') ? element.params[i].defaultvalue : '',
                'optional': typeof element.params[i].optional === 'boolean'? element.params[i].optional : '',
                'nullable': typeof element.params[i].nullable === 'boolean'? element.params[i].nullable : ''
              });
            }
          }
        } else if (element.kind === 'member') {
          if (!parentNode.properties) {
            parentNode.properties = [];
          }

          parentNode.properties.push({
            'name': element.name,
            'access': element.access || '',
            'virtual': Boolean(element.virtual),
            'description': element.description || '',
            'type': element.type? (element.type.length === 1 ? element.type[0] : element.type) : ''
          });
        } else if (element.kind === 'event') {
          if (!parentNode.events) {
            parentNode.events = [];
          }

          thisEvent = {
            'name': element.name,
            'access': element.access || '',
            'virtual': Boolean(element.virtual),
            'description': element.description || '',
            'parameters': [],
            'examples': []
          };

          parentNode.events.push(thisEvent);

          if (element.returns) {
            thisEvent.returns = {
              'type': element.returns.type ? (element.returns.type.names.length === 1 ? element.returns.type.names[0] : element.returns.type.names) : '',
              'description': element.returns.description || ''
            };
          }

          if (element.examples) {
            for (i = 0, len = element.examples.length; i < len; i++) {
              thisEvent.examples.push(element.examples[i]);
            }
          }

          if (element.params) {
            for (i = 0, len = element.params.length; i < len; i++) {
              thisEvent.parameters.push({
                'name': element.params[i].name,
                'type': element.params[i].type? (element.params[i].type.names.length === 1? element.params[i].type.names[0] : element.params[i].type.names) : '',
                'description': element.params[i].description || '',
                'default': hasOwnProp.call(element.params[i], 'defaultvalue') ? element.params[i].defaultvalue : '',
                'optional': typeof element.params[i].optional === 'boolean'? element.params[i].optional : '',
                'nullable': typeof element.params[i].nullable === 'boolean'? element.params[i].nullable : ''
              });
            }
          }
        } else if (element.kind === 'class') {
          if (!parentNode.classes) {
            parentNode.classes = [];
          }

          thisClass = {
            'name': element.name,
            'description': element.classdesc || '',
            'extends': element.augments || [],
            'access': element.access || '',
            'virtual': Boolean(element.virtual),
            'fires': element.fires || '',
            'constructor': {
              'name': element.name,
              'description': element.description || '',
              'parameters': [
              ],
              'examples': []
            }
          };

          parentNode.classes.push(thisClass);

          if (element.examples) {
            for (i = 0, len = element.examples.length; i < len; i++) {
              thisClass.constructor.examples.push(element.examples[i]);
            }
          }

          if (element.params) {
            for (i = 0, len = element.params.length; i < len; i++) {
              thisClass.constructor.parameters.push({
                'name': element.params[i].name,
                'type': element.params[i].type? (element.params[i].type.names.length === 1? element.params[i].type.names[0] : element.params[i].type.names) : '',
                'description': element.params[i].description || '',
                'default': hasOwnProp.call(element.params[i], 'defaultvalue') ? element.params[i].defaultvalue : '',
                'optional': typeof element.params[i].optional === 'boolean'? element.params[i].optional : '',
                'nullable': typeof element.params[i].nullable === 'boolean'? element.params[i].nullable : ''
              });
            }
          }

          this.graft(thisClass, childNodes, element.longname);
        }
      });
  }

  // tutorials can have only one parent so there is no risk for loops
  saveChildren(node) {
    node.children.forEach((child) => {
      this.generateTutorial('Tutorial: ' + child.title, child, helper.tutorialToUrl(child.name));
      this.saveChildren(child);
    });
  }

  setupViewHelpers(view) {
    // add template helpers
    view.find = spec => helper.find(data, spec);
    view.linkto = helper.linkto;
    view.resolveAuthorLinks = tools.resolveAuthorLinks;
    view.tutoriallink = tools.tutorialLink;
    view.htmlsafe = helper.htmlsafe;
    // view.outputSourceFiles = outputSourceFiles;

    // once for all
    // view.nav = this.buildNav(members);
  }


  publish() {
    const root = {};

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
          path.basename(this.conf.templates.default.layoutFile)
        )
      : 'layout.tmpl';


    // this.graft(root, docs);


    ///////////////////////////////////////////////////////////////////////////

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
      sourceFiles = tools.shortenPaths( sourceFiles, path.commonPrefix(sourceFilePaths) );
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

    this.view.nav = this.buildNav(members);

    tools.attachModuleSymbols( helper.find(data, { longname: { left: 'module:' } }), members.modules );

    // output pretty-printed source files by default
    const outputSourceFiles = this.conf.default && this.conf.default.outputSourceFiles !== false;

    // generate the pretty-printed source files first so other pages can link to them
    if (outputSourceFiles) {
      this.generateSourceFiles(sourceFiles, this.conf.opts.encoding);
    }

    if (false && members.globals.length) {
      this.generate({
        title: 'Global',
        docs: [{ kind: 'globalobj' }],
        filename: globalUrl,
      });
    }

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

    // set up the lists that we'll use to generate pages
    const classes = taffy(members.classes);
    const modules = taffy(members.modules);
    const namespaces = taffy(members.namespaces);
    const mixins = taffy(members.mixins);
    const externals = taffy(members.externals);
    const interfaces = taffy(members.interfaces);

    Object.keys(helper.longnameToUrl).forEach((longname) => {
      const myClasses = helper.find(classes, {longname: longname});
      const myExternals = helper.find(externals, {longname: longname});
      const myInterfaces = helper.find(interfaces, {longname: longname});
      const myMixins = helper.find(mixins, {longname: longname});
      const myModules = helper.find(modules, {longname: longname});
      const myNamespaces = helper.find(namespaces, {longname: longname});

      return;

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


    ///////////////////////////////////////////////////////////////////////////

    const docs = data().get();

    if (this.conf.opts.destination === 'console') {
      console.log(dumper.dump(docs));

    } else {
      fs.writeFileSync(path.resolve(this.DOCS_DEST, 'dist/docs.json'), dumper.dump(docs), 'utf8');
      fs.writeFileSync(path.resolve(this.DOCS_DEST, 'dist/members.json'), dumper.dump(members), 'utf8');

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
exports.publish = function (taffyData, opts, tutorials) {
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

