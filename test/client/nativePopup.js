/* @flow */
/* eslint max-nested-callbacks: off, max-lines: off */

import { ENV, FUNDING, COUNTRY, LANG, PLATFORM } from '@paypal/sdk-constants/src';
import { wrapPromise, uniqueID } from '@krakenjs/belter/src';
import { ZalgoPromise } from '@krakenjs/zalgo-promise/src';

import { setupNativePopup } from '../../src/native/popup';

const ANDROID_CHROME_USER_AGENT = 'Mozilla/5.0 (Linux; Android 8.0.0; Nexus 5X Build/OPR4.170623.006) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.97 Mobile Safari/537.36';

describe('Native popup cases', () => {

    beforeEach(() => {
        delete window.paypal;
        window.location.hash = '';
    });

    const env = ENV.TEST;
    const sessionID = uniqueID();
    const buttonSessionID = uniqueID();
    const sdkCorrelationID = uniqueID();
    const clientID = uniqueID();
    let fundingSource = FUNDING.VENMO;
    const locale = { country: COUNTRY.US, lang: LANG.EN };

    it('should open the native popup and await a url to redirect to, then redirect and detect an app switch', () => {
        return wrapPromise(({ expect }) => {
            const opener = {};
            const parentDomain = 'foo.paypal.com';
            const nativeRedirectUrl = '#test';
            const buyerCountry = COUNTRY.US;
            let detectedAppSwitch = false;

            window.opener = opener;

            // eslint-disable-next-line prefer-const
            let nativePopup;

            window.paypal = {
                postRobot: {
                    send: expect('postRobotSend', (win, event, payload, opts) => {
                        if (win !== opener) {
                            throw new Error(`Expected message to be sent to parent`);
                        }

                        if (!opts || opts.domain !== parentDomain) {
                            throw new Error(`Expected message to be sent to ${ parentDomain }, got ${ opts ? opts.domain : 'undefined' }`);
                        }

                        if (!event) {
                            throw new Error(`Expected event to be passed`);
                        }

                        if (event === 'awaitRedirect') {
                            if (!payload || !payload.pageUrl || !payload.pageUrl === `${ window.location.href }#close`) {
                                throw new Error(`Expected payload.pageUrl to be ${ window.location.href }#close, got ${ payload ? payload.pageUrl : 'undefined' }`);
                            }

                            ZalgoPromise.delay(50).then(expect('postRedirect', () => {
                                if (window.location.hash !== nativeRedirectUrl) {
                                    throw new Error(`Expected page to have redirected to ${ nativeRedirectUrl }, got ${ window.location.hash }`);
                                }

                                if (!nativePopup) {
                                    throw new Error(`Expected native popup to be available`);
                                }

                                return ZalgoPromise.delay(1500).then(expect('appSwitchDetector', () => {
                                    if (!detectedAppSwitch) {
                                        throw new Error(`Expected app switch to be detected`);
                                    }

                                    return nativePopup.destroy();
                                }));
                            }));

                            return ZalgoPromise.resolve({
                                source: window,
                                origin: window.location.origin,
                                data:   {
                                    redirectUrl: nativeRedirectUrl
                                }
                            });
                        }

                        if (event === 'detectAppSwitch') {
                            detectedAppSwitch = true;
                            return ZalgoPromise.resolve({
                                source: window,
                                origin: window.location.origin,
                                data:   null
                            });
                        }

                        throw new Error(`Unrecognized event: ${ event }`);
                    })
                }
            };
            
            nativePopup = setupNativePopup({ parentDomain, env, sessionID, buttonSessionID, sdkCorrelationID, clientID, fundingSource, locale, buyerCountry });
        });
    });

    it('should open the native popup and await a url to redirect to, then redirect and do not detect an app switch', () => {
        return wrapPromise(({ expect }) => {
            const opener = {};
            const parentDomain = 'foo.paypal.com';
            const nativeRedirectUrl = '#test';
            const buyerCountry = COUNTRY.US;
            let detectedAppSwitch = false;

            window.opener = opener;

            // eslint-disable-next-line prefer-const
            let nativePopup;

            window.paypal = {
                postRobot: {
                    send: expect('postRobotSend', (win, event, payload, opts) => {
                        if (win !== opener) {
                            throw new Error(`Expected message to be sent to parent`);
                        }

                        if (!opts || opts.domain !== parentDomain) {
                            throw new Error(`Expected message to be sent to ${ parentDomain }, got ${ opts ? opts.domain : 'undefined' }`);
                        }

                        if (!event) {
                            throw new Error(`Expected event to be passed`);
                        }

                        if (event === 'awaitRedirect') {
                            if (!payload || !payload.pageUrl || !payload.pageUrl === `${ window.location.href }#close`) {
                                throw new Error(`Expected payload.pageUrl to be ${ window.location.href }#close, got ${ payload ? payload.pageUrl : 'undefined' }`);
                            }

                            ZalgoPromise.delay(50).then(expect('postRedirect', () => {
                                if (window.location.hash !== nativeRedirectUrl) {
                                    throw new Error(`Expected page to have redirected to ${ nativeRedirectUrl }, got ${ window.location.hash }`);
                                }

                                if (!nativePopup) {
                                    throw new Error(`Expected native popup to be available`);
                                }

                                return nativePopup.destroy().then(() => {
                                    return ZalgoPromise.delay(500).then(expect('appSwitchDetector', () => {
                                        if (detectedAppSwitch) {
                                            throw new Error(`Expected app switch to not be detected`);
                                        }
                                    }));
                                });
                            }));

                            return ZalgoPromise.resolve({
                                source: window,
                                origin: window.location.origin,
                                data:   {
                                    redirectUrl: nativeRedirectUrl
                                }
                            });
                        }

                        if (event === 'detectAppSwitch') {
                            detectedAppSwitch = true;
                            return ZalgoPromise.resolve({
                                source: window,
                                origin: window.location.origin,
                                data:   null
                            });
                        }

                        throw new Error(`Unrecognized event: ${ event }`);
                    })
                }
            };
            
            nativePopup = setupNativePopup({ parentDomain, env, sessionID, buttonSessionID, sdkCorrelationID, clientID, fundingSource, locale, buyerCountry });
        });
    });

    it('should open the native popup and await a url to redirect to, then redirect and detect an app switch, then return with onApprove', () => {
        return wrapPromise(({ expect }) => {
            const opener = {};
            const parentDomain = 'foo.paypal.com';
            const nativeRedirectUrl = '#test';
            const buyerCountry = COUNTRY.US;
            let detectedAppSwitch = false;
            let onApproveCalled = false;
            let onApprovePayload;

            window.opener = opener;

            const payerID = uniqueID();
            const paymentID = uniqueID();
            const billingToken = uniqueID();

            // eslint-disable-next-line prefer-const
            let nativePopup;

            window.paypal = {
                postRobot: {
                    send: expect('postRobotSend', (win, event, payload, opts) => {
                        if (win !== opener) {
                            throw new Error(`Expected message to be sent to parent`);
                        }

                        if (!opts || opts.domain !== parentDomain) {
                            throw new Error(`Expected message to be sent to ${ parentDomain }, got ${ opts ? opts.domain : 'undefined' }`);
                        }

                        if (!event) {
                            throw new Error(`Expected event to be passed`);
                        }

                        if (event === 'awaitRedirect') {
                            if (!payload || !payload.pageUrl || !payload.pageUrl === `${ window.location.href }#close`) {
                                throw new Error(`Expected payload.pageUrl to be ${ window.location.href }#close, got ${ payload ? payload.pageUrl : 'undefined' }`);
                            }

                            ZalgoPromise.delay(50).then(expect('postRedirect', () => {
                                if (window.location.hash !== nativeRedirectUrl) {
                                    throw new Error(`Expected page to have redirected to ${ nativeRedirectUrl }, got ${ window.location.hash }`);
                                }

                                if (!nativePopup) {
                                    throw new Error(`Expected native popup to be available`);
                                }

                                return ZalgoPromise.delay(1500).then(expect('appSwitchDetector', () => {
                                    if (!detectedAppSwitch) {
                                        throw new Error(`Expected app switch to be detected`);
                                    }

                                    window.location.hash = `onApprove?payerID=${ payerID }&paymentID=${ paymentID }&billingToken=${ billingToken }`;

                                    return ZalgoPromise.delay(50).then(expect('detectOnApprove', () => {
                                        if (!onApproveCalled) {
                                            throw new Error(`Expected onApprove to be called`);
                                        }

                                        if (!onApprovePayload) {
                                            throw new Error(`Expected payload from onApprove`);
                                        }

                                        if (onApprovePayload.payerID !== payerID) {
                                            throw new Error(`Expected payerID from onApprove payload to be ${ payerID }, got ${ onApprovePayload.payerID }`);
                                        }

                                        if (onApprovePayload.paymentID !== paymentID) {
                                            throw new Error(`Expected paymentID from onApprove payload to be ${ paymentID }, got ${ onApprovePayload.paymentID }`);
                                        }

                                        if (onApprovePayload.billingToken !== billingToken) {
                                            throw new Error(`Expected billingToken from onApprove payload to be ${ billingToken }, got ${ onApprovePayload.billingToken }`);
                                        }

                                        return nativePopup.destroy();
                                    }));
                                }));
                            }));

                            return ZalgoPromise.resolve({
                                source: window,
                                origin: window.location.origin,
                                data:   {
                                    redirectUrl: nativeRedirectUrl
                                }
                            });
                        }

                        if (event === 'detectAppSwitch') {
                            detectedAppSwitch = true;
                            return ZalgoPromise.resolve({
                                source: window,
                                origin: window.location.origin,
                                data:   null
                            });
                        }

                        if (event === 'onApprove') {
                            onApproveCalled = true;
                            onApprovePayload = payload;
                            return ZalgoPromise.resolve({
                                source: window,
                                origin: window.location.origin,
                                data:   null
                            });
                        }

                        throw new Error(`Unrecognized event: ${ event }`);
                    })
                }
            };
            
            nativePopup = setupNativePopup({ parentDomain, env, sessionID, buttonSessionID, sdkCorrelationID, clientID, fundingSource, locale, buyerCountry });
        });
    });

    it('should open the native popup and await a url to redirect to, then redirect and detect an app switch, then return with onCancel', () => {
        return wrapPromise(({ expect }) => {
            const opener = {};
            const parentDomain = 'foo.paypal.com';
            const nativeRedirectUrl = '#test';
            const buyerCountry = COUNTRY.US;
            let detectedAppSwitch = false;
            let onCancelCalled = false;

            window.opener = opener;

            // eslint-disable-next-line prefer-const
            let nativePopup;

            window.paypal = {
                postRobot: {
                    send: expect('postRobotSend', (win, event, payload, opts) => {
                        if (win !== opener) {
                            throw new Error(`Expected message to be sent to parent`);
                        }

                        if (!opts || opts.domain !== parentDomain) {
                            throw new Error(`Expected message to be sent to ${ parentDomain }, got ${ opts ? opts.domain : 'undefined' }`);
                        }

                        if (!event) {
                            throw new Error(`Expected event to be passed`);
                        }

                        if (event === 'awaitRedirect') {
                            if (!payload || !payload.pageUrl || !payload.pageUrl === `${ window.location.href }#close`) {
                                throw new Error(`Expected payload.pageUrl to be ${ window.location.href }#close, got ${ payload ? payload.pageUrl : 'undefined' }`);
                            }

                            ZalgoPromise.delay(50).then(expect('postRedirect', () => {
                                if (window.location.hash !== nativeRedirectUrl) {
                                    throw new Error(`Expected page to have redirected to ${ nativeRedirectUrl }, got ${ window.location.hash }`);
                                }

                                if (!nativePopup) {
                                    throw new Error(`Expected native popup to be available`);
                                }

                                return ZalgoPromise.delay(1500).then(expect('appSwitchDetector', () => {
                                    if (!detectedAppSwitch) {
                                        throw new Error(`Expected app switch to be detected`);
                                    }

                                    window.location.hash = `onCancel`;

                                    return ZalgoPromise.delay(50).then(expect('detectOnApprove', () => {
                                        if (!onCancelCalled) {
                                            throw new Error(`Expected onCancel to be called`);
                                        }

                                        return nativePopup.destroy();
                                    }));
                                }));
                            }));

                            return ZalgoPromise.resolve({
                                source: window,
                                origin: window.location.origin,
                                data:   {
                                    redirectUrl: nativeRedirectUrl
                                }
                            });
                        }

                        if (event === 'detectAppSwitch') {
                            detectedAppSwitch = true;
                            return ZalgoPromise.resolve({
                                source: window,
                                origin: window.location.origin,
                                data:   null
                            });
                        }

                        if (event === 'onCancel') {
                            onCancelCalled = true;
                            return ZalgoPromise.resolve({
                                source: window,
                                origin: window.location.origin,
                                data:   null
                            });
                        }

                        throw new Error(`Unrecognized event: ${ event }`);
                    })
                }
            };
            
            nativePopup = setupNativePopup({ parentDomain, env, sessionID, buttonSessionID, sdkCorrelationID, clientID, fundingSource, locale, buyerCountry });
        });
    });

    it('should open the native popup and await a url to redirect to, then redirect and detect an app switch, then return with fallback', () => {
        return wrapPromise(({ expect }) => {
            const opener = {};
            const parentDomain = 'foo.paypal.com';
            const nativeRedirectUrl = '#test';
            const buyerCountry = COUNTRY.US;
            let detectedAppSwitch = false;
            let fallbackCalled = false;

            window.opener = opener;

            // eslint-disable-next-line prefer-const
            let nativePopup;

            window.paypal = {
                postRobot: {
                    send: expect('postRobotSend', (win, event, payload, opts) => {
                        if (win !== opener) {
                            throw new Error(`Expected message to be sent to parent`);
                        }

                        if (!opts || opts.domain !== parentDomain) {
                            throw new Error(`Expected message to be sent to ${ parentDomain }, got ${ opts ? opts.domain : 'undefined' }`);
                        }

                        if (!event) {
                            throw new Error(`Expected event to be passed`);
                        }

                        if (event === 'awaitRedirect') {
                            if (!payload || !payload.pageUrl || !payload.pageUrl === `${ window.location.href }#close`) {
                                throw new Error(`Expected payload.pageUrl to be ${ window.location.href }#close, got ${ payload ? payload.pageUrl : 'undefined' }`);
                            }

                            ZalgoPromise.delay(50).then(expect('postRedirect', () => {
                                if (window.location.hash !== nativeRedirectUrl) {
                                    throw new Error(`Expected page to have redirected to ${ nativeRedirectUrl }, got ${ window.location.hash }`);
                                }

                                if (!nativePopup) {
                                    throw new Error(`Expected native popup to be available`);
                                }

                                window.location.hash = 'fallback';

                                return ZalgoPromise.delay(1500).then(expect('appSwitchDetector', () => {
                                    if (!detectedAppSwitch) {
                                        throw new Error(`Expected app switch to be detected`);
                                    }

                                    return ZalgoPromise.delay(50).then(expect('detectOnApprove', () => {
                                        if (!fallbackCalled) {
                                            throw new Error(`Expected fallback to be called`);
                                        }

                                        return nativePopup.destroy();
                                    }));
                                }));
                            }));

                            return ZalgoPromise.resolve({
                                source: window,
                                origin: window.location.origin,
                                data:   {
                                    redirectUrl: nativeRedirectUrl
                                }
                            });
                        }

                        if (event === 'detectAppSwitch') {
                            detectedAppSwitch = true;
                            return ZalgoPromise.resolve({
                                source: window,
                                origin: window.location.origin,
                                data:   null
                            });
                        }

                        if (event === 'onFallback') {
                            fallbackCalled = true;
                            return ZalgoPromise.resolve({
                                source: window,
                                origin: window.location.origin,
                                data:   null
                            });
                        }

                        throw new Error(`Unrecognized event: ${ event }`);
                    })
                }
            };

            nativePopup = setupNativePopup({ parentDomain, env, sessionID, buttonSessionID, sdkCorrelationID, clientID, fundingSource, locale, buyerCountry });
        });
    });

    it('should open the native popup and await a url to redirect to, then redirect and detect an app switch, then return with onError', () => {
        return wrapPromise(({ expect }) => {
            const opener = {};
            const parentDomain = 'foo.paypal.com';
            const nativeRedirectUrl = '#test';
            const buyerCountry = COUNTRY.US;
            let detectedAppSwitch = false;
            let onErrorCalled = false;
            let onErrorPayload;

            window.opener = opener;

            // eslint-disable-next-line prefer-const
            let nativePopup;

            window.paypal = {
                postRobot: {
                    send: expect('postRobotSend', (win, event, payload, opts) => {
                        if (win !== opener) {
                            throw new Error(`Expected message to be sent to parent`);
                        }

                        if (!opts || opts.domain !== parentDomain) {
                            throw new Error(`Expected message to be sent to ${ parentDomain }, got ${ opts ? opts.domain : 'undefined' }`);
                        }

                        if (!event) {
                            throw new Error(`Expected event to be passed`);
                        }

                        if (event === 'awaitRedirect') {
                            if (!payload || !payload.pageUrl || !payload.pageUrl === `${ window.location.href }#close`) {
                                throw new Error(`Expected payload.pageUrl to be ${ window.location.href }#close, got ${ payload ? payload.pageUrl : 'undefined' }`);
                            }

                            ZalgoPromise.delay(50).then(expect('postRedirect', () => {
                                if (window.location.hash !== nativeRedirectUrl) {
                                    throw new Error(`Expected page to have redirected to ${ nativeRedirectUrl }, got ${ window.location.hash }`);
                                }

                                if (!nativePopup) {
                                    throw new Error(`Expected native popup to be available`);
                                }

                                return ZalgoPromise.delay(1500).then(expect('appSwitchDetector', () => {
                                    if (!detectedAppSwitch) {
                                        throw new Error(`Expected app switch to be detected`);
                                    }

                                    const errorMessage = 'foobarbaz';
                                    window.location.hash = `onError?message=${ errorMessage }`;

                                    return ZalgoPromise.delay(50).then(expect('detectOnApprove', () => {
                                        if (!onErrorCalled) {
                                            throw new Error(`Expected onError to be called`);
                                        }

                                        if (!onErrorPayload) {
                                            throw new Error(`Expected payload from onError`);
                                        }

                                        if (onErrorPayload.message !== errorMessage) {
                                            throw new Error(`Expected message from onError payload to be ${ errorMessage }, got ${ onErrorPayload.message }`);
                                        }

                                        return nativePopup.destroy();
                                    }));
                                }));
                            }));

                            return ZalgoPromise.resolve({
                                source: window,
                                origin: window.location.origin,
                                data:   {
                                    redirectUrl: nativeRedirectUrl
                                }
                            });
                        }

                        if (event === 'detectAppSwitch') {
                            detectedAppSwitch = true;
                            return ZalgoPromise.resolve({
                                source: window,
                                origin: window.location.origin,
                                data:   null
                            });
                        }

                        if (event === 'onError') {
                            onErrorCalled = true;
                            onErrorPayload = payload;
                            return ZalgoPromise.resolve({
                                source: window,
                                origin: window.location.origin,
                                data:   null
                            });
                        }

                        throw new Error(`Unrecognized event: ${ event }`);
                    })
                }
            };
            
            nativePopup = setupNativePopup({ parentDomain, env, sessionID, buttonSessionID, sdkCorrelationID, clientID, fundingSource, locale, buyerCountry });
        });
    });

    it('should open the native popup and await a url to redirect to, then redirect and detect an app switch, then return with onComplete', () => {
        return wrapPromise(({ expect }) => {
            const opener = {};
            const parentDomain = 'foo.paypal.com';
            const nativeRedirectUrl = '#test';
            const buyerCountry = COUNTRY.US;
            let detectedAppSwitch = false;
            let onCompleteCalled = false;

            window.opener = opener;

            // eslint-disable-next-line prefer-const
            let nativePopup;

            window.paypal = {
                postRobot: {
                    send: expect('postRobotSend', (win, event, payload, opts) => {
                        if (win !== opener) {
                            throw new Error(`Expected message to be sent to parent`);
                        }

                        if (!opts || opts.domain !== parentDomain) {
                            throw new Error(`Expected message to be sent to ${ parentDomain }, got ${ opts ? opts.domain : 'undefined' }`);
                        }

                        if (!event) {
                            throw new Error(`Expected event to be passed`);
                        }

                        if (event === 'awaitRedirect') {
                            if (!payload || !payload.pageUrl || !payload.pageUrl === `${ window.location.href }#close`) {
                                throw new Error(`Expected payload.pageUrl to be ${ window.location.href }#close, got ${ payload ? payload.pageUrl : 'undefined' }`);
                            }

                            ZalgoPromise.delay(50).then(expect('postRedirect', () => {
                                if (window.location.hash !== nativeRedirectUrl) {
                                    throw new Error(`Expected page to have redirected to ${ nativeRedirectUrl }, got ${ window.location.hash }`);
                                }

                                if (!nativePopup) {
                                    throw new Error(`Expected native popup to be available`);
                                }

                                return ZalgoPromise.delay(1500).then(expect('appSwitchDetector', () => {
                                    if (!detectedAppSwitch) {
                                        throw new Error(`Expected app switch to be detected`);
                                    }

                                    window.location.hash = `close`;

                                    return ZalgoPromise.delay(50).then(expect('detectOnApprove', () => {
                                        if (!onCompleteCalled) {
                                            throw new Error(`Expected onComplete to be called`);
                                        }

                                        return nativePopup.destroy();
                                    }));
                                }));
                            }));

                            return ZalgoPromise.resolve({
                                source: window,
                                origin: window.location.origin,
                                data:   {
                                    redirectUrl: nativeRedirectUrl
                                }
                            });
                        }

                        if (event === 'detectAppSwitch') {
                            detectedAppSwitch = true;
                            return ZalgoPromise.resolve({
                                source: window,
                                origin: window.location.origin,
                                data:   null
                            });
                        }

                        if (event === 'onComplete') {
                            onCompleteCalled = true;
                            return ZalgoPromise.resolve({
                                source: window,
                                origin: window.location.origin,
                                data:   null
                            });
                        }

                        throw new Error(`Unrecognized event: ${ event }`);
                    })
                }
            };
            
            nativePopup = setupNativePopup({ parentDomain, env, sessionID, buttonSessionID, sdkCorrelationID, clientID, fundingSource, locale, buyerCountry });
        });
    });

    it('should open the native popup and await a url to redirect to, then redirect and detect an app switch, then return with onError for an unidentified hash', () => {
        return wrapPromise(({ expect }) => {
            const opener = {};
            const parentDomain = 'foo.paypal.com';
            const nativeRedirectUrl = '#test';
            const buyerCountry = COUNTRY.US;
            let detectedAppSwitch = false;
            let onErrorCalled = false;
            let onErrorPayload;

            window.opener = opener;

            // eslint-disable-next-line prefer-const
            let nativePopup;

            window.paypal = {
                postRobot: {
                    send: expect('postRobotSend', (win, event, payload, opts) => {
                        if (win !== opener) {
                            throw new Error(`Expected message to be sent to parent`);
                        }

                        if (!opts || opts.domain !== parentDomain) {
                            throw new Error(`Expected message to be sent to ${ parentDomain }, got ${ opts ? opts.domain : 'undefined' }`);
                        }

                        if (!event) {
                            throw new Error(`Expected event to be passed`);
                        }

                        if (event === 'awaitRedirect') {
                            if (!payload || !payload.pageUrl || !payload.pageUrl === `${ window.location.href }#close`) {
                                throw new Error(`Expected payload.pageUrl to be ${ window.location.href }#close, got ${ payload ? payload.pageUrl : 'undefined' }`);
                            }

                            ZalgoPromise.delay(50).then(expect('postRedirect', () => {
                                if (window.location.hash !== nativeRedirectUrl) {
                                    throw new Error(`Expected page to have redirected to ${ nativeRedirectUrl }, got ${ window.location.hash }`);
                                }

                                if (!nativePopup) {
                                    throw new Error(`Expected native popup to be available`);
                                }

                                return ZalgoPromise.delay(1500).then(expect('appSwitchDetector', () => {
                                    if (!detectedAppSwitch) {
                                        throw new Error(`Expected app switch to be detected`);
                                    }
                                    window.location.hash = `zerk`;

                                    return ZalgoPromise.delay(50).then(expect('detectOnApprove', () => {
                                        if (!onErrorCalled) {
                                            throw new Error(`Expected onError to be called`);
                                        }

                                        if (!onErrorPayload) {
                                            throw new Error(`Expected payload from onError`);
                                        }

                                        return nativePopup.destroy();
                                    }));
                                }));
                            }));

                            return ZalgoPromise.resolve({
                                source: window,
                                origin: window.location.origin,
                                data:   {
                                    redirectUrl: nativeRedirectUrl
                                }
                            });
                        }

                        if (event === 'detectAppSwitch') {
                            detectedAppSwitch = true;
                            return ZalgoPromise.resolve({
                                source: window,
                                origin: window.location.origin,
                                data:   null
                            });
                        }

                        if (event === 'onError') {
                            onErrorCalled = true;
                            onErrorPayload = payload;
                            return ZalgoPromise.resolve({
                                source: window,
                                origin: window.location.origin,
                                data:   null
                            });
                        }

                        throw new Error(`Unrecognized event: ${ event }`);
                    })
                }
            };
            
            nativePopup = setupNativePopup({ parentDomain, env, sessionID, buttonSessionID, sdkCorrelationID, clientID, fundingSource, locale, buyerCountry });
        });
    });

    it('should open the native popup and await a url to redirect to, then detect Android PayPal app installed and detect an app switch, then return with onComplete', () => {
        return wrapPromise(({ expect }) => {
            const opener = {};
            const parentDomain = 'foo.paypal.com';
            const nativeRedirectUrl = '#test';
            const buyerCountry = COUNTRY.US;
            fundingSource = FUNDING.PAYPAL;

            let detectedAppSwitch = false;
            let onCompleteCalled = false;
            
            window.navigator.mockUserAgent = ANDROID_CHROME_USER_AGENT;
            window.xprops.enableNativeCheckout = true;
            window.xprops.platform = PLATFORM.MOBILE;
            window.opener = opener;

            const installedApp = {
                id:        'com.paypal.android.p2pmobile',
                version:   '1.0',
                installed: true
            };
            // eslint-disable-next-line compat/compat
            window.navigator.getInstalledRelatedApps = () => {
                return ZalgoPromise.try(() => {
                    return [
                        {
                            id:        'com.paypal.android.p2pmobile',
                            version:   '1.0'
                        }
                    ];
                });
            };

            // eslint-disable-next-line prefer-const
            let nativePopup;

            window.paypal = {
                postRobot: {
                    send: expect('postRobotSend', (win, event, payload, opts) => {
                        if (win !== opener) {
                            throw new Error(`Expected message to be sent to parent`);
                        }

                        if (!opts || opts.domain !== parentDomain) {
                            throw new Error(`Expected message to be sent to ${ parentDomain }, got ${ opts ? opts.domain : 'undefined' }`);
                        }

                        if (!event) {
                            throw new Error(`Expected event to be passed`);
                        }

                        if (event === 'awaitRedirect') {
                            if (!payload.app || !payload.app.installed || payload.app.id !== 'com.paypal.android.p2pmobile' || payload.app.version !== '1.0') {
                                throw new Error(`Expected payload.app to be ${ JSON.stringify(installedApp) }`);
                            }

                            ZalgoPromise.delay(50).then(expect('postRedirect', () => {
                                if (window.location.hash !== nativeRedirectUrl) {
                                    throw new Error(`Expected page to have redirected to ${ nativeRedirectUrl }, got ${ window.location.hash }`);
                                }

                                if (!nativePopup) {
                                    throw new Error(`Expected native popup to be available`);
                                }

                                return ZalgoPromise.delay(1500).then(expect('appSwitchDetector', () => {
                                    if (!detectedAppSwitch) {
                                        throw new Error(`Expected app switch to be detected`);
                                    }

                                    window.location.hash = `close`;

                                    return ZalgoPromise.delay(50).then(expect('detectOnApprove', () => {
                                        if (!onCompleteCalled) {
                                            throw new Error(`Expected onComplete to be called`);
                                        }

                                        return nativePopup.destroy();
                                    }));
                                }));
                            }));

                            return ZalgoPromise.resolve({
                                source: window,
                                origin: window.location.origin,
                                data:   {
                                    redirectUrl: nativeRedirectUrl
                                }
                            });
                        }

                        if (event === 'detectAppSwitch') {
                            detectedAppSwitch = true;
                            return ZalgoPromise.resolve({
                                source: window,
                                origin: window.location.origin,
                                data:   null
                            });
                        }

                        if (event === 'onComplete') {
                            onCompleteCalled = true;
                            return ZalgoPromise.resolve({
                                source: window,
                                origin: window.location.origin,
                                data:   null
                            });
                        }

                        throw new Error(`Unrecognized event: ${ event }`);
                    })
                }
            };
            
            nativePopup = setupNativePopup({ parentDomain, env, sessionID, buttonSessionID, sdkCorrelationID, clientID, fundingSource, locale, buyerCountry });
        });
    });

    it('should open the native popup and await a url to redirect to, then detect Android Venmo app installed and detect an app switch, then return with onComplete', () => {
        return wrapPromise(({ expect }) => {
            const opener = {};
            const parentDomain = 'foo.paypal.com';
            const nativeRedirectUrl = '#test';
            const buyerCountry = COUNTRY.US;
            fundingSource = FUNDING.VENMO;

            let detectedAppSwitch = false;
            let onCompleteCalled = false;

            window.navigator.mockUserAgent = ANDROID_CHROME_USER_AGENT;
            window.xprops.enableNativeCheckout = true;
            window.xprops.platform = PLATFORM.MOBILE;
            window.opener = opener;

            const installedApp = {
                installed: true
            };
            
            // eslint-disable-next-line compat/compat
            window.navigator.getInstalledRelatedApps = () => {
                return ZalgoPromise.try(() => {
                    return [
                        {
                            id:        'com.venmo.fifa',
                            version:   '1.0'
                        }
                    ];
                });
            };

            // eslint-disable-next-line prefer-const
            let nativePopup;

            window.paypal = {
                postRobot: {
                    send: expect('postRobotSend', (win, event, payload, opts) => {
                        if (win !== opener) {
                            throw new Error(`Expected message to be sent to parent`);
                        }

                        if (!opts || opts.domain !== parentDomain) {
                            throw new Error(`Expected message to be sent to ${ parentDomain }, got ${ opts ? opts.domain : 'undefined' }`);
                        }

                        if (!event) {
                            throw new Error(`Expected event to be passed`);
                        }

                        if (event === 'awaitRedirect') {
                            if (!payload.app || !payload.app.installed) {
                                throw new Error(`Expected payload.app to be ${ JSON.stringify(installedApp) }`);
                            }

                            ZalgoPromise.delay(50).then(expect('postRedirect', () => {
                                if (window.location.hash !== nativeRedirectUrl) {
                                    throw new Error(`Expected page to have redirected to ${ nativeRedirectUrl }, got ${ window.location.hash }`);
                                }

                                if (!nativePopup) {
                                    throw new Error(`Expected native popup to be available`);
                                }

                                return ZalgoPromise.delay(1500).then(expect('appSwitchDetector', () => {
                                    if (!detectedAppSwitch) {
                                        throw new Error(`Expected app switch to be detected`);
                                    }

                                    window.location.hash = `close`;

                                    return ZalgoPromise.delay(50).then(expect('detectOnApprove', () => {
                                        if (!onCompleteCalled) {
                                            throw new Error(`Expected onComplete to be called`);
                                        }

                                        return nativePopup.destroy();
                                    }));
                                }));
                            }));

                            return ZalgoPromise.resolve({
                                source: window,
                                origin: window.location.origin,
                                data:   {
                                    redirectUrl: nativeRedirectUrl
                                }
                            });
                        }

                        if (event === 'detectAppSwitch') {
                            detectedAppSwitch = true;
                            return ZalgoPromise.resolve({
                                source: window,
                                origin: window.location.origin,
                                data:   null
                            });
                        }

                        if (event === 'onComplete') {
                            onCompleteCalled = true;
                            return ZalgoPromise.resolve({
                                source: window,
                                origin: window.location.origin,
                                data:   null
                            });
                        }

                        throw new Error(`Unrecognized event: ${ event }`);
                    })
                }
            };

            nativePopup = setupNativePopup({ parentDomain, env, sessionID, buttonSessionID, sdkCorrelationID, clientID, fundingSource, locale, buyerCountry });
        });
    });
});
