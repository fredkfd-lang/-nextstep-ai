# Social community platform — build roadmap

The product name and domain are intentionally temporary. Build the product first; decide the public brand later.

## Product goals
- English and French interface.
- Community groups and meetup/event planning.
- Gift exchange draw with private assignments (production version must run securely on a server).
- Friendship and dating discovery for adults, with consent, blocking, reporting and moderation.
- Optional paid conversation sessions with clear terms and transparent pricing.

## Current prototype
- `index.html` is a front-end prototype.
- Group examples are stored only in the current browser's local storage.
- Gift exchange results are demo-only and shown on the current device.
- Discovery profiles and conversation hosts are fictional examples.
- No real accounts, shared database, real chat, payments, private notifications or production moderation exist yet.

## Build order
1. **Foundation:** choose a maintainable app structure, environment configuration, and a deployment target.
2. **Authentication:** secure sign-up/sign-in, account recovery, email verification, and profile settings.
3. **Database and permissions:** store users, groups, memberships, events and messages; enforce access rules on the server.
4. **Groups and events:** create/join/leave groups, member roles, event RSVP and notifications.
5. **Gift exchange:** server-side randomized assignment, exclusions, audit protections and private delivery to each participant; never expose all pairs to every participant.
6. **Messaging:** live one-to-one and group messaging, blocking, reporting, rate limits and abuse handling.
7. **Discovery:** adults-only dating, friendship preferences, consent-based matching, privacy controls and moderation.
8. **Conversation sessions:** booking, cancellation/refunds, verified hosts, session limits and payment provider integration only after legal and safety review.
9. **Quality and launch:** responsive/mobile testing, accessibility, privacy policy, terms, data deletion/export, backups, security review and monitoring.

## Safety and privacy requirements
- Do not expose emails, precise location or private profile data publicly.
- Do not store passwords directly; use a reputable authentication provider.
- Enforce all permissions server-side, not just in the browser.
- Treat gift draw assignments as secret data.
- Add report/block and moderation workflows before enabling real member discovery or messaging.
- Review applicable privacy, consumer protection, online-platform and age-related requirements before public launch.

## Next implementation milestone
Build the foundation and authentication/database integration in a separate development branch, then test the full flow before publishing. Keep the existing BerOpp site unchanged.
