# Hero Carousel Management System

## Overview

The Hero Carousel Management System provides a comprehensive admin interface for creating and managing compelling hero slides with professional images, animations, and lead generation features.

## Features

### 1. **6-Step Wizard for Slide Creation**

#### Step 1: Basic Info
- Badge text (attention-grabbing label)
- Headline (main message)
- Highlighted text (emphasized in brand color)

#### Step 2: Content
- Subheadline (value proposition)
- Key benefits (up to 3 bullet points)

#### Step 3: Design
- **Background Images**: Search and select from Pexels or Unsplash
- **Overlay Settings**: Add color overlays to improve text readability
  - Enable/disable overlay
  - Color picker
  - Opacity slider (0-100%)

#### Step 4: Animation
- **Animation Types**:
  - **Fade**: Smooth opacity transition (professional, subtle)
  - **Slide Up**: Slide from bottom (energy, upward momentum)
  - **Slide Left**: Slide from right (directional flow)
  - **Zoom**: Scale up effect (impact, attention)
  - **None**: Instant display
- **Duration**: 200-2000ms (recommended: 500-800ms)
- **Delay**: 0-1000ms before animation starts

#### Step 5: Actions (CTAs)
- **Primary CTA**: Main conversion goal
- **Secondary CTA**: Alternative path (lower commitment)
- **Lead Magnet Settings**:
  - Enable/disable lead magnet
  - Type: Quiz, Consultation, Download, Demo
  - Urgency messages for increased conversion

#### Step 6: Review
- Live preview of the slide
- Publish toggle
- Final review before saving

### 2. **Image Integration**

#### Pexels Integration
- Search thousands of free stock photos
- Automatic attribution
- Landscape-oriented images optimized for hero sections

#### Unsplash Integration
- High-quality professional photography
- Automatic photographer credit
- Curated collections

#### Search Tips
- Use terms like: "business success", "team collaboration", "growth", "leadership"
- Images are automatically filtered for landscape orientation
- Attribution is included automatically

### 3. **Animation Best Practices**

#### Recommended Settings
- **Duration**: 500-800ms feels natural and smooth
- **Delay**: Use sparingly (0-200ms) to create anticipation
- **Type Selection**:
  - Professional sites: Fade
  - Energy/momentum: Slide Up
  - Impact/attention: Zoom
  - Directional flow: Slide Left

#### Performance
- Animations use CSS transforms for smooth 60fps performance
- Automatic fallbacks for reduced motion preferences
- Optimized for mobile devices

### 4. **Lead Generation Features**

#### Lead Magnet Types
1. **Quiz**: Adams IQ™ Quiz
2. **Consultation**: Free strategy call booking
3. **Download**: Guide or resource
4. **Demo**: Product demonstration

#### Urgency Messages
Pre-written urgency messages proven to increase conversions:
- "Limited Time: Free Assessment Ending Soon!"
- "Join 500+ Business Owners Who Transformed Their Companies"
- "Only 3 Strategy Slots Available This Week"
- "Get Results in 90 Days or Your Money Back"
- "Exclusive Offer: First 10 Clients Get 50% Off"

#### Conversion Optimization
- Urgency messages increase conversion by 20-30%
- Action-oriented CTA language
- Clear value propositions
- Social proof integration

### 5. **Slide Management**

#### Features
- Drag-and-drop reordering (up/down arrows)
- Publish/unpublish toggle
- Live preview thumbnails
- Edit existing slides
- Delete with confirmation
- Real-time Firestore sync

#### Stats Dashboard
- Total slides count
- Published slides
- Slides with images
- Active lead magnets

## Setup Instructions

### 1. Environment Variables

Add the following to your `.env.local` file:

```env
# Pexels API
PEXELS_API_KEY=your_pexels_api_key_here

# Unsplash API
UNSPLASH_ACCESS_KEY=your_unsplash_access_key_here
```

### 2. Get API Keys

#### Pexels API Key
1. Visit [https://www.pexels.com/api/](https://www.pexels.com/api/)
2. Sign up for a free account
3. Generate an API key
4. Copy to `.env.local`

#### Unsplash API Key
1. Visit [https://unsplash.com/developers](https://unsplash.com/developers)
2. Create a developer account
3. Create a new application
4. Copy the "Access Key" to `.env.local`

### 3. Firestore Collection

The system uses the `heroSlides` collection in Firestore with the following schema:

```typescript
interface HeroSlideDoc {
  id: string;
  badge: string;
  headline: string;
  highlightedText: string;
  subheadline: string;
  benefits: string[];
  primaryCta: { text: string; href: string };
  secondaryCta: { text: string; href: string };
  isPublished: boolean;
  order: number;
  backgroundImage?: {
    url: string;
    source: "pexels" | "unsplash" | "custom";
    photographer?: string;
    photographerUrl?: string;
    alt: string;
  };
  animation?: {
    type: "fade" | "slide-up" | "slide-left" | "zoom" | "none";
    duration: number;
    delay: number;
  };
  overlay?: {
    enabled: boolean;
    color: string;
    opacity: number;
  };
  leadMagnet?: {
    enabled: boolean;
    type: "quiz" | "download" | "consultation" | "demo";
    urgency?: string;
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

## Usage

### Access the Admin Panel

Navigate to: `/portal/admin/hero`

### Creating a New Slide

1. Click "Add New Slide"
2. Follow the 6-step wizard
3. Search for images (optional)
4. Configure animations
5. Set up CTAs and lead magnets
6. Review and publish

### Editing Existing Slides

1. Click the pencil icon on any slide
2. Modify fields in the wizard
3. Save changes

### Reordering Slides

Use the up/down arrow buttons to change slide order. Changes are saved automatically.

### Publishing/Unpublishing

Click the eye icon to toggle visibility. Only published slides appear in the carousel.

## Best Practices

### Copywriting
- **Headlines**: Keep under 10 words, action-oriented
- **Subheadlines**: One clear sentence explaining the benefit
- **Benefits**: Short, punchy phrases (3-5 words each)
- **CTAs**: Use verbs ("Get", "Start", "Discover", "Take")

### Design
- **Images**: Choose high-quality, relevant images that support your message
- **Overlays**: Use dark overlays (50-70% opacity) for better text readability
- **Colors**: Maintain brand consistency with highlighted text

### Animation
- **Consistency**: Use the same animation type across all slides
- **Subtlety**: Faster isn't better - smooth transitions convert better
- **Mobile**: Test on mobile devices for performance

### Lead Generation
- **Urgency**: Use sparingly for maximum impact
- **Value**: Clearly communicate what users get
- **Friction**: Primary CTA should be low-friction (quiz, assessment)
- **Alternative**: Secondary CTA offers different path

## Components

### Admin Components
- `app/(portal)/portal/admin/hero/page.tsx` - Main admin interface
- `components/admin/image-search.tsx` - Image search component

### Frontend Components
- `components/marketing/hero-carousel-enhanced.tsx` - Enhanced carousel
- `components/marketing/adams-hero-carousel-enhanced.tsx` - Adams Electric version

### API Routes
- `app/api/images/pexels/route.ts` - Pexels image search
- `app/api/images/unsplash/route.ts` - Unsplash image search

## Troubleshooting

### Images Not Loading
- Verify API keys are set in `.env.local`
- Check API rate limits (Pexels: 200/hour, Unsplash: 50/hour)
- Ensure environment variables are loaded (restart dev server)

### Animations Not Working
- Check browser compatibility (modern browsers only)
- Verify Tailwind CSS is configured correctly
- Test with different animation types

### Slides Not Saving
- Check Firestore connection
- Verify user has admin permissions
- Check browser console for errors

## Performance Optimization

### Image Loading
- Images are lazy-loaded
- Background images use CSS for better performance
- Thumbnails are used in admin interface

### Animation Performance
- CSS transforms for 60fps animations
- Hardware acceleration enabled
- Respects user's reduced motion preferences

### Firestore
- Real-time listeners for instant updates
- Batch operations for reordering
- Optimistic UI updates

## Future Enhancements

- [ ] A/B testing for slides
- [ ] Analytics integration (view counts, click-through rates)
- [ ] Video backgrounds
- [ ] Custom image upload
- [ ] Slide scheduling (publish at specific times)
- [ ] Multi-language support
- [ ] Template library with pre-made slides

## Support

For issues or questions, contact the development team or refer to the main project documentation.
