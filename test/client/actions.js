/* @flow */
/* eslint require-await: off, max-lines: off, max-nested-callbacks: off */

import { wrapPromise, uniqueID } from '@krakenjs/belter/src';
import { ZalgoPromise } from '@krakenjs/zalgo-promise/src';
import { FUNDING, INTENT, COUNTRY } from '@paypal/sdk-constants/src';

import {
    mockAsyncProp,
    createButtonHTML,
    getRestfulGetOrderApiMock,
    getRestfulCaptureOrderApiMock,
    getRestfulAuthorizeOrderApiMock,
    getRestfulPatchOrderApiMock,
    DEFAULT_FUNDING_ELIGIBILITY,
    mockFunction,
    clickButton,
    getCreateOrderApiMock,
    getCreateSubscriptionIdApiMock,
    getSubscriptionIdToCartIdApiMock,
    getGetSubscriptionApiMock,
    getActivateSubscriptionIdApiMock,
    getReviseSubscriptionIdApiMock,
    getGraphQLApiMock,
    mockSetupButton
} from './mocks';

describe('actions cases', () => {
    it('should render a button, click the button, and render checkout, then pass onApprove callback to the parent with actions.order.create', async () => {
        return await wrapPromise(async ({ expect }) => {

            let orderID = uniqueID();
            const payerID = 'YYYYYYYYYY';
            const facilitatorAccessToken = uniqueID();

            window.xprops.createOrder = mockAsyncProp(expect('createOrder', async (data, actions) => {
                const createOrderMock = getCreateOrderApiMock({
                    handler: expect('createOrder', ({ headers }) => {
                        if (headers.authorization !== `Bearer ${ facilitatorAccessToken }`) {
                            throw new Error(`Expected call to come with correct facilitator access token`);
                        }

                        return {
                            id: orderID
                        };
                    })
                });
                createOrderMock.expectCalls();
                orderID = await actions.order.create({
                    purchase_units: [ {
                        amount: {
                            value: '0.01'
                        }
                    } ]
                });
                createOrderMock.done();

                if (!orderID) {
                    throw new Error(`Expected orderID to be returned by actions.order.create`);
                }

                return orderID;
            }));

            window.xprops.onApprove = mockAsyncProp(expect('onApprove', async (data) => {
                if (data.orderID !== orderID) {
                    throw new Error(`Expected orderID to be ${ orderID }, got ${ data.orderID }`);
                }

                if (data.payerID !== payerID) {
                    throw new Error(`Expected payerID to be ${ payerID }, got ${ data.payerID }`);
                }
            }));

            mockFunction(window.paypal, 'Checkout', expect('Checkout', ({ original: CheckoutOriginal, args: [ props ] }) => {

                mockFunction(props, 'onApprove', expect('onApprove', ({ original: onApproveOriginal, args: [ data, actions ] }) => {
                    return onApproveOriginal({ ...data, payerID }, actions);
                }));

                const checkoutInstance = CheckoutOriginal(props);

                mockFunction(checkoutInstance, 'renderTo', expect('renderTo', async ({ original: renderToOriginal, args }) => {
                    return props.createOrder().then(id => {
                        if (id !== orderID) {
                            throw new Error(`Expected orderID to be ${ orderID }, got ${ id }`);
                        }

                        return renderToOriginal(...args);
                    });
                }));

                return checkoutInstance;
            }));

            createButtonHTML();

            await mockSetupButton({
                facilitatorAccessToken,
                merchantID:                    [ 'XYZ12345' ],
                fundingEligibility:            DEFAULT_FUNDING_ELIGIBILITY,
                personalization:               {},
                buyerCountry:                  COUNTRY.US,
                isCardFieldsExperimentEnabled: false
            });

            await clickButton(FUNDING.PAYPAL);
        });
    });

    it('should render a button, click the button, and render checkout, then pass onApprove callback to the parent with actions.order.get and use RestAPI', async () => {
        return await wrapPromise(async ({ expect }) => {

            const accessToken = uniqueID();
            const orderID = uniqueID();
            const payerID = 'YYYYYYYYYY';
            const facilitatorAccessToken = uniqueID();

            window.xprops.createOrder = mockAsyncProp(expect('createOrder', async () => {
                return ZalgoPromise.try(() => {
                    return orderID;
                });
            }));

            window.xprops.onApprove = mockAsyncProp(expect('onApprove', async (data, actions) => {
                const getOrderMock = getRestfulGetOrderApiMock({
                    handler: expect('getOrder', ({ headers }) => {
                        if (headers.authorization !== `Bearer ${ facilitatorAccessToken }`) {
                            throw new Error(`Expected call to come with correct facilitator access token`);
                        }

                        return {
                            id: orderID
                        };
                    })
                });
                getOrderMock.expectCalls();
                await actions.order.get();
                getOrderMock.done();

                if (data.orderID !== orderID) {
                    throw new Error(`Expected orderID to be ${ orderID }, got ${ data.orderID }`);
                }

                if (data.payerID !== payerID) {
                    throw new Error(`Expected payerID to be ${ payerID }, got ${ data.payerID }`);
                }
            }));

            mockFunction(window.paypal, 'Checkout', expect('Checkout', ({ original: CheckoutOriginal, args: [ props ] }) => {
                props.onAuth({ accessToken });
                mockFunction(props, 'onApprove', expect('onApprove', ({ original: onApproveOriginal, args: [ data, actions ] }) => {
                    return onApproveOriginal({ ...data, payerID }, actions);
                }));

                const checkoutInstance = CheckoutOriginal(props);

                mockFunction(checkoutInstance, 'renderTo', expect('renderTo', async ({ original: renderToOriginal, args }) => {
                    return props.createOrder().then(id => {
                        if (id !== orderID) {
                            throw new Error(`Expected orderID to be ${ orderID }, got ${ id }`);
                        }

                        return renderToOriginal(...args);
                    });
                }));

                return checkoutInstance;
            }));

            createButtonHTML();

            await mockSetupButton({
                facilitatorAccessToken,
                merchantID:                    [ 'XYZ12345' ],
                fundingEligibility:            DEFAULT_FUNDING_ELIGIBILITY,
                personalization:               {},
                buyerCountry:                  COUNTRY.US,
                isCardFieldsExperimentEnabled: false
            });

            await clickButton(FUNDING.PAYPAL);
        });
    });

    it('should render a button, click the button, and render checkout, then pass onApprove callback to the parent with actions.order.capture and use RestAPI', async () => {
        return await wrapPromise(async ({ expect }) => {

            const orderID = uniqueID();
            const payerID = 'YYYYYYYYYY';
            const facilitatorAccessToken = uniqueID();

            window.xprops.createOrder = mockAsyncProp(expect('createOrder', async () => {
                return ZalgoPromise.try(() => {
                    return orderID;
                });
            }));

            window.xprops.onApprove = mockAsyncProp(expect('onApprove', async (data, actions) => {
                const captureOrderMock = getRestfulCaptureOrderApiMock({
                    handler: expect('captureOrder', ({ headers }) => {
                        if (headers.authorization !== `Bearer ${ facilitatorAccessToken }`) {
                            throw new Error(`Expected call to come with correct facilitator access token`);
                        }

                        return {
                            id: orderID
                        };
                    })
                });
                captureOrderMock.expectCalls();
                await actions.order.capture();
                captureOrderMock.done();

                if (data.orderID !== orderID) {
                    throw new Error(`Expected orderID to be ${ orderID }, got ${ data.orderID }`);
                }

                if (data.payerID !== payerID) {
                    throw new Error(`Expected payerID to be ${ payerID }, got ${ data.payerID }`);
                }
            }));

            mockFunction(window.paypal, 'Checkout', expect('Checkout', ({ original: CheckoutOriginal, args: [ props ] }) => {

                mockFunction(props, 'onApprove', expect('onApprove', ({ original: onApproveOriginal, args: [ data, actions ] }) => {
                    return onApproveOriginal({ ...data, payerID }, actions);
                }));

                const checkoutInstance = CheckoutOriginal(props);

                mockFunction(checkoutInstance, 'renderTo', expect('renderTo', async ({ original: renderToOriginal, args }) => {
                    return props.createOrder().then(id => {
                        if (id !== orderID) {
                            throw new Error(`Expected orderID to be ${ orderID }, got ${ id }`);
                        }

                        return renderToOriginal(...args);
                    });
                }));

                return checkoutInstance;
            }));

            createButtonHTML();

            await mockSetupButton({
                facilitatorAccessToken,
                merchantID:                    [ 'XYZ12345' ],
                fundingEligibility:            DEFAULT_FUNDING_ELIGIBILITY,
                personalization:               {},
                buyerCountry:                  COUNTRY.US,
                isCardFieldsExperimentEnabled: false
            });

            await clickButton(FUNDING.PAYPAL);
        });
    });

    it('should render a button, click the button, and render checkout, then pass onApprove callback to the parent with actions.order.authorize and use RestAPI', async () => {
        return await wrapPromise(async ({ expect }) => {

            const orderID = uniqueID();
            const accessToken = uniqueID();
            const payerID = 'YYYYYYYYYY';
            const facilitatorAccessToken = uniqueID();
            
            const upgradeLSATMock = getGraphQLApiMock({
                extraHandler: expect('upgradeLSATGQLCall', ({ data }) => {

                    if (data.query.includes('query GetCheckoutDetails')) {
                        return {
                            data: {
                                checkoutSession: {
                                    cart: {
                                        intent:  'authorize',
                                        amounts: {
                                            total: {
                                                currencyCode: 'USD'
                                            }
                                        }
                                    },
                                    payees: [
                                        {
                                            merchantId: 'XYZ12345',
                                            email:       {
                                                stringValue: 'xyz-us-b1@paypal.com'
                                            }
                                        }
                                    ]
                                }
                            }
                        };
                    }

                    if (data.query.includes('mutation UpgradeFacilitatorAccessToken')) {
                        if (!data.variables.facilitatorAccessToken) {
                            throw new Error(`We haven't received the facilitatorAccessToken`);
                        }

                        if (!data.variables.buyerAccessToken) {
                            throw new Error(`We haven't received the buyer's access token`);
                        }

                        if (!data.variables.orderID) {
                            throw new Error(`We haven't received the orderID`);
                        }

                        return {
                            data: {
                                upgradeLowScopeAccessToken: true
                            }
                        };
                    }
                })
            }).expectCalls();

            window.xprops.intent = INTENT.AUTHORIZE;
            
            window.xprops.createOrder = mockAsyncProp(expect('createOrder', async () => {
                return ZalgoPromise.try(() => {
                    return orderID;
                });
            }));

            window.xprops.onApprove = mockAsyncProp(expect('onApprove', async (data, actions) => {
                const authorizeOrderMock = getRestfulAuthorizeOrderApiMock({
                    handler: expect('authorizeOrder', ({ headers }) => {
                        if (headers.authorization !== `Bearer ${ facilitatorAccessToken }`) {
                            throw new Error(`Expected call to come with correct facilitator access token`);
                        }

                        return {
                            id: orderID
                        };
                    })
                });
                authorizeOrderMock.expectCalls();
                await actions.order.authorize();
                authorizeOrderMock.done();

                if (data.orderID !== orderID) {
                    throw new Error(`Expected orderID to be ${ orderID }, got ${ data.orderID }`);
                }

                if (data.payerID !== payerID) {
                    throw new Error(`Expected payerID to be ${ payerID }, got ${ data.payerID }`);
                }
            }));

            mockFunction(window.paypal, 'Checkout', expect('Checkout', ({ original: CheckoutOriginal, args: [ props ] }) => {
                props.onAuth({ accessToken });
                mockFunction(props, 'onApprove', expect('onApprove', ({ original: onApproveOriginal, args: [ data, actions ] }) => {
                    return onApproveOriginal({ ...data, payerID }, actions);
                }));

                const checkoutInstance = CheckoutOriginal(props);

                mockFunction(checkoutInstance, 'renderTo', expect('renderTo', async ({ original: renderToOriginal, args }) => {
                    return props.createOrder().then(id => {
                        if (id !== orderID) {
                            throw new Error(`Expected orderID to be ${ orderID }, got ${ id }`);
                        }

                        return renderToOriginal(...args);
                    });
                }));

                return checkoutInstance;
            }));

            createButtonHTML();

            await mockSetupButton({
                facilitatorAccessToken,
                merchantID:                    [ 'XYZ12345' ],
                fundingEligibility:            DEFAULT_FUNDING_ELIGIBILITY,
                personalization:               {},
                buyerCountry:                  COUNTRY.US,
                isCardFieldsExperimentEnabled: false
            });

            await clickButton(FUNDING.PAYPAL);

            upgradeLSATMock.done();
        });
    });

    it('should render a button, click the button, and render checkout, then pass onShippingChange callback to the parent with actions.order.patch', async () => {
        return await wrapPromise(async ({ expect, avoid }) => {

            const orderID = uniqueID();
            const accessToken = uniqueID();
            const payerID = 'YYYYYYYYYY';
            const facilitatorAccessToken = uniqueID();

            window.xprops.createOrder = mockAsyncProp(expect('createOrder', async () => {
                return ZalgoPromise.try(() => {
                    return orderID;
                });
            }));

            window.xprops.onShippingChange = mockAsyncProp(expect('onShippingChange', async (data, actions) => {
                const patchOrderMock = getRestfulPatchOrderApiMock({
                    handler: expect('patchOrder', ({ headers }) => {
                        if (headers.authorization !== `Bearer ${ facilitatorAccessToken }`) {
                            throw new Error(`Expected call to come with correct facilitator access token`);
                        }

                        return {
                            id: orderID
                        };
                    })
                });
                patchOrderMock.expectCalls();
                await actions.order.patch();
                patchOrderMock.done();
            }));

            mockFunction(window.paypal, 'Checkout', expect('Checkout', ({ original: CheckoutOriginal, args: [ props ] }) => {
                props.onAuth({ accessToken });
                mockFunction(props, 'onApprove', expect('onApprove', ({ original: onApproveOriginal, args: [ data, actions ] }) => {
                    return onApproveOriginal({ ...data, payerID }, actions);
                }));

                const checkoutInstance = CheckoutOriginal(props);

                mockFunction(checkoutInstance, 'renderTo', expect('renderTo', async ({ original: renderToOriginal, args }) => {
                    return props.createOrder().then(id => {
                        if (id !== orderID) {
                            throw new Error(`Expected orderID to be ${ orderID }, got ${ id }`);
                        }

                        return renderToOriginal(...args).then(() => {
                            return props.onShippingChange({ orderID }, { reject: avoid('reject') });
                        });
                    });
                }));

                return checkoutInstance;
            }));

            createButtonHTML();

            await mockSetupButton({
                facilitatorAccessToken,
                merchantID:                    [ 'XYZ12345' ],
                fundingEligibility:            DEFAULT_FUNDING_ELIGIBILITY,
                personalization:               {},
                buyerCountry:                  COUNTRY.US,
                isCardFieldsExperimentEnabled: false
            });

            await clickButton(FUNDING.PAYPAL);
        });
    });

    it('should render a button, click the button, and render checkout, then pass onApprove callback to the parent with actions.order.patch', async () => {
        return await wrapPromise(async ({ expect }) => {

            const orderID = uniqueID();
            const facilitatorAccessToken = uniqueID();

            window.xprops.createOrder = mockAsyncProp(expect('createOrder', async () => {
                return ZalgoPromise.try(() => {
                    return orderID;
                });
            }));

            window.xprops.onApprove = mockAsyncProp(expect('onApprove', async (data, actions) => {
                const patchOrderMock = getRestfulPatchOrderApiMock({
                    handler: expect('patchOrder', ({ headers }) => {
                        if (headers.authorization !== `Bearer ${ facilitatorAccessToken }`) {
                            throw new Error(`Expected call to come with correct facilitator access token`);
                        }

                        return {
                            id: orderID
                        };
                    })
                });
                patchOrderMock.expectCalls();
                await actions.order.patch();
                patchOrderMock.done();
            }));

            createButtonHTML();

            await mockSetupButton({
                facilitatorAccessToken,
                merchantID:                    [ 'XYZ12345' ],
                fundingEligibility:            DEFAULT_FUNDING_ELIGIBILITY,
                personalization:               {},
                buyerCountry:                  COUNTRY.US,
                isCardFieldsExperimentEnabled: false
            });

            await clickButton(FUNDING.PAYPAL);
        });
    });

    it('should render a subscription button, click the button, and render checkout, then pass onApprove callback to the parent with actions.subscription.create', async () => {
        return await wrapPromise(async ({ expect }) => {
            const mockSubscriptionID = 'I-CREATESUBSCRIPTIONID';
            const mockCartID = 'CARTIDCREATESUBSFLOW';
            let subscriptionID;
            const payerID = 'YYYYYYYYYY';

            window.xprops.vault = true;
            delete window.xprops.createOrder;
            window.xprops.createSubscription = mockAsyncProp(expect('createSubscription', async (data, actions) => {
                const createSubscriptionIdApiMock = getCreateSubscriptionIdApiMock({}, mockSubscriptionID);
                createSubscriptionIdApiMock.expectCalls();
                subscriptionID = await actions.subscription.create({
                    plan_id: 'P-XXXXXX'
                });
                createSubscriptionIdApiMock.done();
                if (!subscriptionID) {
                    throw new Error(`Expected subscriptionID to be returned by actions.subscription.create`);
                }

                return subscriptionID;
            }));

            window.xprops.onApprove = mockAsyncProp(expect('onApprove', async (data, actions) => {

                if (data.subscriptionID !== subscriptionID) {
                    throw new Error(`Expected subscriptionID to be ${ subscriptionID }, got ${ data.subscriptionID }`);
                }

                const getSubscriptionApiMock = getGetSubscriptionApiMock({}, mockSubscriptionID);
                getSubscriptionApiMock.expectCalls();
                const response = await actions.subscription.get();
                if (response.id !== subscriptionID) {
                    throw new Error(`Expected subscriptionID to be ${ subscriptionID }, got ${ response.id } in Get Subscriptions response`);
                }
                getSubscriptionApiMock.done();
                const activateSubscriptionIdApiMock = getActivateSubscriptionIdApiMock({}, mockSubscriptionID);
                activateSubscriptionIdApiMock.expectCalls();
                const activateResponse = await actions.subscription.activate();
                if (JSON.stringify(activateResponse) !== '{}') {
                    throw new Error(`Expected activate response to be 204 NO CONTENT , got ${ JSON.stringify(activateResponse) } in Activate Subscriptions`);
                }
                activateSubscriptionIdApiMock.done();
            }));

            mockFunction(window.paypal, 'Checkout', expect('Checkout', ({ original: CheckoutOriginal, args: [ props ] }) => {

                mockFunction(props, 'onApprove', expect('onApprove', ({ original: onApproveOriginal, args: [ data, actions ] }) => {
                    return onApproveOriginal({ ...data, payerID, subscriptionID }, actions);
                }));

                const checkoutInstance = CheckoutOriginal(props);

                mockFunction(checkoutInstance, 'renderTo', expect('renderTo', async ({ original: renderToOriginal, args }) => {
                    const id = await props.createOrder();
                    
                    if (id !== mockCartID) {
                        throw new Error(`Expected orderID to be ${ subscriptionID }, got ${ id }`);
                    }
                    return renderToOriginal(...args);
                }));

                return checkoutInstance;
            }));

            createButtonHTML();

            await mockSetupButton({ merchantID: [ 'XYZ12345' ], fundingEligibility: DEFAULT_FUNDING_ELIGIBILITY });

            const subscriptionIdToCartIdApiMock = getSubscriptionIdToCartIdApiMock({}, mockSubscriptionID, mockCartID);
            subscriptionIdToCartIdApiMock.expectCalls();

            await clickButton(FUNDING.PAYPAL);

            subscriptionIdToCartIdApiMock.done();
        });
    });

    it('should render a revise subscription button, click the button, and render checkout, then pass onApprove callback to the parent with actions.subscription.revise', async () => {
        return await wrapPromise(async ({ expect }) => {
            const mockSubscriptionID = 'I-REVISESUBSCRIPTIONID';
            const mockCartID = 'CARTIDCREATESUBSFLOW';
            let subscriptionID;
            const payerID = 'YYYYYYYYYY';

            window.xprops.vault = true;
            delete window.xprops.createOrder;
            window.xprops.createSubscription = mockAsyncProp(expect('createSubscription', async (data, actions) => {
                const reviseSubscriptionIdApiMock = getReviseSubscriptionIdApiMock({}, mockSubscriptionID);
                reviseSubscriptionIdApiMock.expectCalls();
                subscriptionID = await actions.subscription.revise(mockSubscriptionID, {
                    plan_id: 'P-NEW_PLAN_XXXXXX'
                });
                reviseSubscriptionIdApiMock.done();
                if (!subscriptionID) {
                    throw new Error(`Expected subscriptionID to be returned by actions.subscription.revise`);
                }

                return subscriptionID;
            }));

            window.xprops.onApprove = mockAsyncProp(expect('onApprove', async (data, actions) => {

                if (data.subscriptionID !== subscriptionID) {
                    throw new Error(`Expected subscriptionID to be ${ subscriptionID }, got ${ data.subscriptionID }`);
                }

                const getSubscriptionApiMock = getGetSubscriptionApiMock({}, mockSubscriptionID);
                getSubscriptionApiMock.expectCalls();
                const response = await actions.subscription.get();
                if (response.id !== subscriptionID) {
                    throw new Error(`Expected subscriptionID to be ${ subscriptionID }, got ${ response.id } in Get Subscriptions response`);
                }
                getSubscriptionApiMock.done();
            }));

            mockFunction(window.paypal, 'Checkout', expect('Checkout', ({ original: CheckoutOriginal, args: [ props ] }) => {

                mockFunction(props, 'onApprove', expect('onApprove', ({ original: onApproveOriginal, args: [ data, actions ] }) => {
                    return onApproveOriginal({ ...data, payerID, subscriptionID }, actions);
                }));

                const checkoutInstance = CheckoutOriginal(props);

                mockFunction(checkoutInstance, 'renderTo', expect('renderTo', async ({ original: renderToOriginal, args }) => {
                    const id = await props.createOrder();
                    
                    if (id !== mockCartID) {
                        throw new Error(`Expected orderID to be ${ subscriptionID }, got ${ id }`);
                    }
                    return renderToOriginal(...args);
                }));

                return checkoutInstance;
            }));

            createButtonHTML();

            await mockSetupButton({ merchantID: [ 'XYZ12345' ], fundingEligibility: DEFAULT_FUNDING_ELIGIBILITY });

            const subscriptionIdToCartIdApiMock = getSubscriptionIdToCartIdApiMock({}, mockSubscriptionID, mockCartID);
            subscriptionIdToCartIdApiMock.expectCalls();

            await clickButton(FUNDING.PAYPAL);

            subscriptionIdToCartIdApiMock.done();
        });
    });
});
