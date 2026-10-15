# Troubleshooting & FAQ

Comprehensive troubleshooting guide and frequently asked questions.

---

## Table of Contents
- [Common Issues](#common-issues)
- [Error Messages Reference](#error-messages-reference)
- [FAQ by Feature](#faq-by-feature)
- [Performance Issues](#performance-issues)
- [Data Issues](#data-issues)
- [Integration Issues](#integration-issues)

---

## Common Issues

### Authentication Issues

#### Issue: "Unable to log in"
**Symptoms:**
- Login button doesn't respond
- Error message on login
- Redirected back to login page

**Solutions:**
1. Clear browser cache and cookies
2. Try incognito/private window
3. Check if account exists
4. Verify email/password
5. Check if account is deactivated

#### Issue: "Session expired"
**Symptoms:**
- Suddenly logged out
- "Unauthorized" errors
- Actions fail unexpectedly

**Solutions:**
1. Log in again
2. Check browser allows cookies
3. Disable browser extensions that block cookies
4. Clear site data and re-login

---

### Academy/LMS Issues

#### Issue: "Course not showing in catalog"
**Symptoms:**
- Course created but not visible on `/academy/courses`
- Students can't find the course

**Solutions:**
1. **Check Published Status:**
   - Go to Admin → Academy
   - Edit the course
   - Ensure "Published" is toggled ON
   - Save changes

2. **Check Course Has Content:**
   - Some themes require at least one module
   - Add a module with at least one lesson

3. **Clear Cache:**
   - Hard refresh the page (Ctrl+Shift+R)
   - Clear browser cache

#### Issue: "Video not playing in lesson"
**Symptoms:**
- Video shows black screen
- "Video unavailable" message
- Embed not loading

**Solutions:**
1. **Verify URL Format:**
   ```
   ✅ https://www.youtube.com/watch?v=VIDEO_ID
   ✅ https://youtu.be/VIDEO_ID
   ✅ https://vimeo.com/VIDEO_ID
   ❌ https://youtube.com/shorts/VIDEO_ID (not supported)
   ```

2. **Check Video Accessibility:**
   - Video must be Public or Unlisted
   - Private videos won't embed
   - Test URL directly in browser

3. **Check Embedding Allowed:**
   - Some videos disable embedding
   - Contact video owner or use different video

#### Issue: "Enrollment not created after purchase"
**Symptoms:**
- Payment successful in Stripe
- User not enrolled in course
- No enrollment record in database

**Solutions:**
1. **Check Webhook Configuration:**
   - Go to Stripe Dashboard → Webhooks
   - Verify endpoint URL is correct
   - Check webhook secret matches

2. **Check Webhook Events:**
   - View recent webhook attempts
   - Look for failed deliveries
   - Check error messages

3. **Manual Enrollment:**
   - As admin, manually create enrollment
   - Contact support for bulk fixes

#### Issue: "AI content generation failing"
**Symptoms:**
- Spinning forever
- Error message appears
- Empty or partial content

**Solutions:**
1. **Check API Key:**
   - Go to Settings → Integrations
   - Verify OpenAI key is entered
   - Click "Test Connection"

2. **Check API Credits:**
   - Log into OpenAI platform
   - Verify account has credits
   - Check usage limits

3. **Try Simpler Request:**
   - Reduce number of modules/questions
   - Shorten context/prompts
   - Try again in a few minutes

---

### Payment Issues

#### Issue: "Stripe checkout not loading"
**Symptoms:**
- Checkout button doesn't work
- Blank page after clicking checkout
- Error in console

**Solutions:**
1. **Verify Stripe Keys:**
   - Check both publishable and secret keys
   - Ensure keys match (both test or both live)
   - Keys should start with `pk_` and `sk_`

2. **Check Browser Console:**
   - Press F12 → Console
   - Look for Stripe-related errors
   - Common: "Invalid API key"

3. **Test in Incognito:**
   - Browser extensions can interfere
   - Ad blockers may block Stripe

#### Issue: "Payment succeeded but showing as pending"
**Symptoms:**
- Stripe shows payment complete
- Platform shows "Pending" status
- User not enrolled

**Solutions:**
1. **Check Webhook Delivery:**
   - Stripe Dashboard → Webhooks
   - Find the event
   - Check delivery status

2. **Webhook Secret Mismatch:**
   - Regenerate webhook secret
   - Update in platform settings
   - Test again

3. **Manual Update:**
   - Find purchase in admin
   - Update status to "Paid"
   - Create enrollment manually

#### Issue: "Duplicate charges"
**Symptoms:**
- Customer charged multiple times
- Multiple purchase records

**Solutions:**
1. **Check for Double-Clicks:**
   - Implement loading state on button
   - Disable button after first click

2. **Refund Duplicates:**
   - Go to Stripe Dashboard
   - Find duplicate payments
   - Issue refunds

3. **Prevent Future:**
   - Use idempotency keys
   - Check for existing pending purchases

---

### Hero Carousel Issues

#### Issue: "Hero slides not showing"
**Symptoms:**
- Homepage shows blank hero area
- Slides exist but don't display

**Solutions:**
1. **Check Published Status:**
   - Go to Admin → Hero
   - Ensure at least one slide is Published
   - Check slide order

2. **Check for Errors:**
   - Open browser console (F12)
   - Look for JavaScript errors
   - Check network tab for failed requests

3. **Clear Cache:**
   - Hard refresh (Ctrl+Shift+R)
   - Clear browser cache
   - Try incognito window

#### Issue: "Hero images not loading"
**Symptoms:**
- Slide shows but image is broken
- Placeholder instead of image

**Solutions:**
1. **Check Image URL:**
   - Verify URL is accessible
   - Test URL directly in browser
   - Check for CORS issues

2. **Re-upload Image:**
   - Delete current image
   - Upload new image
   - Save slide

---

### Booking/Availability Issues

#### Issue: "No available time slots showing"
**Symptoms:**
- Booking page shows no times
- "No availability" message

**Solutions:**
1. **Check Weekly Schedule:**
   - Go to Availability → Settings
   - Ensure days are toggled ON
   - Verify start/end times

2. **Check Date Overrides:**
   - Look for blocked dates
   - Remove unnecessary overrides

3. **Check Meeting Type:**
   - Ensure meeting type exists
   - Verify duration fits in available slots
   - Check buffer times aren't too long

4. **Check Advance Booking:**
   - Min notice might be too long
   - Max advance might be too short

#### Issue: "Double bookings occurring"
**Symptoms:**
- Multiple bookings at same time
- Calendar conflicts

**Solutions:**
1. **Enable Calendar Sync:**
   - Connect Google/Outlook calendar
   - Enable two-way sync
   - External events block time

2. **Check Buffer Times:**
   - Add buffer before/after meetings
   - Prevents back-to-back bookings

---

## Error Messages Reference

### API Errors

| Error Code | Message | Cause | Solution |
|------------|---------|-------|----------|
| 400 | Bad Request | Invalid input data | Check form fields |
| 401 | Unauthorized | Not logged in or session expired | Log in again |
| 403 | Forbidden | No permission | Contact admin |
| 404 | Not Found | Resource doesn't exist | Check URL, refresh |
| 429 | Too Many Requests | Rate limited | Wait and retry |
| 500 | Internal Server Error | Server issue | Retry, contact support |
| 503 | Service Unavailable | Server overloaded | Wait and retry |

### Stripe Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `invalid_api_key` | Wrong API key | Check key in settings |
| `card_declined` | Card issue | Use different card |
| `expired_card` | Card expired | Update card info |
| `incorrect_cvc` | Wrong CVC | Re-enter card details |
| `processing_error` | Temporary issue | Retry payment |
| `webhook_signature_verification_failed` | Wrong webhook secret | Update secret |

### Firebase Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `permission-denied` | Firestore rules | Check security rules |
| `not-found` | Document missing | Verify document exists |
| `already-exists` | Duplicate ID | Use different ID |
| `resource-exhausted` | Quota exceeded | Upgrade plan or wait |
| `unauthenticated` | Not signed in | Sign in first |

### OpenAI Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `invalid_api_key` | Wrong key | Check API key |
| `insufficient_quota` | No credits | Add credits to account |
| `rate_limit_exceeded` | Too many requests | Wait and retry |
| `context_length_exceeded` | Prompt too long | Shorten input |
| `model_not_found` | Invalid model | Check model name |

---

## FAQ by Feature

### Academy FAQ

**Q: How many courses can I create?**
A: There's no limit on the number of courses. Create as many as needed.

**Q: Can I duplicate a course?**
A: Not directly in UI. Export course data and create new course with same content.

**Q: How do I offer a discount?**
A: Set a Compare At Price higher than the actual price. The discount will display automatically.

**Q: Can students download videos?**
A: No, videos are embedded only. For downloadable content, use the Download lesson type.

**Q: How do I track student progress?**
A: Progress tracking is on the roadmap. Currently, you can see enrollment counts.

### AI Content FAQ

**Q: How accurate is AI-generated content?**
A: AI content is a starting point. Always review and edit for accuracy and your specific context.

**Q: Can I use AI content commercially?**
A: Yes, content generated through OpenAI API is yours to use commercially.

**Q: Why is AI generation slow?**
A: Complex requests (many modules, long content) take longer. Typical: 10-60 seconds.

**Q: Can I use my own AI model?**
A: Yes, configure Ollama for local models. Quality may vary from OpenAI.

**Q: Is there a limit on AI generations?**
A: Limited by your OpenAI API credits. Monitor usage in OpenAI dashboard.

### Payments FAQ

**Q: What payment methods are supported?**
A: All methods supported by Stripe: credit/debit cards, Apple Pay, Google Pay, etc.

**Q: How do I issue a refund?**
A: Go to Stripe Dashboard → Payments → Find payment → Refund. Platform updates automatically via webhook.

**Q: Can I offer payment plans?**
A: Not currently built-in. Would require custom Stripe subscription setup.

**Q: Are there transaction fees?**
A: Stripe charges ~2.9% + $0.30 per transaction. Platform takes no additional fee.

**Q: How do I handle taxes?**
A: Configure tax settings in Stripe. Stripe Tax can automate tax calculation.

### Booking FAQ

**Q: Can multiple people have booking pages?**
A: Yes, each team member can have their own availability and booking link.

**Q: Can I require payment for bookings?**
A: Not built-in currently. Would require custom integration.

**Q: How far in advance can people book?**
A: Configurable per meeting type. Default is 30 days.

**Q: Can I set different availability for different meeting types?**
A: Currently, availability is shared. Use date overrides for specific adjustments.

---

## Performance Issues

### Slow Page Loading

**Symptoms:**
- Pages take >3 seconds to load
- Spinner shows for long time

**Solutions:**
1. **Check Network:**
   - Test internet speed
   - Try different network

2. **Check Browser:**
   - Clear cache
   - Disable extensions
   - Try different browser

3. **Check Data Volume:**
   - Large datasets slow queries
   - Use pagination
   - Archive old data

### Slow AI Generation

**Symptoms:**
- AI requests timeout
- Very long generation times

**Solutions:**
1. **Reduce Request Size:**
   - Fewer modules/questions
   - Shorter context

2. **Check API Status:**
   - OpenAI status page
   - May be experiencing issues

3. **Try Ollama:**
   - Local processing
   - No network latency

---

## Data Issues

### Missing Data

**Symptoms:**
- Records disappeared
- Data not saving

**Solutions:**
1. **Check Filters:**
   - Remove active filters
   - Check date ranges

2. **Check Permissions:**
   - Verify user has access
   - Check Firestore rules

3. **Restore from Backup:**
   - Go to Admin → Backups
   - Find recent backup
   - Restore specific collection

### Duplicate Data

**Symptoms:**
- Same record appears twice
- Duplicate entries

**Solutions:**
1. **Identify Duplicates:**
   - Export data
   - Find duplicates by ID or content

2. **Remove Duplicates:**
   - Delete extra records
   - Keep most recent/complete

3. **Prevent Future:**
   - Check for race conditions
   - Implement unique constraints

---

## Integration Issues

### Stripe Not Connecting

**Checklist:**
- [ ] API keys are correct
- [ ] Keys match environment (test/live)
- [ ] Webhook URL is accessible
- [ ] Webhook secret is current
- [ ] Required events are selected

### OpenAI Not Working

**Checklist:**
- [ ] API key is valid
- [ ] Account has credits
- [ ] Not rate limited
- [ ] Model name is correct
- [ ] Network allows API calls

### Calendar Sync Issues

**Checklist:**
- [ ] Integration is connected
- [ ] Permissions granted
- [ ] Correct calendars selected
- [ ] Sync direction configured
- [ ] No conflicting apps

---

## Getting Support

### Before Contacting Support

1. **Check this FAQ**
2. **Search documentation**
3. **Try troubleshooting steps**
4. **Check browser console for errors**
5. **Try in incognito window**

### Information to Provide

When contacting support, include:
- Description of issue
- Steps to reproduce
- Expected vs actual behavior
- Browser and version
- Screenshots
- Console errors (F12 → Console)
- Time when issue occurred

### Support Channels

| Channel | Best For | Response Time |
|---------|----------|---------------|
| Documentation | Self-service | Immediate |
| GitHub Issues | Bug reports | 1-5 days |
| Email | Complex issues | 24-48 hours |
