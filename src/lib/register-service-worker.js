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

let broadcastChannel = {};

const requestSwLogs = () => {
    broadcastChannel.postMessage({
        type: GET_SW_LOGS_EVENT_NAME
    });
};

const startBroadCastChannel = () => {
    // eslint-disable-next-line compat/compat
    broadcastChannel = new BroadcastChannel(LOGS_CHANNEL_NAME);
};

const listenBroadCastChannelEvents = () => {
    // Listen SW flush logs event
    broadcastChannel.addEventListener('message', (event : Event) => {
        // $FlowFixMe
        const { payload = [], eventName } = event.data;
        if (payload && eventName === GET_SW_LOGS_RESPONSE_EVENT_NAME) {
            getLogger().info(`${ LOG_PREFIX }LOGS`, {
                logs: JSON.stringify(payload)
            }).flush();
        }
    });
};

function listenButtonClick() {
    const paypalButtons = document.getElementsByClassName('paypal-button');
    for (let i = 0; i < paypalButtons.length; i++) {
        paypalButtons[i].addEventListener('click', requestSwLogs);
    }
}

// eslint-disable-next-line promise/no-native, no-restricted-globals, flowtype/no-weak-types
export function fetchFile(url : string) : Promise<any> {
    // eslint-disable-next-line compat/compat
    return fetch(url)
        .then((response) => response.json())
        .then((data) => {
            return data;
        });
}

function startRegistration(swUrl) {
    if (navigator.serviceWorker) {
        navigator.serviceWorker
            .register(swUrl, { scope: SW_SCOPE })
            .then((registration) => {
                getLogger().info(`${ LOG_PREFIX }REGISTERED`).flush();
                registration.addEventListener('updatefound', () => {
                    const installingWorker = registration.installing;
                    if (installingWorker) {
                        installingWorker.addEventListener('statechange', () => {
                            const state = installingWorker.state;
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
            });
    }
}

function register(releaseHash, userDir = false) {
    const swParameters = [ `releaseHash=${ releaseHash }` ];
    if (userDir) {
        swParameters.push(`userDir=${ userDir }`);
    }
    let swUrl = SW_URL;
    swUrl += swParameters.join('&');

    getLogger().info(`${ LOG_PREFIX }REGISTER_START`, {
        url: swUrl
    }).flush();
    startRegistration(swUrl);
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
                getLogger().info(`${ LOG_PREFIX }RELEASE_CONFIG_RESOLVED`).flush();
                resolve(value);
            });
    }));
}

export function registerServiceWorker() {
    // eslint-disable-next-line compat/compat
    const clientUrl = new URL(window.location.href);
    const smokeHash = clientUrl.searchParams.get('smokeHash');
    const userDir = clientUrl.searchParams.get('userDir');
    try {
        if ('serviceWorker' in navigator) {
            listenButtonClick();
            startBroadCastChannel();
            listenBroadCastChannelEvents();
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
    } catch (err) {
        getLogger().error(`${ LOG_PREFIX }ERROR_DURING_INITIALIZATION`, { err: stringifyError(err) }).flush();
    }
}

export function unregisterServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker?.ready.then((registration) => {
            getLogger().info(`${ LOG_PREFIX }UNREGISTER`).flush();
            registration.unregister();
        });
    }
}
