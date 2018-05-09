const {ATTR} = require('../constants');

function extract(props) {

    const dProps = {};

    if (props[ATTR.ALIAS] !== undefined) {
        dProps['alias'] = props[ATTR.ALIAS];
        delete  props[ATTR.ALIAS];
    }

    if (props[ATTR.STORE] !== undefined) {
        dProps['store'] = props[ATTR.STORE];
        delete  props[ATTR.STORE];
    }

    if (props[ATTR.LISTENER] !== undefined) {
        dProps['callback'] = {mycallback:'aCallback'}; // props[ATTR.LISTENER].replace(/&quot;/g, '');
        console.log(dProps['callback'])
        delete  props[ATTR.LISTENER];
    }

    if (props[ATTR.ID] !== undefined) {
        dProps['id'] = props[ATTR.ID];
        delete  props[ATTR.ID];
    }

    return dProps;
}

module.exports = {
    extract
};