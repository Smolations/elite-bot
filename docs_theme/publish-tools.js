/* eslint no-param-reassign:off, no-plusplus:off */

const util = require('util');

const doop = require('jsdoc/util/doop');
const helper = require('jsdoc/util/templateHelper');
const path = require('jsdoc/path');


const publishTools = {
  /**
   *  Assigns `f.attribs` to a formatted html string.
   *  @param {object} f function doclet?
   */
  addAttribs(f) {
    const attribs = helper.getAttribs(f);
    const attribsString = publishTools.buildAttribsString(attribs);

    f.attribs = util.format('<span class="type-signature">%s</span>', attribsString);
  },

  /**
   *  @returns {array.<string>}
   */
  addNonParamAttributes(items) {
    let types = [];

    items.forEach((item) => {
      types = types.concat(publishTools.buildItemTypeStrings(item));
    });

    return types;
  },

  /**
   *  @returns {array.<params?>} A filtered version of the given params.
   */
  addParamAttributes(params) {
    return params.filter(param => param.name && param.name.indexOf('.') === -1).map(publishTools.updateItemName);
  },

  /**
   *  Assigns `f.signature` to a formatted html string.
   *  @param {object} f function doclet? @todo investigate
   */
  addSignatureParams(f) {
    const params = f.params ? publishTools.addParamAttributes(f.params) : [];

    f.signature = util.format('%s(%s)', (f.signature || ''), params.join(', '));
  },

  /**
   *  Assigns `f.signature` to a formatted html string decorating the previous value.
   *  @param {object} f function doclet?
   */
  addSignatureReturns(f) {
    const attribs = [];
    const source = f.yields || f.returns;
    let attribsString = '';
    let returnTypes = [];
    let returnTypesString = '';

    // jam all the return-type attributes into an array. this could create odd results (for example,
    // if there are both nullable and non-nullable return types), but let's assume that most people
    // who use multiple @return tags aren't using Closure Compiler type annotations, and vice-versa.
    if (source) {
      source.forEach((item) => {
        helper.getAttribs(item).forEach((attrib) => {
          if (attribs.indexOf(attrib) === -1) {
            attribs.push(attrib);
          }
        });
      });

      attribsString = publishTools.buildAttribsString(attribs);
    }

    if (source) {
      returnTypes = publishTools.addNonParamAttributes(source);
    }

    if (returnTypes.length) {
      returnTypesString = util.format(' &rarr; %s{%s}', attribsString, returnTypes.join('|'));
    }

    f.signature = `<span class="signature">${f.signature || ''}</span>` +
        `<span class="type-signature">${returnTypesString}</span>`;
  },

  /**
   *  Modifies `f.signature` by appending a formatted html string with type info.
   *  @param {object} f function doclet?
   */
  addSignatureTypes(f) {
    const types = f.type ? publishTools.buildItemTypeStrings(f) : [];

    f.signature = `${f.signature || ''}<span class="type-signature">${
      types.length ? ` :${types.join('|')}` : ''}</span>`;
  },

  /**
   * Look for classes or functions with the same name as modules (which indicates that the module
   * exports only that class or function), then attach the classes or functions to the `module`
   * property of the appropriate module doclets. The name of each class or function is also updated
   * for display purposes. This function mutates the original arrays.
   *
   * @private
   * @param {Array.<module:jsdoc/doclet.Doclet>} doclets - The array of classes and functions to
   * check.
   * @param {Array.<module:jsdoc/doclet.Doclet>} modules - The array of module doclets to search.
   */
  attachModuleSymbols(doclets, modules) {
    const symbols = {};

    // build a lookup table
    doclets.forEach((symbol) => {
      symbols[symbol.longname] = symbols[symbol.longname] || [];
      symbols[symbol.longname].push(symbol);
    });

    modules.forEach((module) => {
      if (symbols[module.longname]) {
        module.modules = symbols[module.longname]
          // Only show symbols that have a description. Make an exception for classes, because
          // we want to show the constructor-signature heading no matter what.
          .filter(symbol => symbol.description || symbol.kind === 'class')
          .map((symbol) => {
            symbol = doop(symbol);

            if (symbol.kind === 'class' || symbol.kind === 'function') {
              symbol.name = `${symbol.name.replace('module:', '(require("')}"))`;
            }

            return symbol;
          });
      }
    });
  },

  /**
   *  @returns {string} HTML-Safe string formatted with given `attribs`.
   */
  buildAttribsString(attribs) {
    let attribsString = '';

    if (attribs && attribs.length) {
      attribsString = helper.htmlsafe(util.format('(%s) ', attribs.join(', ')));
    }

    return attribsString;
  },

  /**
   *  @returns {array.<string>} HTML fragments with links?
   */
  buildItemTypeStrings(item) {
    const types = [];

    if (item && item.type && item.type.names) {
      item.type.names.forEach((name) => {
        const safeName = helper.htmlsafe(name);
        types.push(helper.linkto(name, safeName));
      });
    }

    return types;
  },

  /**
   *  @returns {null} If there is no `doclet.meta` property.
   *  @returns {string} Path to source file.
   */
  getPathFromDoclet(doclet) {
    if (!doclet.meta) {
      return null;
    }

    return doclet.meta.path && doclet.meta.path !== 'null'
      ? path.join(doclet.meta.path, doclet.meta.filename)
      : doclet.meta.filename;
  },

  /**
   *  @returns {array.<string>}
   */
  getSignatureAttributes(item) {
    const attributes = [];

    if (item.optional) {
      attributes.push('opt');
    }

    if (item.nullable === true) {
      attributes.push('nullable');
    } else if (item.nullable === false) {
      attributes.push('non-null');
    }

    return attributes;
  },

  /**
   *  @returns {string} HTML anchor
   */
  hashToLink(doclet, hash) {
    const hashPattern = /^(#.+)/;
    let url;

    if (!hashPattern.test(hash)) {
      return hash;
    }

    url = helper.createLink(doclet);
    url = url.replace(/(#.+|$)/, hash);

    return `<a href="${url}">${hash}</a>`;
  },

  /**
   *  not sure why this doesn't pay attention to longName..in dev?
   *
   *  @param {string} longName
   *  @param {string} name
   *  @returns {string} HTML anchor
   */
  linktoTutorial(longName, name) {
    return publishTools.tutorialLink(name);
  },

  /**
   *  @param {string} longName
   *  @param {string} name
   *  @returns {string} HTML anchor
   */
  linktoExternal(longName, name) {
    return helper.linkto(longName, name.replace(/(^"|"$)/g, ''));
  },

  /**
   *  @returns {bool}
   */
  needsSignature(doclet) {
    let needsSig = false;

    // function and class definitions always get a signature
    if (doclet.kind === 'function' || doclet.kind === 'class') {
      needsSig = true;

    // typedefs that contain functions get a signature, too
    } else if (doclet.kind === 'typedef' && doclet.type && doclet.type.names &&
      doclet.type.names.length) {
      for (let i = 0, l = doclet.type.names.length; i < l; i++) {
        if (doclet.type.names[i].toLowerCase() === 'function') {
          needsSig = true;
          break;
        }
      }

    // and namespaces that are functions get a signature (but finding them is a
    // bit messy)
    } else if (doclet.kind === 'namespace' && doclet.meta && doclet.meta.code &&
        doclet.meta.code.type && doclet.meta.code.type.match(/[Ff]unction/)) {
      needsSig = true;
    }

    return needsSig;
  },

  /**
   *  Removes a common prefix from a given `files` object and assigns
   *  it to each file's `.shortened` property.
   *
   *  @param {object?} files
   *  @param {string} commonPrefix
   *  @returns {object?} Modified `files`.
   */
  shortenPaths(files, commonPrefix) {
    Object.keys(files).forEach((file) => {
      files[file].shortened = files[file].resolved.replace(commonPrefix, '')
        .replace(/\\/g, '/'); // always use forward slashes
    });

    return files;
  },

  /**
   *  @returns {} tutorial string? (helper.toTutorial())
   */
  tutorialLink(tutorial) {
    return helper.toTutorial(tutorial, null, {
      tag: 'em',
      classname: 'disabled',
      prefix: 'Tutorial: ',
    });
  },

  /**
   *  @returns {string} HTML fragment
   */
  updateItemName(item) {
    const attributes = publishTools.getSignatureAttributes(item);
    let itemName = item.name || '';

    if (item.variable) {
      itemName = `&hellip;${itemName}`;
    }

    if (attributes && attributes.length) {
      itemName = util.format(
        '%s<span class="signature-attributes">%s</span>',
        itemName, attributes.join(', '),
      );
    }

    return itemName;
  },
};


module.exports = publishTools;
