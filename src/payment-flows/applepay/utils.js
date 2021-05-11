/* @flow */

import { COUNTRY } from '@paypal/sdk-constants/src';

import { type DetailedOrderInfo } from '../../api';
import type { ApplePayPaymentContact, ApplePayMerchantCapabilities, ApplePayPaymentRequest, ApplePaySupportedNetworks, ApplePayShippingMethod, ShippingAddress, ShippingMethod } from '../types';

type ValidNetworks = {|
    discover : ApplePaySupportedNetworks,
    visa : ApplePaySupportedNetworks,
    mastercard : ApplePaySupportedNetworks,
    amex : ApplePaySupportedNetworks,
    jcb : ApplePaySupportedNetworks,
    chinaunionpay : ApplePaySupportedNetworks
|};

const validNetworks : ValidNetworks = {
    discover:       'discover',
    visa:           'visa',
    mastercard:     'masterCard',
    amex:           'amex',
    jcb:            'jcb',
    chinaunionpay:  'chinaUnionPay'
};

function getSupportedNetworksFromIssuers(issuers : $ReadOnlyArray<string>) : $ReadOnlyArray<ApplePaySupportedNetworks> {
    if (!issuers || (issuers && issuers.length === 0)) {
        return [];
    }

    const validIssuers = [];
    function validateIssuers(issuer : string) : ?ApplePaySupportedNetworks {
        const network = issuer.toLowerCase().replace(/_/g, '');
        if (Object.keys(validNetworks).indexOf(network) !== -1) {
            validIssuers.push(validNetworks[network]);
        }
    }

    issuers.forEach(validateIssuers);
    return validIssuers;
}

function getShippingContactFromAddress(shippingAddress : ?ShippingAddress) : ApplePayPaymentContact {
    if (!shippingAddress) {
        return {
            givenName:          '',
            familyName:         '',
            addressLines:       [],
            locality:           '',
            administrativeArea: '',
            postalCode:         '',
            country:            ''
        };
    }

    const { firstName, lastName, line1, line2, city, state, postalCode, country } = shippingAddress;

    return {
        givenName:    firstName,
        familyName:   lastName,
        addressLines: [
            line1,
            line2
        ],
        locality:           city,
        administrativeArea: state,
        postalCode,
        country
    };
}

function getApplePayShippingMethods(shippingMethods : ?$ReadOnlyArray<ShippingMethod>) : $ReadOnlyArray<ApplePayShippingMethod> {
    if (!shippingMethods || shippingMethods.length === 0) {
        return [];
    }

    return shippingMethods.map(method => {
        return {
            amount:     method.amount && method.amount.currencyValue ? method.amount.currencyValue : '',
            detail:     '',
            identifier: method.type,
            label:      method.label
        };
    });
}

function getMerchantCapabilities(supportedNetworks : $ReadOnlyArray<ApplePaySupportedNetworks>) : $ReadOnlyArray<ApplePayMerchantCapabilities> {
    const merchantCapabilities : Array<ApplePayMerchantCapabilities> = [];
    merchantCapabilities.push('supports3DS');

    if (supportedNetworks && supportedNetworks.indexOf('chinaUnionPay') !== -1) {
        merchantCapabilities.push('supportsEMV');
    }

    return merchantCapabilities;
}

export function createApplePayRequest(countryCode : $Values<typeof COUNTRY>, order : DetailedOrderInfo) : ApplePayPaymentRequest {
    const {
        allowedCardIssuers,
        cart: {
            amounts: {
                total: {
                    currencyCode,
                    currencyValue
                }
            },
            shippingAddress,
            shippingMethods
        }
    } = order.checkoutSession;

    const supportedNetworks = getSupportedNetworksFromIssuers(allowedCardIssuers);
    const shippingContact = getShippingContactFromAddress(shippingAddress);
    const applePayShippingMethods = getApplePayShippingMethods(shippingMethods);
    const merchantCapabilities = getMerchantCapabilities(supportedNetworks);

    const result = {
        countryCode,
        currencyCode,
        merchantCapabilities,
        supportedNetworks,
        requiredBillingContactFields: [
            'postalAddress',
            'name',
            'phone'
        ],
        requiredShippingContactFields: [
            'postalAddress',
            'name',
            'phone',
            'email'
        ],
        shippingContact: shippingContact && shippingContact.givenName ? shippingContact : {},
        shippingMethods: applePayShippingMethods && applePayShippingMethods.length ? applePayShippingMethods : [],
        total:           {
            amount: currencyValue,
            label:  '',
            type:   'final'
        }
    };

    return result;
}