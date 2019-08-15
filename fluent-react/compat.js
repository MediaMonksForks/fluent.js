/* fluent-react@0.8.3 */
(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('react'), require('prop-types'), require('fluent-sequence/compat'), require('cached-iterable/compat')) :
  typeof define === 'function' && define.amd ? define('fluent-react', ['exports', 'react', 'prop-types', 'fluent-sequence/compat', 'cached-iterable/compat'], factory) :
  (global = global || self, factory(global.FluentReact = {}, global.React, global.PropTypes, global.FluentSequence, global.CachedIterable));
}(this, function (exports, react, PropTypes, compat, compat$1) { 'use strict';

  PropTypes = PropTypes && PropTypes.hasOwnProperty('default') ? PropTypes['default'] : PropTypes;

  /*
   * `ReactLocalization` handles translation formatting and fallback.
   *
   * The current negotiated fallback chain of languages is stored in the
   * `ReactLocalization` instance in form of an iterable of `FluentBundle`
   * instances.  This iterable is used to find the best existing translation for
   * a given identifier.
   *
   * `Localized` components must subscribe to the changes of the
   * `ReactLocalization`'s fallback chain.  When the fallback chain changes (the
   * `bundles` iterable is set anew), all subscribed compontent must relocalize.
   *
   * The `ReactLocalization` class instances are exposed to `Localized` elements
   * via the `LocalizationProvider` component.
   */

  class ReactLocalization {
    constructor(bundles) {
      this.bundles = compat$1.CachedSyncIterable.from(bundles);
      this.subs = new Set();
    }
    /*
     * Subscribe a `Localized` component to changes of `bundles`.
     */


    subscribe(comp) {
      this.subs.add(comp);
    }
    /*
     * Unsubscribe a `Localized` component from `bundles` changes.
     */


    unsubscribe(comp) {
      this.subs.delete(comp);
    }
    /*
     * Set a new `bundles` iterable and trigger the retranslation.
     */


    setBundles(bundles) {
      this.bundles = compat$1.CachedSyncIterable.from(bundles); // Update all subscribed Localized components.

      this.subs.forEach(comp => comp.relocalize());
    }

    getBundle(id) {
      return compat.mapBundleSync(this.bundles, id);
    }
    /*
     * Find a translation by `id` and format it to a string using `args`.
     */


    getString(id, args, fallback) {
      var bundle = this.getBundle(id);

      if (bundle === null) {
        return fallback || id;
      }

      var msg = bundle.getMessage(id);
      return bundle.format(msg, args);
    }

  }
  function isReactLocalization(props, propName) {
    var prop = props[propName];

    if (prop instanceof ReactLocalization) {
      return null;
    }

    return new Error("The ".concat(propName, " context field must be an instance of ReactLocalization."));
  }

  /* eslint-env browser */
  var cachedParseMarkup; // We use a function creator to make the reference to `document` lazy. At the
  // same time, it's eager enough to throw in <LocalizationProvider> as soon as
  // it's first mounted which reduces the risk of this error making it to the
  // runtime without developers noticing it in development.

  function createParseMarkup() {
    if (typeof document === "undefined") {
      // We can't use <template> to sanitize translations.
      throw new Error("`document` is undefined. Without it, translations cannot " + "be safely sanitized. Consult the documentation at " + "https://github.com/projectfluent/fluent.js/wiki/React-Overlays.");
    }

    if (!cachedParseMarkup) {
      var template = document.createElement("template");

      cachedParseMarkup = function parseMarkup(str) {
        template.innerHTML = str;
        return Array.from(template.content.childNodes);
      };
    }

    return cachedParseMarkup;
  }

  /*
   * The Provider component for the `ReactLocalization` class.
   *
   * Exposes a `ReactLocalization` instance to all descendants via React's
   * context feature.  It makes translations available to all localizable
   * elements in the descendant's render tree without the need to pass them
   * explicitly.
   *
   *     <LocalizationProvider bundles={…}>
   *         …
   *     </LocalizationProvider>
   *
   * The `LocalizationProvider` component takes one prop: `bundles`.  It should
   * be an iterable of `FluentBundle` instances in order of the user's
   * preferred languages.  The `FluentBundle` instances will be used by
   * `ReactLocalization` to format translations.  If a translation is missing in
   * one instance, `ReactLocalization` will fall back to the next one.
   */

  class LocalizationProvider extends react.Component {
    constructor(props) {
      super(props);
      var bundles = props.bundles,
          parseMarkup = props.parseMarkup;

      if (bundles === undefined) {
        throw new Error("LocalizationProvider must receive the bundles prop.");
      }

      if (!bundles[Symbol.iterator]) {
        throw new Error("The bundles prop must be an iterable.");
      }

      this.l10n = new ReactLocalization(bundles);
      this.parseMarkup = parseMarkup || createParseMarkup();
    }

    getChildContext() {
      return {
        l10n: this.l10n,
        parseMarkup: this.parseMarkup
      };
    }

    componentWillReceiveProps(next) {
      var bundles = next.bundles;

      if (bundles !== this.props.bundles) {
        this.l10n.setBundles(bundles);
      }
    }

    render() {
      return react.Children.only(this.props.children);
    }

  }
  LocalizationProvider.childContextTypes = {
    l10n: isReactLocalization,
    parseMarkup: PropTypes.func
  };
  LocalizationProvider.propTypes = {
    children: PropTypes.element.isRequired,
    bundles: isIterable,
    parseMarkup: PropTypes.func
  };

  function isIterable(props, propName, componentName) {
    var prop = props[propName];

    if (Symbol.iterator in Object(prop)) {
      return null;
    }

    return new Error("The ".concat(propName, " prop supplied to ").concat(componentName, " must be an iterable."));
  }

  function withLocalization(Inner) {
    class WithLocalization extends react.Component {
      componentDidMount() {
        var l10n = this.context.l10n;

        if (l10n) {
          l10n.subscribe(this);
        }
      }

      componentWillUnmount() {
        var l10n = this.context.l10n;

        if (l10n) {
          l10n.unsubscribe(this);
        }
      }
      /*
       * Rerender this component in a new language.
       */


      relocalize() {
        // When the `ReactLocalization`'s fallback chain changes, update the
        // component.
        this.forceUpdate();
      }
      /*
       * Find a translation by `id` and format it to a string using `args`.
       */


      getString(id, args, fallback) {
        var l10n = this.context.l10n;

        if (!l10n) {
          return fallback || id;
        }

        return l10n.getString(id, args, fallback);
      }

      render() {
        var _this = this;

        return react.createElement(Inner, Object.assign( // getString needs to be re-bound on updates to trigger a re-render
        {
          getString: function getString() {
            return _this.getString(...arguments);
          }
        }, this.props));
      }

    }

    WithLocalization.displayName = "WithLocalization(".concat(displayName(Inner), ")");
    WithLocalization.contextTypes = {
      l10n: isReactLocalization
    };
    return WithLocalization;
  }

  function displayName(component) {
    return component.displayName || component.name || "Component";
  }

  function _defineProperty(obj, key, value) {
    if (key in obj) {
      Object.defineProperty(obj, key, {
        value: value,
        enumerable: true,
        configurable: true,
        writable: true
      });
    } else {
      obj[key] = value;
    }

    return obj;
  }

  function ownKeys(object, enumerableOnly) {
    var keys = Object.keys(object);

    if (Object.getOwnPropertySymbols) {
      var symbols = Object.getOwnPropertySymbols(object);
      if (enumerableOnly) symbols = symbols.filter(function (sym) {
        return Object.getOwnPropertyDescriptor(object, sym).enumerable;
      });
      keys.push.apply(keys, symbols);
    }

    return keys;
  }

  function _objectSpread2(target) {
    for (var i = 1; i < arguments.length; i++) {
      var source = arguments[i] != null ? arguments[i] : {};

      if (i % 2) {
        ownKeys(source, true).forEach(function (key) {
          _defineProperty(target, key, source[key]);
        });
      } else if (Object.getOwnPropertyDescriptors) {
        Object.defineProperties(target, Object.getOwnPropertyDescriptors(source));
      } else {
        ownKeys(source).forEach(function (key) {
          Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key));
        });
      }
    }

    return target;
  }

  function _slicedToArray(arr, i) {
    return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _nonIterableRest();
  }

  function _arrayWithHoles(arr) {
    if (Array.isArray(arr)) return arr;
  }

  function _iterableToArrayLimit(arr, i) {
    var _arr = [];
    var _n = true;
    var _d = false;
    var _e = undefined;

    try {
      for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) {
        _arr.push(_s.value);

        if (i && _arr.length === i) break;
      }
    } catch (err) {
      _d = true;
      _e = err;
    } finally {
      try {
        if (!_n && _i["return"] != null) _i["return"]();
      } finally {
        if (_d) throw _e;
      }
    }

    return _arr;
  }

  function _nonIterableRest() {
    throw new TypeError("Invalid attempt to destructure non-iterable instance");
  }

  /**
   * Copyright (c) 2013-present, Facebook, Inc.
   *
   * This source code is licensed under the MIT license found in the
   * LICENSE file in this directory.
   */
  // For HTML, certain tags should omit their close tag. We keep a whitelist for
  // those special-case tags.
  var omittedCloseTags = {
    area: true,
    base: true,
    br: true,
    col: true,
    embed: true,
    hr: true,
    img: true,
    input: true,
    keygen: true,
    link: true,
    meta: true,
    param: true,
    source: true,
    track: true,
    wbr: true // NOTE: menuitem's close tag should be omitted, but that causes problems.

  };

  // `omittedCloseTags` except that `menuitem` should still have its closing tag.

  var voidElementTags = _objectSpread2({
    menuitem: true
  }, omittedCloseTags);

  // &amp;, &#0038;, &#x0026;.

  var reMarkup = /<|&#?\w+;/;
  /*
   * Prepare props passed to `Localized` for formatting.
   */

  function toArguments(props) {
    var args = {};
    var elems = {};

    for (var _i = 0, _Object$entries = Object.entries(props); _i < _Object$entries.length; _i++) {
      var _Object$entries$_i = _slicedToArray(_Object$entries[_i], 2),
          propname = _Object$entries$_i[0],
          propval = _Object$entries$_i[1];

      if (propname.startsWith("$")) {
        var name = propname.substr(1);
        args[name] = propval;
      } else if (react.isValidElement(propval)) {
        // We'll try to match localNames of elements found in the translation with
        // names of elements passed as props. localNames are always lowercase.
        var _name = propname.toLowerCase();

        elems[_name] = propval;
      }
    }

    return [args, elems];
  }
  /*
   * The `Localized` class renders its child with translated props and children.
   *
   *     <Localized id="hello-world">
   *         <p>{'Hello, world!'}</p>
   *     </Localized>
   *
   * The `id` prop should be the unique identifier of the translation.  Any
   * attributes found in the translation will be applied to the wrapped element.
   *
   * Arguments to the translation can be passed as `$`-prefixed props on
   * `Localized`.
   *
   *     <Localized id="hello-world" $username={name}>
   *         <p>{'Hello, { $username }!'}</p>
   *     </Localized>
   *
   *  It's recommended that the contents of the wrapped component be a string
   *  expression.  The string will be used as the ultimate fallback if no
   *  translation is available.  It also makes it easy to grep for strings in the
   *  source code.
   */


  class Localized extends react.Component {
    componentDidMount() {
      var l10n = this.context.l10n;

      if (l10n) {
        l10n.subscribe(this);
      }
    }

    componentWillUnmount() {
      var l10n = this.context.l10n;

      if (l10n) {
        l10n.unsubscribe(this);
      }
    }
    /*
     * Rerender this component in a new language.
     */


    relocalize() {
      // When the `ReactLocalization`'s fallback chain changes, update the
      // component.
      this.forceUpdate();
    }

    render() {
      var _this$context = this.context,
          l10n = _this$context.l10n,
          parseMarkup = _this$context.parseMarkup;
      var _this$props = this.props,
          id = _this$props.id,
          attrs = _this$props.attrs,
          elem = _this$props.children; // Validate that the child element isn't an array

      if (Array.isArray(elem)) {
        throw new Error("<Localized/> expected to receive a single React node child");
      }

      if (!l10n) {
        // Use the wrapped component as fallback.
        return elem;
      }

      var bundle = l10n.getBundle(id);

      if (bundle === null) {
        // Use the wrapped component as fallback.
        return elem;
      }

      var msg = bundle.getMessage(id);

      var _toArguments = toArguments(this.props),
          _toArguments2 = _slicedToArray(_toArguments, 2),
          args = _toArguments2[0],
          elems = _toArguments2[1];

      var messageValue = bundle.format(msg, args); // Check if the fallback is a valid element -- if not then it's not
      // markup (e.g. nothing or a fallback string) so just use the
      // formatted message value

      if (!react.isValidElement(elem)) {
        return messageValue;
      } // The default is to forbid all message attributes. If the attrs prop exists
      // on the Localized instance, only set message attributes which have been
      // explicitly allowed by the developer.


      if (attrs && msg.attrs) {
        var localizedProps = {};

        for (var _i2 = 0, _Object$entries2 = Object.entries(attrs); _i2 < _Object$entries2.length; _i2++) {
          var _Object$entries2$_i = _slicedToArray(_Object$entries2[_i2], 2),
              name = _Object$entries2$_i[0],
              allowed = _Object$entries2$_i[1];

          if (allowed && msg.attrs.hasOwnProperty(name)) {
            localizedProps[name] = bundle.format(msg.attrs[name], args);
          }
        }
      } // If the wrapped component is a known void element, explicitly dismiss the
      // message value and do not pass it to cloneElement in order to avoid the
      // "void element tags must neither have `children` nor use
      // `dangerouslySetInnerHTML`" error.


      if (elem.type in voidElementTags && voidElementTags[elem.type] !== undefined) {
        return react.cloneElement(elem, localizedProps);
      } // If the message has a null value, we're only interested in its attributes.
      // Do not pass the null value to cloneElement as it would nuke all children
      // of the wrapped component.


      if (messageValue === null) {
        return react.cloneElement(elem, localizedProps);
      } // If the message value doesn't contain any markup nor any HTML entities,
      // insert it as the only child of the wrapped component.


      if (!reMarkup.test(messageValue)) {
        return react.cloneElement(elem, localizedProps, messageValue);
      } // If the message contains markup, parse it and try to match the children
      // found in the translation with the props passed to this Localized.


      var translationNodes = parseMarkup(messageValue);
      var translatedChildren = translationNodes.map(childNode => {
        if (childNode.nodeType === childNode.TEXT_NODE) {
          return childNode.textContent;
        } // If the child is not expected just take its textContent.


        if (!elems.hasOwnProperty(childNode.localName)) {
          return childNode.textContent;
        }

        var sourceChild = elems[childNode.localName]; // If the element passed as a prop to <Localized> is a known void element,
        // explicitly dismiss any textContent which might have accidentally been
        // defined in the translation to prevent the "void element tags must not
        // have children" error.

        if (sourceChild.type in voidElementTags) {
          return sourceChild;
        } // TODO Protect contents of elements wrapped in <Localized>
        // https://github.com/projectfluent/fluent.js/issues/184
        // TODO  Control localizable attributes on elements passed as props
        // https://github.com/projectfluent/fluent.js/issues/185


        return react.cloneElement(sourceChild, null, childNode.textContent);
      });
      return react.cloneElement(elem, localizedProps, ...translatedChildren);
    }

  }
  Localized.contextTypes = {
    l10n: isReactLocalization,
    parseMarkup: PropTypes.func
  };
  Localized.propTypes = {
    children: PropTypes.node
  };

  exports.LocalizationProvider = LocalizationProvider;
  exports.Localized = Localized;
  exports.ReactLocalization = ReactLocalization;
  exports.isReactLocalization = isReactLocalization;
  exports.withLocalization = withLocalization;

  Object.defineProperty(exports, '__esModule', { value: true });

}));
