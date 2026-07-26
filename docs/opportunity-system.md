# Opportunity System

The opportunity system turns OneClyq from a passive feed into a creator network where posts can lead to collaborations, paid work, mentoring, calls, and bookings.

## Product Shape

The core loop is:

1. A creator configures their opportunity signals in the Creator Hub.
2. Those signals appear on their public profile and creator cards.
3. People discover them in the Collab Marketplace or from a post detail page.
4. Interested people message, apply to a request, or book a session.

This uses the existing Next.js frontend and Django backend. No new language or major infrastructure is required.

## Creator Hub

File:

- `app/app/creator/page.tsx`

The Creator Hub now includes an `Opportunity kit` section. Creators can set:

- Open to collab
- Open to hire
- Open to mentor
- Availability status
- Skill tags
- Creator pitch/bio

The panel includes a small public preview and a readiness score. Saving the kit updates the existing profile fields through:

- `app/app/api/auth/profile_update/route.ts`
- `backend/accounts/views.py`
- `backend/accounts/serializers.py`

The Creator Hub also links directly to the marketplace and uses post-focused language instead of video-only language.

## Marketplace

File:

- `app/app/collabs/page.tsx`

The marketplace already supports creator discovery, open requests, applications, applicant review, follows, messages, and call entry points.

New behavior:

- `/collabs?creator=username&mode=hire`
- `/collabs?creator=username&mode=collab`
- `/collabs?creator=username&mode=mentor`

These links prefill marketplace search/mode so profile and post detail CTAs land in context.

## Public Profile

File:

- `app/app/profile/[username]/page.tsx`

Profiles already show open-to badges and booking slots. They now also show a `Work with me` CTA when a creator is open to collab, hire, or mentor. The CTA deep-links into the marketplace with the creator and best matching mode.

## Post Detail

File:

- `app/app/video/[id]/page.tsx`

When a viewer discovers a creator from a post, the creator card can show `Work with me` if that creator has opportunity modes enabled. This keeps the opportunity path close to the content that created interest.

## Profile Update Fix

The profile update API now forwards `membership_tiers`, which the Creator Hub already attempted to save.

Files:

- `app/app/api/auth/profile_update/route.ts`
- `app/app/store/authSlice.tsx`

## Next Ideas

- Add a dedicated short pitch modal from profile to message thread.
- Add request templates such as `Need editor`, `Need model`, `Need beat`, `Book mentor call`.
- Add marketplace sort by response rate, recent activity, or completed collabs.
- Add notification copy for booking/application status changes.
