## Global API

### Doz.component( tag, definition )

- **Arguments**:
    - `{string} tag`
    - `{Function | Object} definition`

- **Details**: Register a global component.

- **Usage**:

  ``` js
  // register with object configuration
  Doz.component('my-component', {
    /* ... */
  })
  ```

### Doz.define( tag, definition )

- **Arguments**:
    - `{string} tag`
    - `{Function | Object} definition`

- **Details**:

    This is an alias of `component` for don't confuse you with Component subclass.

- **Usage**:

    ``` js
    // register with class declaration
    Doz.define('my-component', class extends Doz.Component {
        /* ... */
    })
    ```

### Doz.Component( config )

- **Arguments**:
    - `{Object} config`

- **Details**:

    This class it's used by Doz internally to creating component instances.
    If you want use ES6 class to define a component you must extend this class.

- **Usage**:

    ``` js
    Doz.define('my-component', class extends Doz.Component {

        constructor(o) {
            super(o);
            this.props = {
                name: 'Hello'
            };
        }

        template() {
            return `
                <div>${this.props.name}</div>
            `
        }

    })
    ```

### Doz.h( template )

- **Arguments**:
    - `{string} template`

- **Details**: This helper improve the virtual dom performance.

- **Usage**:

    ``` js
    Doz.define('my-component', class extends Doz.Component {

        constructor(o) {
            super(o);
            this.props = {
              name: 'Doz'
            };
        }

        template(h) {
            return h`
              <div>Hello ${this.props.name}</div>
            `
        }

    })
    ```

### Doz.mixin( mixin )

- **Arguments**:
    - `{Object | Object[]} mixin`

- **Details**: Add external functions to global components.

- **Usage**:

    ``` js
    const someFunctions = {
       myFunc1() {},
       myFunc2() {},
       /* ... */
    };

    Doz.mixin(someFunctions);

    Doz.component('my-component', {

        template() {
            return `<div>${this.myFunc1('Hello')}</div>`
        },

        onMount() {
            this.myFunc2();
        }

    })
    ```

### Doz.version()

- **Details**: Retrieve Doz version.

- **Usage**:

    ``` js
    console.log(Doz.version()) // 1.5.0;
    ```
