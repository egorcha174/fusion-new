# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in Home Assistant UI, please report it responsibly:

1. **DO NOT** open a public issue on GitHub
2. **DO NOT** disclose the vulnerability publicly
3. Email your findings to: [security contact email]
4. Include:
   - Description of the vulnerability
   - Steps to reproduce (if applicable)
   - Potential impact
   - Suggested fix (if you have one)

We will acknowledge your report within 48 hours and keep you updated on the progress.

## Security Guidelines for Contributors

### Environment Variables & Secrets

- **NEVER** commit secrets, API keys, or tokens to the repository
- All sensitive data must be stored in `.env.local` (listed in `.gitignore`)
- Use `.env.example` as a template for required environment variables
- Before pushing, verify no secrets are exposed: `git log -S "your_secret"`

### Code Security

#### XSS Protection
- React automatically escapes all rendered content by default
- Avoid using `dangerouslySetInnerHTML` unless absolutely necessary
- If you must use it, sanitize input with a library like `DOMPurify`
- Never concatenate user input directly into HTML/JS/CSS

#### CSRF Protection
- All API requests should use tokens or secure mechanisms
- Implement proper CORS headers on backend services
- Use SameSite cookie attributes for session management

#### Input Validation
- Always validate and sanitize user inputs on both frontend and backend
- Use TypeScript strict mode to catch type-related issues
- Implement proper error handling without exposing sensitive information

### Dependencies Management

- Regularly run `npm audit` and fix vulnerabilities
- Keep dependencies up to date
- Review security advisories from GitHub Dependabot
- Use `npm ci` instead of `npm install` in production environments
- Lock dependencies in `package-lock.json`

### Access Control

- Implement proper authentication and authorization
- Use role-based access control (RBAC) where applicable
- Never expose sensitive operations or configuration in the UI
- Validate all permissions on the backend/server side
- Limit administrative functions to authorized users only

### Data Protection

- Use HTTPS for all communication
- Never transmit sensitive data in URLs or query parameters
- Implement proper session management
- Use secure, HTTP-only cookies for authentication tokens
- Clear sensitive data from memory when no longer needed

### Logging & Monitoring

- Don't log sensitive information (passwords, tokens, API keys)
- Implement error handling that doesn't expose stack traces to users
- Use proper error boundaries in React components
- Monitor for unusual activity or repeated failed authentication attempts

## Security Best Practices

### For Users

1. **Keep your Home Assistant installation updated**
   - Regular updates include security patches
   - Subscribe to Home Assistant security announcements

2. **Secure your API Key**
   - Store `GEMINI_API_KEY` securely on your local machine
   - Never share your API key with others
   - Rotate keys periodically

3. **Use HTTPS**
   - Access the application over encrypted connections
   - Use a reverse proxy with SSL/TLS if exposing to the internet

4. **Network Security**
   - Restrict access to your Home Assistant instance
   - Use a firewall and VPN if accessing remotely
   - Keep your router and devices updated

### For Developers

1. **Follow the Principle of Least Privilege**
   - Grant only necessary permissions
   - Use minimal API scopes
   - Separate concerns with proper module boundaries

2. **Code Review**
   - All changes should be reviewed by at least one other developer
   - Focus on security implications during reviews
   - Use static analysis tools (ESLint, TypeScript strict mode)

3. **Testing**
   - Write tests for security-critical code
   - Include tests for input validation
   - Test error handling and edge cases

4. **Documentation**
   - Document security assumptions
   - Keep security documentation up to date
   - Document API security requirements

## Security Tools & Configuration

- **TypeScript Strict Mode**: Enabled for type safety
- **ESLint**: Configured to catch common security issues
- **npm audit**: Regularly run to identify vulnerable dependencies
- **GitHub Security Alerts**: Enabled for vulnerability detection
- **.gitignore**: Properly configured to prevent secret leakage

## Third-Party Services

This application uses the following external services:

- **Google Gemini API**: For AI-powered features
  - API key must be kept private
  - Review Google's security and privacy policies
  - Understand data retention policies

- **Home Assistant**: Backend service for home automation
  - Ensure your Home Assistant instance is properly secured
  - Use strong authentication credentials
  - Keep Home Assistant updated

## License

This project is generated from the Google Gemini/Studio repository template.

## Contact & Support

For security questions or concerns, please reach out to the maintainers responsibly.

---

**Last Updated**: November 2025
**Version**: 1.0
