import { Matcher } from '@/cypress/support/types';

/**
 * Get input field for given label
 */
Cypress.Commands.add('byLabel', (label) => {
  return cy.get('.labeled-input').contains(label).siblings('input');
});

/**
 * Wrap the cy.find() command to simplify the selector declaration of the data-testid
 */
Cypress.Commands.add('findId', (id: string, matcher?: Matcher = '') => {
  return cy.find(`[data-testid${ matcher }="${ id }"]`);
});

/**
 * Wrap the cy.get() command to simplify the selector declaration of the data-testid
 */
Cypress.Commands.add('getId', (id: string, matcher?: Matcher = '') => {
  return cy.get(`[data-testid${ matcher }="${ id }"]`);
});

Cypress.Commands.add('keyboardControls', (triggerKeys: any = {}, count = 1) => {
  for (let i = 0; i < count; i++) {
    cy.get('body').trigger('keydown', triggerKeys);
  }
});

/**
 * Intercept all requests and return
 * @param {array} intercepts - Array of intercepts to return
 * return {array} - Array of intercepted request strings
 * return {string} - Intercepted request string
 */
Cypress.Commands.add('interceptAllRequests', (method = '/GET/POST/PUT/PATCH/', urls = [/v1\/(.+)/]) => {
  const interceptedUrls: string[] = urls.map((cUrl, i) => {
    cy.intercept(method, cUrl).as(`interceptAllRequests${ i }`);

    return `@interceptAllRequests${ i }`;
  });

  return cy.wrap(interceptedUrls);
});

/**
 * Logout of Rancher
 */
Cypress.Commands.add('logout', () => {
  // Commented the incercept here as per issue: https://github.com/rancher/rancher/issues/46795
  //   cy.intercept('POST', '/v3/tokens?action=logout').as('loggedOut');
  cy.visit('/auth/logout?logged-out=true');
  //   cy.wait('@loggedOut').its('response.statusCode').should('eq', 200);
});

Cypress.Commands.add('iFrame', () => {
  return cy
    .get('[data-testid="ember-iframe"]', { log: false })
    .its('0.contentDocument.body', { log: false })
    .should('not.be.empty')
    .then((body) => cy.wrap(body));
});

const runTimestamp = +new Date();

/**
 * Get root resource name
 */
Cypress.Commands.add('getRootE2EResourceName', () => {
  return cy.wrap(`e2e-test-${ runTimestamp }`);
});

/**
 * Create resource name
 */
Cypress.Commands.add('createE2EResourceName', (context, options = { prefixContext: false, onlyContext: false }) => {
  if (options?.onlyContext) {
    return cy.wrap(context);
  }

  return cy.getRootE2EResourceName().then((root) => options?.prefixContext ? `${ context }-${ root }` : `${ root }-${ context }`);
});

// See: https://stackoverflow.com/questions/74785083/how-can-i-get-a-custom-css-variable-from-any-element-cypress
Cypress.Commands.add('shouldHaveCssVar', { prevSubject: true }, (subject, styleName, cssVarName) => {
  cy.document().then((doc) => {
    const dummy = doc.createElement('span');

    dummy.style.setProperty(styleName, `var(${ cssVarName })`);
    doc.body.appendChild(dummy);

    const evaluatedStyle = window.getComputedStyle(dummy).getPropertyValue(styleName).trim();

    dummy.remove();

    cy.wrap(subject)
      .then(($el) => window.getComputedStyle($el[0]).getPropertyValue(styleName).trim())
      .should('eq', evaluatedStyle);
  });
});

let accessToken = '';

Cypress.Commands.add('fetchGmailMessage', (query) => {
  const clientId = Cypress.env('googleClientId');
  const clientSecret = Cypress.env('googleClientSecret');
  const refreshToken = Cypress.env('googleRefreshToken');

  // get a new access token
  return cy.request({
    method: 'POST',
    url:    'https://oauth2.googleapis.com/token',
    form:   true,
    body:   {
      client_id:     clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type:    'refresh_token',
    }
  }).then((resp) => {
    // if (resp.status === 400 && resp.body.error === 'invalid_grant') {
    //   throw new Error('Refresh token has expired or been revoked. Please generate a new refresh token.');
    // }
    accessToken = resp.body.access_token;

    // use the access token to query the Gmail API
    return cy.request({
      method:  'GET',
      url:     'https://gmail.googleapis.com/gmail/v1/users/me/messages',
      headers: { Authorization: `Bearer ${ accessToken }` },
      qs:      { q: query } // use Gmail search syntax, e.g., "subject:test"
    }).then((resp) => {
      // get the message ID of the first email
      const messageId = resp.body.messages[0].id;

      cy.request({
        method:  'GET',
        url:     `https://gmail.googleapis.com/gmail/v1/users/me/messages/${ messageId }`,
        headers: { Authorization: `Bearer ${ accessToken }` }
      });
    });
  });
});
