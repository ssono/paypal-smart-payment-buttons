/* @flow */
const INITIAL_DATA_CHANNEL_NAME = 'initial-data-channel';

// eslint-disable-next-line compat/compat
const broadcast = new BroadcastChannel(INITIAL_DATA_CHANNEL_NAME);


export function cacheInitialData(token : string) : void {
  const {
    xprops: {
      buyerCountry = '',
      locale = {}
    } = {}
  } = window;
  const data = {
    token: token,
    areCookiesDisabled: false,
    isIframe: false,
    country: buyerCountry || 'US',
    countryCodeAsString: buyerCountry || 'US',
    languageCode: `${locale.lang}`
  }

  console.log('posting token', data);
  broadcast.postMessage(data);
}

