# Hero Carousel Management - Quick Start Guide

## 🚀 Quick Setup (5 minutes)

### Step 1: Get API Keys

#### Pexels (Free)
1. Go to [https://www.pexels.com/api/](https://www.pexels.com/api/)
2. Click "Get Started"
3. Sign up with email
4. Copy your API key

#### Unsplash (Free)
1. Go to [https://unsplash.com/developers](https://unsplash.com/developers)
2. Click "Register as a developer"
3. Create a new application
4. Copy your "Access Key"

### Step 2: Add to Environment Variables

Add to your `.env.local` file:

```env
PEXELS_API_KEY=your_pexels_api_key_here
UNSPLASH_ACCESS_KEY=your_unsplash_access_key_here
```

### Step 3: Restart Development Server

```bash
# Stop the server (Ctrl+C)
# Restart it
npm run dev
```

### Step 4: Access Admin Panel

Navigate to: **`/portal/admin/hero`**

## 📝 Creating Your First Slide (2 minutes)

1. **Click "Add New Slide"**

2. **Step 1 - Basic Info:**
   - Badge: "Adams Electric — Since 1928"
   - Headline: "Build Trust"
   - Highlighted: "Through Performance"

3. **Step 2 - Content:**
   - Subheadline: "A third-generation, family-owned electrical contractor serving the Southeast"
   - Benefits: "PreConstruction", "BIM / Virtual Design", "PreFabrication"

4. **Step 3 - Design:**
   - Search: "business success team"
   - Select an image you like
   - Enable overlay (50% opacity, black)

5. **Step 4 - Animation:**
   - Type: Fade
   - Duration: 500ms
   - Delay: 0ms

6. **Step 5 - Actions:**
   - Primary CTA: "Take the Quiz" → `/quiz-intro`
   - Secondary CTA: "Schedule a Call" → `/schedule-a-call`
   - Enable Lead Magnet: Quiz
   - Add urgency message (optional)

7. **Step 6 - Review:**
   - Preview your slide
   - Toggle "Publish immediately"
   - Click "Create Slide"

## 🎨 Best Practices Cheat Sheet

### Headlines
✅ "Build a Business That **Outlasts You**"
✅ "Stop Being the **Bottleneck**"
❌ "We Help Businesses" (too generic)
❌ "Click Here to Learn More" (no value)

### Images
✅ Search: "business success", "team collaboration", "growth"
✅ Use overlay for text readability
❌ Busy images with too many elements
❌ Low-quality or pixelated photos

### Animations
✅ Fade (500ms) - Professional, subtle
✅ Slide Up (600ms) - Energy, momentum
❌ Multiple animations on same slide
❌ Duration > 1000ms (too slow)

### CTAs
✅ "Take the Adams IQ™ Quiz"
✅ "Get Your Free Assessment"
❌ "Click Here"
❌ "Learn More"

### Lead Magnets
✅ Use urgency sparingly (1-2 slides max)
✅ Match urgency to offer type
❌ Urgency on every slide
❌ Generic urgency messages

## 🔧 Troubleshooting

### Images Not Loading?
- Check API keys in `.env.local`
- Restart dev server
- Check rate limits (Pexels: 200/hr, Unsplash: 50/hr)

### Slides Not Saving?
- Check Firestore connection
- Verify admin permissions
- Check browser console for errors

### Animations Not Working?
- Clear browser cache
- Try different animation type
- Check if reduced motion is enabled

## 📊 Current Slides

The system comes pre-loaded with 5 Adams Electric slides:

1. **Adams System™** - Main value proposition
2. **Stop Being the Bottleneck** - Pain point focus
3. **Post Construction** - Closeout and turnover support
4. **Client Success Stories** - Social proof
5. **Adams Academy Framework** - Methodology

You can edit or delete these and create your own.

## 🎯 Conversion Optimization Tips

### Slide Order Strategy
1. **Slide 1**: Main value proposition (what you do)
2. **Slide 2**: Pain point solution (why they need you)
3. **Slide 3**: Unique methodology (how you're different)
4. **Slide 4**: Social proof (why they should trust you)
5. **Slide 5**: Specific offer (what to do next)

### A/B Testing Ideas
- Test different headlines
- Try with/without background images
- Compare animation types
- Test urgency messages
- Vary CTA language

### Mobile Optimization
- Keep headlines under 10 words
- Use 2-3 benefits max
- Test on actual mobile devices
- Ensure overlay opacity works on small screens

## 📈 Next Steps

1. **Create 3-5 slides** covering different value propositions
2. **Add compelling images** that support your message
3. **Enable lead magnets** on 1-2 high-converting slides
4. **Test on mobile** to ensure readability
5. **Monitor performance** (future feature: analytics)

## 🆘 Need Help?

- Full documentation: `docs/HERO_CAROUSEL_MANAGEMENT.md`
- Component files: `components/marketing/`
- Admin page: `app/(portal)/portal/admin/hero/page.tsx`
- Schema: `lib/schema.ts` (HeroSlideDoc interface)

---

**Pro Tip:** Start with 3 slides, test them for a week, then optimize based on what resonates with your audience.
