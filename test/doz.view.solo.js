const Doz = require('../index');
const be = require('bejs');


describe('Doz.view.solo', function () {

    this.timeout(5000);

    before(function () {
        this.jsdom = require('jsdom-global')()
    });

    after(function () {
        this.jsdom()
    });

    beforeEach(function () {
        document.body.innerHTML = '';
        Doz.collection.removeAll();
    });

    describe('create only app', function () {

        it('should be ok', function (done) {

            document.body.innerHTML = `
                <div id="app"></div>
            `;

            const view = new Doz({
                root: '#app',
                props: {
                    title: 'Hello world'
                },
                template() {
                    return `<div>${this.props.title}</div>`
                }
            });

            setTimeout(() => {
                const html = document.body.innerHTML;
                console.log(html);
                console.log(view);
                be.err(done).true(/Hello world/g.test(html));
            }, 100);

        });

        it('should be ok, call custom method', function (done) {

            document.body.innerHTML = `
                <div id="app"></div>
            `;

            const view = new Doz({
                root: '#app',
                props: {
                    title: 'Hello world'
                },
                template() {
                    return `<div>${this.$upper(this.props.title)}</div>`
                },
                $upper(str) {
                    return str.toUpperCase()
                }
            });

            setTimeout(() => {
                const html = document.body.innerHTML;
                console.log(html);
                console.log(view);
                be.err(done).true(/HELLO WORLD/g.test(html));
            }, 100);

        });

        it('should be ok, EVENT', function (done) {

            document.body.innerHTML = `
                <div id="app"></div>
            `;

            const queueEvents = [];
            const shouldBe = [
                'onBeforeCreate',
                'onCreate',
                'onBeforeMount',
                'onMount',
                'onBeforeUpdate',
                'onUpdate',
                'onBeforeUnmount',
                'onUnmount',
                'onBeforeDestroy',
                'onMountAsync',
                'onDestroy'
            ];

            const view = new Doz({
                root: '#app',
                props: {
                    title: 'Hello world'
                },
                template() {
                    return `<div>${this.props.title}</div>`
                },
                onBeforeCreate() {
                    queueEvents.push('onBeforeCreate');
                },
                onCreate() {
                    queueEvents.push('onCreate');
                },
                onBeforeMount() {
                    queueEvents.push('onBeforeMount');
                },
                onMount() {
                    queueEvents.push('onMount');
                    this.props.title = 'ciao';
                },
                onMountAsync() {
                    queueEvents.push('onMountAsync');
                },
                onBeforeUpdate() {
                    queueEvents.push('onBeforeUpdate');
                },
                onUpdate() {
                    queueEvents.push('onUpdate');
                    this.destroy();
                },
                onBeforeUnmount() {
                    queueEvents.push('onBeforeUnmount');
                },
                onUnmount() {
                    queueEvents.push('onUnmount');
                },
                onBeforeDestroy() {
                    queueEvents.push('onBeforeDestroy');
                },
                onDestroy() {
                    setTimeout(function () {
                        queueEvents.push('onDestroy');
                        be.err(done).equal(queueEvents, shouldBe);
                    },100);
                }
            });
        });

    });
});