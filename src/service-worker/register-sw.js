/* @flow */
// In production, we register a service worker to serve assets from local cache.

// This lets the app load faster on subsequent visits in production, and gives
// it offline capabilities. However, it also means that developers (and users)
// will only see deployed updates on the "N+1" visit to a page, since previously
// cached resources are updated in the background.

// To learn more about the benefits of this model, read https://goo.gl/KwvDNy.
// This link also includes instructions on opting out of this behavior.
const PROD_CHECKOUTWEB_CDN_DUMBLEDORE = 'https://www.paypalobjects.com/checkoutweb';
const DEFAULT_DIR = 'release';
const DUMBLEDORE_APP = 'dumbledore';
const RELEASE_CONFIG_FILE_NAME = 'release-config.json';
const SW_URL = 'https://localhost.paypal.com:8443/checkoutweb/public/dumbledore-service-worker.js?';
const SW_SCOPE = '/checkoutweb';
const GET_SW_LOGS_EVENT_NAME = 'GET_SW_LOGS';
const GET_SW_LOGS_RESPONSE_EVENT_NAME = 'GET_SW_LOGS_RESPONSE';
const LOGS_CHANNEL_NAME = 'logs-channel';
let requestLogsId;
const isLocalhost = Boolean(
    [ 'localhost', '[::1]', 'localhost.paypal.com' ].includes(window.location.hostname) ||
    // 127.0.0.1/8 is considered localhost for IPv4.
    // eslint-disable-next-line security/detect-unsafe-regex
    window.location.hostname.match(/^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/)
);

// eslint-disable-next-line compat/compat
const broadcast = new BroadcastChannel(LOGS_CHANNEL_NAME);

const postSwLogs = function (swLogs) {
    // eslint-disable-next-line no-console
    console.log('SW logs received', swLogs);
};

// eslint-disable-next-line unicorn/prefer-add-event-listener
broadcast.onmessage = (event) => {
    // $FlowFixMe
    const { payload = false, eventName, requestId } = event.data;
    if (payload && requestId === requestLogsId) {
        if (eventName === GET_SW_LOGS_RESPONSE_EVENT_NAME) {
            postSwLogs(payload);
        }
    }
};

// Listen to the response
const requestSwLogs = () => {
    requestLogsId = Date.now();
    broadcast.postMessage({
        requestId: requestLogsId,

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
                            // logger.cal.info(`REGISTERING_SERVICE_WORKER_STATUS: ${installingWorker.state}`);
                        });
                    }
                });
            })
            .catch((error) => {
                // logger.cal.info(`ERROR_REGISTERING_SERVICE_WORKER`);
                // eslint-disable-next-line no-console
                console.error('Error during service worker registration:', error);
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

function init() {
    // eslint-disable-next-line compat/compat
    const clientUrl = new URL(window.location.href);
    const smokeHash = clientUrl.searchParams.get('smokeHash');
    const userDir = clientUrl.searchParams.get('userDir');
    const enableServiceWorker = window.enableServiceWorker;
    // eslint-disable-next-line no-console
    console.log(`service worker eligibility: ${ enableServiceWorker }`);
    if (enableServiceWorker) {
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
                    .then(releaseHashHandler);
            }
        } else {
            // logger.cal.info('SERVICE_WORKER_NOT_SUPPORTED');
        }
    }
}

init();
