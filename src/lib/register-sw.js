/* @flow */
// In production, we register a service worker to serve assets from local cache.

// This lets the app load faster on subsequent visits in production, and gives
// it offline capabilities. However, it also means that developers (and users)
// will only see deployed updates on the "N+1" visit to a page, since previously
// cached resources are updated in the background.

// To learn more about the benefits of this model, read https://goo.gl/KwvDNy.
// This link also includes instructions on opting out of this behavior.

import { stringifyError } from '@krakenjs/belter/src';

import { SERVICE_WORKER } from '../constants';

import { getLogger } from './logger';

const {
    PROD_CHECKOUTWEB_CDN_DUMBLEDORE,
    DEFAULT_DIR,
    DUMBLEDORE_APP,
    RELEASE_CONFIG_FILE_NAME,
    SW_URL,
    SW_SCOPE,
    GET_SW_LOGS_EVENT_NAME,
    LOGS_CHANNEL_NAME,
    GET_SW_LOGS_RESPONSE_EVENT_NAME
} = SERVICE_WORKER;
const LOG_PREFIX = 'SERVICE_WORKER_';

const isLocalhost = Boolean(
    [ 'localhost', '[::1]', 'localhost.paypal.com' ].includes(window.location.hostname)
);

// eslint-disable-next-line compat/compat
const broadcast = new BroadcastChannel(LOGS_CHANNEL_NAME);

// Listen SW flush logs event
broadcast.addEventListener('message', (event : Event) => {
    // $FlowFixMe
    const { payload = false, eventName } = event.data;
    if (payload) {
        if (eventName === GET_SW_LOGS_RESPONSE_EVENT_NAME) {
            // eslint-disable-next-line no-console
            console.log('sw logs', payload);
        }
    }
});

const requestSwLogs = () => {
    broadcast.postMessage({
        type: GET_SW_LOGS_EVENT_NAME
    });
};

function listenButtonClick() {
    const paypalButtons = document.getElementsByClassName('paypal-button');
    for (let i = 0; i < paypalButtons.length; i++) {
        paypalButtons[i].addEventListener('click', requestSwLogs);
    }
}

// eslint-disable-next-line promise/no-native, no-restricted-globals, flowtype/no-weak-types
function fetchFile(url) : Promise<any> {
    // eslint-disable-next-line compat/compat
    return fetch(url)
        .then((response) => response.json())
        .then((data) => {
            return data;
        });
}

function registerValidSW(swUrl) {
    if (navigator.serviceWorker) {
        navigator.serviceWorker
            .register(swUrl, { scope: SW_SCOPE })
            .then((registration) => {
                // eslint-disable-next-line no-console
                console.log('SW Registered', registration);
                registration.addEventListener('updatefound', () => {
                    const installingWorker = registration.installing;
                    if (installingWorker) {
                        installingWorker.addEventListener('statechange', () => {
                            const state = installingWorker.state;
                            // eslint-disable-next-line no-console
                            console.log('SW state', state);
                            if (state === 'activated') {
                                requestSwLogs();
                            }
                            getLogger().info(`${ LOG_PREFIX }REGISTERING: ${ installingWorker.state }`).flush();
                        });
                    }
                });
            })
            .catch((err) => {
                getLogger().error(`${ LOG_PREFIX }ERROR_REGISTERING`, { err: stringifyError(err) }).flush();
                // eslint-disable-next-line no-console
                console.error('Error during service worker registration:', err);
            });
    }
}

function checkValidServiceWorker(swUrl) {
    // Check if the service worker can be found. If it can't reload the page.
    // eslint-disable-next-line compat/compat
    fetch(swUrl)
        .then((response) => {
            // Ensure service worker exists, and that we really are getting a JS file.
            const contentType = response.headers.get('content-type');
            if (response.status === 404 || !(contentType && contentType.includes('javascript'))) {
                // No service worker found. Probably a different app. Reload the page.
                if (navigator.serviceWorker) {
                    navigator.serviceWorker.ready.then((registration) => {
                        registration.unregister().then(() => {
                            window.location.reload();
                        });
                    });
                }
            } else {
                // Service worker found. Proceed as normal.
                registerValidSW(swUrl);
            }
        })
        .catch(() => {
            // eslint-disable-next-line no-console
            console.log('No internet connection found. App is running in offline mode.');
        });
}


function register(releaseHash, userDir = false) {
    const swParameters = [ `releaseHash=${ releaseHash }` ];
    if (userDir) {
        swParameters.push(`userDir=${ userDir }`);
    }
    let swUrl = SW_URL;
    swUrl += swParameters.join('&');
    if (isLocalhost) {
        checkValidServiceWorker(swUrl);
    } else {
        // Is not local host. Just register service worker
        registerValidSW(swUrl);
    }
}

// eslint-disable-next-line promise/no-native, no-restricted-globals, flowtype/no-weak-types
function getCurrentRelease() : Promise<any> {
    // eslint-disable-next-line compat/compat,promise/no-native, no-restricted-globals
    return new Promise(((resolve, reject) => {
        fetchFile(`${ PROD_CHECKOUTWEB_CDN_DUMBLEDORE }/${ DEFAULT_DIR }/${ DUMBLEDORE_APP }/${ RELEASE_CONFIG_FILE_NAME }`)
            .catch((err) => {
                reject(err);
            })
            .then((value) => {
                // eslint-disable-next-line no-console
                console.log('release resolved');
                resolve(value);
            });
    }));
}

export function registerServiceWorker() {
    // eslint-disable-next-line compat/compat
    const clientUrl = new URL(window.location.href);
    const smokeHash = clientUrl.searchParams.get('smokeHash');
    const userDir = clientUrl.searchParams.get('userDir');
    if ('serviceWorker' in navigator) {
        listenButtonClick();
        const releaseHashHandler = function (release) {
            if (release && release.current) {
                register(release.current);
            }
        };
        if (smokeHash && userDir) {
            register(smokeHash, userDir);
        } else {
            getCurrentRelease()
                .then(releaseHashHandler)
                .catch((err) => {
                    getLogger().error(`${ LOG_PREFIX }ERROR_FETCHING_RELEASE_CONFIG`, { err: stringifyError(err) }).flush();
                });
        }
    } else {
        getLogger().info(`${ LOG_PREFIX }NOT_SUPPORTED`).flush();
    }
}

export function unregisterServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker?.ready.then((registration) => {
            registration.unregister();
        });
    }
}
