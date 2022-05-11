/* @flow */
/** @jsx node */

import { FUNDING } from '@paypal/sdk-constants/src';
import { Spinner, VenmoSpinner } from '@paypal/common-components/src/ui';
import { node, type ComponentNode } from '@krakenjs/jsx-pragmatic/src';

type NativePopupProps = {|
    fundingSource : $Values<typeof FUNDING>,
    cspNonce : string
|};

export function NativePopup({ fundingSource, cspNonce } : NativePopupProps) : ComponentNode<{||}> {
    return (fundingSource === FUNDING.VENMO)
        ? <VenmoSpinner nonce={ cspNonce } />
        : <Spinner nonce={ cspNonce } />;
}
