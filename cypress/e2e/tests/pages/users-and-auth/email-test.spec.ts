
describe('Email Code Extraction', () => {
  it('should extract code from the Gmail email body', () => {
    const emailSearchQuery = 'subject:[GitHub] Please verify your device';

    // Call the fetchGmailMessages custom command to get the email messages
    cy.fetchGmailMessage(emailSearchQuery).then((resp: Cypress.Response<any>) => {
      // Extract the email body (usually encoded in 'payload.parts')
      const parts = resp.body.payload.parts;
      const emailBody = parts
        .filter((part) => part.mimeType === 'text/plain') // Find the plain text body part
        .map((part) => part.body.data) // Extract base64-encoded body content
        .join(''); // Join if there are multiple parts

      // Decode the base64 content (Gmail API returns email body in base64url encoding)
      const decodedBody = Cypress.Buffer.from(emailBody, 'base64').toString('utf-8');

      // Regex to extract the 6-digit code
      const match = decodedBody.match(/(\d{6})/);

      if (match) {
        const code = match[1]; // Extracted code

        cy.log('Extracted Code:', code);
      } else {
        cy.log('No code found');
      }
    });
  });
});
