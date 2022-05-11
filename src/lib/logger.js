/* @flow */

import { Logger, type LoggerType } from '@krakenjs/beaver-logger/src';
import { noop, stringifyError, stringifyErrorMessage, inlineMemoize, isAndroid, isIos } from '@krakenjs/belter/src';
import { ZalgoPromise } from '@krakenjs/zalgo-promise/src';
import { FPTI_KEY, FPTI_FEED, FPTI_DATA_SOURCE, FPTI_SDK_NAME, ENV, COUNTRY, MOBILE_ENV, FUNDING } from '@paypal/sdk-constants/src';

import type { LocaleType } from '../types';
import { LOGGER_URL, AMPLITUDE_API_KEY } from '../config';

export function getLogger() : LoggerType {
    return inlineMemoize(getLogger, () =>
        Logger({
            url:              LOGGER_URL,
            enableSendBeacon: true
        }));
}

export function enableAmplitude({ env } : {| env : $Values<typeof ENV> |}) {
    getLogger().configure({
        amplitudeApiKey: AMPLITUDE_API_KEY[env]
    });
}


type MobileEnvironment = $Values<typeof MOBILE_ENV>;

function getSDKMobileEnvironment() : MobileEnvironment | null {
    if (isIos()) {
        return MOBILE_ENV.IOS;
    }
    if (isAndroid()) {
        return MOBILE_ENV.ANDROID;
    }
    return null;
}
type LoggerOptions = {|
    env : $Values<typeof ENV>,
    sessionID : string,
    clientID : string,
    sdkCorrelationID : string,
    locale : LocaleType,
    buyerCountry : $Values<typeof COUNTRY>,
    sdkVersion : string,
    fundingSource : ?$Values<typeof FUNDING>
|};

export function setupLogger({ env, sessionID, clientID, sdkCorrelationID, buyerCountry, locale, sdkVersion, fundingSource } : LoggerOptions) {
    const logger = getLogger();

    logger.addPayloadBuilder(() => {
        return {
            referer: window.location.host,
            sdkCorrelationID,
            sessionID,
            clientID,
            env
        };
    });

    logger.addTrackingBuilder(() => {
        const { lang, country } = locale;

        return {
            [FPTI_KEY.FEED]:                   FPTI_FEED.PAYMENTS_SDK,
            [FPTI_KEY.DATA_SOURCE]:            FPTI_DATA_SOURCE.PAYMENTS_SDK,
            [FPTI_KEY.CLIENT_ID]:              clientID,
            [FPTI_KEY.SESSION_UID]:            sessionID,
            [FPTI_KEY.REFERER]:                window.location.host,
            [FPTI_KEY.BUYER_COUNTRY]:          buyerCountry,
            [FPTI_KEY.LOCALE]:                 `${ lang }_${ country }`,
            [FPTI_KEY.INTEGRATION_IDENTIFIER]: clientID,
            [FPTI_KEY.SDK_ENVIRONMENT]:        getSDKMobileEnvironment(),
            [FPTI_KEY.SDK_NAME]:               FPTI_SDK_NAME.PAYMENTS_SDK,
            [FPTI_KEY.SDK_VERSION]:            sdkVersion,
            [FPTI_KEY.USER_AGENT]:             window.navigator && window.navigator.userAgent,
            [FPTI_KEY.CONTEXT_CORRID]:         sdkCorrelationID,
            [FPTI_KEY.TIMESTAMP]:              Date.now().toString(),
            [FPTI_KEY.CHOSEN_FUNDING]:         fundingSource
        };
    });

    ZalgoPromise.onPossiblyUnhandledException(err => {

        logger.track({
            [FPTI_KEY.ERROR_CODE]: 'payments_sdk_error',
            [FPTI_KEY.ERROR_DESC]: stringifyErrorMessage(err)
        });

        logger.error('unhandled_error', {
            err: stringifyError(err)
        });

        // eslint-disable-next-line promise/no-promise-in-callback
        logger.flush().catch(noop);
    });
}
