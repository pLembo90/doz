const extend = require('../utils/extend');
const {register} = require('../collection');
const html = require('../utils/html');
const {REGEX, TAG} = require('../constants');
const collection = require('../collection');
const observer = require('./observer');
const events = require('./events');
const {transform, serializeProps} = require('../vdom/parser');
const update = require('../vdom').updateElement;
const castStringTo = require('../utils/cast-string-to');
const store = require('./store');
const {extract} = require('./d-props');

function component(tag, cfg = {}) {

    if (typeof tag !== 'string') {
        throw new TypeError('Tag must be a string');
    }

    if (!REGEX.IS_CUSTOM_TAG.test(tag)) {
        throw new TypeError('Tag must contain a dash (-): my-component');
    }

    const cmp = {};

    cmp.tag = tag;

    cmp.cfg = extend.copy(cfg, {
        template() {
            return '<div></div>'
        },
        props: {}
    });

    register(cmp);
}

function getInstances(root, template, view, parentCmp) {

    template = typeof template === 'string'
        ? html.create(template)
        : template;

    const nodes = html.getAllNodes(template);
    let components = {};
    let index = 0;

    nodes.forEach(child => {
        if (child.nodeType === 1 && child.parentNode) {

            const cmp = collection.get(child.nodeName) || view._components[child.nodeName.toLowerCase()];
            if (cmp) {

                let alias = index;
                index++;
                const props = serializeProps(child);
                const dProps = extract(props);

                const newElement = createInstance(cmp, {
                    root,
                    view,
                    props,
                    dProps,
                    parentCmp
                });

                // Remove old
                child.parentNode.removeChild(child);
                newElement.render();
                events.callRender(newElement);
                components[dProps.alias ? dProps.alias : alias] = newElement;

                const nested = newElement._rootElement.querySelectorAll('*');
                //console.log(child.nodeName, dProps, props);
                Array.from(nested).forEach(item => {
                    if (REGEX.IS_CUSTOM_TAG.test(item.nodeName) && [TAG.EACH, TAG.ROOT].indexOf(item.nodeName.toLowerCase()) === -1) {

                        const template = item.outerHTML;
                        const rootElement = document.createElement(item.nodeName);
                        item.parentNode.replaceChild(rootElement, item);
                        const cmps = getInstances(rootElement, template, view, newElement);

                        Object.keys(cmps).forEach(i => {
                            let n = i;
                            if (newElement.children.hasOwnProperty(n)) {
                                if (typeof castStringTo(n) === 'number') {
                                    n++
                                }
                            }
                            newElement.children[n] = cmps[i]

                        })
                    }
                });
            }
        }
    });

    return components;
}

function createInstance(cmp, cfg) {
    const props = extend.copy(cfg.props, typeof cmp.cfg.props === 'function'
        ? cmp.cfg.props()
        : cmp.cfg.props
    );

    const instance = Object.defineProperties({}, {
        _isCreated: {
            value: false,
            writable: true
        },
        _prev: {
            value: null,
            writable: true
        },
        _prevProps: {
            value: null,
            writable: true
        },
        _rootElement: {
            value: null,
            writable: true
        },
        _boundElements: {
            value: {},
            writable: true
        },
        _callback: {
            value: cfg.dProps['callback'],
            writable: true
        },
        _view: {
            value: cfg.view
        },
        parent: {
            value: cfg.parentCmp,
            enumerable: true
        },
        ref: {
            value: {},
            writable: true,
            enumerable: true
        },
        children: {
            value: {},
            writable: true,
            enumerable: true
        },
        tag: {
            value: cmp.tag,
            enumerable: true
        },
        fire: {
            value: function (name, ...args) {
                if (this._callback && this._callback.hasOwnProperty(name)
                    && this.parent.hasOwnProperty(this._callback[name])
                    && typeof this.parent[this._callback[name]] === 'function') {
                    this.parent[this._callback[name]].apply(this.parent, args);
                }
            },
            enumerable: true
        },
        each: {
            value: function (obj, func) {
                if (Array.isArray(obj))
                    return `<${TAG.EACH}>${obj.map(func).map(e => e.trim()).join('')}</${TAG.EACH}>`;
            },
            enumerable: true
        },
        getStore: {
            value: function (storeName) {
                return this._view.getStore(storeName);
            },
            enumerable: true
        },
        render: {
            value: function () {
                //const tpl = html.create(`<${TAG.ROOT}>${this.template()}</${TAG.ROOT}>`);
                const tag = this.tag ? this.tag + '-root' : TAG.ROOT;
                const tpl = html.create(`<${tag}>${this.template()}</${tag}>`);
                const next = transform(tpl);

                //console.log(next, this._prev)
                const rootElement = update(cfg.root, next, this._prev, 0, this);

                if (!this._rootElement && rootElement) {
                    this._rootElement = rootElement;
                }

                this._prev = next;
            },
            enumerable: true
        },
        destroy: {
            value: function () {
                if (!this._rootElement) return;
                this._rootElement.parentNode.removeChild(this._rootElement);
                events.callDestroy(this);
            },
            enumerable: true
        }
    });

    // Assign cfg to instance
    extendInstance(instance, cmp.cfg, cfg.dProps);
    // Create observer to props
    observer.create(instance, props);
    // Create shared store
    store.create(instance, props);
    // Call create
    events.callCreate(instance);
    // Now instance is created
    instance._isCreated = true;

    return instance;
}

function extendInstance(instance, cfg, dProps) {
    Object.assign(instance, cfg);

    // Overwrite store name with that passed though props
    if (dProps.store)
        instance.store = dProps.store;
}

module.exports = {
    component,
    getInstances
};