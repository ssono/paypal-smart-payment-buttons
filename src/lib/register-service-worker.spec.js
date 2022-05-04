// eslint-disable-next-line eslint-comments/disable-enable-pair
/* eslint-disable promise/no-native, no-restricted-globals, compat/compat, no-undef */
/* @flow */
import { registerServiceWorker } from './register-service-worker';

const SW_URL = 'https://localhost.paypal.com:8443/checkoutweb/public/dumbledore-service-worker.js?';

const waitForExpect = function waitForExpect(
    expectation : () => void | Promise<void>,
    timeout = 4500,
    interval = 50
// eslint-disable-next-line flowtype/no-weak-types
) : Promise<any> {
     
    if (interval < 1) {
        interval = 1;
    }
    const maxTries = Math.ceil(timeout / interval);
    let tries = 0;
    return new Promise((resolve, reject) => {
        const rejectOrRerun = (error : Error) => {
            if (tries > maxTries) {
                reject(error);
                return;
            }
            // eslint-disable-next-line no-use-before-define
            setTimeout(runExpectation, interval);
        };
        function runExpectation() {
            tries += 1;
            try {
                Promise.resolve(expectation())
                    .then(() => resolve())
                    .catch(rejectOrRerun);
            } catch (error) {
                rejectOrRerun(error);
            }
        }
        setTimeout(runExpectation, 0);
    });
};

describe('Test service worker registration script', () => {
    
    beforeEach(() => {
        Object.defineProperty(global.navigator, 'serviceWorker', {
            value: {
                register: jest.fn().mockResolvedValue(({
                    addEventListener: () => true
                }))
            }
        });
        Object.defineProperty(global, 'BroadcastChannel', {
            value: jest.fn().mockImplementation(() => ({
                addEventListener: jest.fn()
            }))
        });
    });

    it('Should install a service worker', async() => {
        const registerSpy = jest.spyOn(global.navigator.serviceWorker, 'register');
        const hash = 'b6cc430fb82802fb9363767b8a7c38187fa4a9d7';
        global.fetch = jest.fn(() =>
            Promise.resolve({
                json: () => Promise.resolve({ current: hash })
            }));
        registerServiceWorker();
        const expectedSwUrl = `${ SW_URL }releaseHash=${ hash }`;
        await waitForExpect(() => {
            expect(registerSpy).toHaveBeenLastCalledWith(expectedSwUrl, { scope: '/checkoutweb' });
        });
    });
});
