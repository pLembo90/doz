const extend = require('defaulty');
const {register} = require('../collection');
const html = require('../utils/html');
const {INSTANCE, PARSER, SIGN} = require('../constants');
const collection = require('../collection');
const helper = require('./helper');
const observer = require('./observer');
const events = require('./events');

function component(tag, cfg = {}) {

    if (typeof tag !== 'string') {
        throw new TypeError('Tag must be a string');
    }

    if (!PARSER.REGEX.TAG.test(tag)) {
        throw new TypeError('Tag must contain a dash (-): my-component');
    }

    const cmp = {};

    cmp.tag = tag;

    cmp.cfg = extend.copy(cfg, {
        template: '<div></div>',
        context: {}
    });

    register(cmp);
}

function getInstances(element) {
    const nodes = html.getAllNodes(element);
    let components = [];

    nodes.forEach(child => {
        if (child.nodeType === 1 && child.parentNode) {

            const cmp = collection.get(child.nodeName);

            if (cmp) {
                const newElement = createInstance(cmp, {
                    props: child.attributes
                });

                newElement.element[INSTANCE] = newElement;

                child.parentNode.replaceChild(newElement.element, child);
                components.push(newElement);

                events.callRender(newElement.context);

                if (newElement.element.querySelectorAll('*').length) {
                    const nestedChild = getInstances(newElement.element.firstChild);
                    if (nestedChild.length) {
                        newElement.child = newElement.child.concat(nestedChild);
                        newElement.context.child = newElement.child;
                    }
                }
            }
        }
    });

    return components;
}

function createInstance(cmp, cfg) {
    const props = {};
    const propsMap = {};
    const listenerHandler = [];
    const listenerModel = [];
    const textNodes = [];
    const forNodes = [];
    const ifNodes = [];
    const fragment = html.create(cmp.cfg.template);
    let placeholderMatch = null;
    let handlerMatch = null;
    let modelMatch = null;
    let forMatch = null;
    let ifMatch = null;

    // Find placeholder into text and transform it into tag
    helper.textToTag(fragment);

    const nodes = html.getAllNodes(fragment);

    // Iterate props by HTMLElement attributes
    Array.from(cfg.props).forEach(prop => {
        props[prop.name] = prop.value;
    });

    nodes.forEach(child => {

        if (child.nodeType === 1) {
            Array.from(child.attributes).forEach(attr => {
                placeholderMatch = attr.value.match(PARSER.REGEX.ATTR);
                handlerMatch = attr.name.match(PARSER.REGEX.HANDLER);
                modelMatch = helper.canModel(child) ? PARSER.REGEX.MODEL.test(attr.name) : false;
                forMatch = PARSER.REGEX.FOR.test(attr.name);
                ifMatch = PARSER.REGEX.IF.test(attr.name);

                // Found listener
                if (handlerMatch) {
                    listenerHandler.push({
                        event: handlerMatch[1],
                        listener: attr.value,
                        element: child
                    });
                    // Found model
                } else if (modelMatch) {
                    listenerModel.push({
                        field: attr.value,
                        element: child
                    });

                } else if (forMatch) {
                    const expMatch = attr.value.match(PARSER.REGEX.FOR_EXP);

                    if (expMatch) {
                        helper.createObjectMap(expMatch[1], propsMap, {
                                _FOR_: true,
                                exp: attr.value,
                                element: child
                            }
                        );
                        //console.log(propsMap)
                    }

                } else if (ifMatch) {

                    // Found placeholder
                } else if (placeholderMatch) {
                    const placeholder = placeholderMatch[1];
                    let element;

                    if (child.nodeName.toLowerCase() === PARSER.TAG.TEXT) {
                        element = document.createTextNode('');
                        textNodes.push({
                            old: child,
                            new: element
                        });
                    } else {
                        element = attr;
                    }

                    // Sign component
                    element[SIGN] = true;
                    helper.createObjectMap(placeholder, propsMap, element);
                }
            });
        }
    });

    //console.log(textNodes);
    // Remove tag text added above
    helper.tagToText(textNodes);

    let context = {};
    let isCreated = false;

    let proxyContext = observer.create(context, false, changes => {

        updateComponent(changes, propsMap);

        if (isCreated) {
            events.callUpdate(context);
        }
    });

    observer.beforeChange(proxyContext, changes => {
        // Clone context to preventing update looping
        const res = events.callBeforeUpdate(Object.assign({}, proxyContext));
        if (res === false)
            return false;
    });

    const instance = {
        tag: cmp.tag,
        props,
        propsMap,
        child: [],
        element: fragment,
        context: proxyContext
    };

    Object.defineProperties(instance.context, {
        element: {
            enumerable: true,
            value: function () {
                return instance.element
            },
            configurable: true
        },
        child: {
            enumerable: true,
            value: [],
            writable: true
        }
    });

    // Set default
    setProps(proxyContext, cmp.cfg.context);
    // Set props if exists
    setProps(proxyContext, props);
    // Create eventual handlers
    createListenerHandler(proxyContext, listenerHandler);
    // Create eventual listener for model
    createListenerModel(proxyContext, listenerModel);

    events.callCreate(proxyContext);
    isCreated = true;

    //console.log(propsMap)

    return instance;
}

function updateComponent(changes, propsMap) {
    changes.forEach(item => {
        // Exclude child property from changes event
        if (item.currentPath === 'child') return;

        const nodes = helper.pathify(item);
        //console.log('NODES',nodes);
        for (let path in nodes) {
            if (nodes.hasOwnProperty(path)) {

                // Fix discrepancy between add type and update, add type returns []
                path = path.replace(/\[(.*)]/g,'.$1');

                //console.log(path);

                const node = helper.getNodeByPath(path, propsMap);

                //console.log(node);

                if (node) {
                    const nodeValue = nodes[path];
                    if (Array.isArray(node)) {
                        node.forEach(n => {
                            updateElement(n, nodeValue);
                        });
                    } else {
                        updateElement(node, nodeValue);
                    }
                }

                //console.log(node);
            }
        }
    });
}

function updateElement(element, nodeValue) {

    //console.log(element, nodeValue, 'nodeValue' in element)

    if ('nodeValue' in element)
        element.nodeValue = nodeValue;
}

function createListenerModel(context, models) {
    models.forEach(m => {
        if (typeof context[m.field] !== 'function') {
            ['compositionstart', 'compositionend', 'input', 'change']
                .forEach(function (event) {
                    m.element.addEventListener(event, function () {
                        // Create structure if not exist and set value
                        helper.createObjectMap(m.field, context, this.value, true);
                    });
                });
        }

        m.element.removeAttribute('do-model');
    });
}

function createListenerHandler(context, handlers) {
    handlers.forEach(h => {
        if (h.listener in context && typeof context[h.listener] === 'function') {
            h.element.addEventListener(h.event, context[h.listener].bind(context));
        } else {
            h.element.addEventListener(h.event, function () {
                eval(h.listener);
            }.bind(context));
        }
        // Remove custom attribute
        h.element.removeAttribute('on-' + h.event);
    });
}

function setProps(targetObj, defaultObj) {
    for (let i in defaultObj) {
        if (defaultObj.hasOwnProperty(i)) {
            if (typeof targetObj[i] === 'object' && typeof defaultObj[i] !== 'undefined') {
                setProps(targetObj[i], defaultObj[i]);
                // Set a copy of data
            } else if (i === 'data' && typeof defaultObj[i] === 'function') {
                let data = defaultObj[i]();

                if (typeof data === 'object') {
                    for (let j in data) {
                        if (data.hasOwnProperty(j) && !targetObj.hasOwnProperty(j)) {
                            targetObj[j] = typeof data[j] === 'object' ? Object.assign({}, data[j]) : data[j]
                        }
                    }
                }
            } else {
                targetObj[i] = defaultObj[i];
            }
        }
    }
    return targetObj;
}

function isSigned(n) {
    return n.hasOwnProperty(SIGN);
}


module.exports = {
    component,
    getInstances,
    setProps,
    createListenerHandler
};