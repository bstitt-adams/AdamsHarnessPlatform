# Academy / LMS Workflows

Complete step-by-step guides for managing courses, content, and enrollments.

---

## Table of Contents
- [Creating a New Course](#creating-a-new-course)
- [Setting Up Course Pricing](#setting-up-course-pricing)
- [Adding Modules to a Course](#adding-modules-to-a-course)
- [Creating Lessons](#creating-lessons)
- [Publishing a Course](#publishing-a-course)
- [Managing Enrollments](#managing-enrollments)
- [Viewing Purchase History](#viewing-purchase-history)

---

## Creating a New Course

### Prerequisites
- Admin access to the portal
- Course title and description ready
- Instructor information

### Steps

#### Step 1: Navigate to Academy Admin
1. Log into the portal at `/portal`
2. Click **Admin** in the sidebar
3. Select **Academy** from the admin menu
4. You'll see the Academy Dashboard with existing courses

#### Step 2: Open New Course Dialog
1. Click the **+ Add Course** button in the top-right
2. A dialog will appear with the course creation form

#### Step 3: Fill in Basic Information
| Field | Required | Description |
|-------|----------|-------------|
| Title | ✅ | Course name (e.g., "Introduction to Manufacturing Excellence") |
| Description | ❌ | Full course description (supports markdown) |
| Short Description | ❌ | Brief summary for course cards |
| Instructor Name | ✅ | Name of the course instructor |
| Instructor Bio | ❌ | Brief instructor background |

#### Step 4: Set Course Details
| Field | Options | Description |
|-------|---------|-------------|
| Difficulty Level | Beginner, Intermediate, Advanced | Target skill level |
| Estimated Duration | Minutes | Total course length |
| Category | Select from list | Course category |

#### Step 5: Add Learning Outcomes
1. Click **Add Outcome** button
2. Enter each learning outcome (what students will learn)
3. Add 3-5 outcomes for best results
4. Example: "Understand ISO 9001 quality management principles"

#### Step 6: Add Prerequisites
1. Click **Add Prerequisite** button
2. Enter any required prior knowledge
3. Example: "Basic understanding of manufacturing processes"

#### Step 7: Save the Course
1. Review all information
2. Click **Create Course**
3. The course is created in **Draft** status

### Result
- Course appears in the Academy Dashboard
- Course is not visible to public until published
- You can now add modules and lessons

---

## Setting Up Course Pricing

### Prerequisites
- Course already created
- Stripe integration configured (see Settings)

### Steps

#### Step 1: Open Course Settings
1. Go to **Admin → Academy**
2. Find your course in the list
3. Click the **⋮** menu button
4. Select **Edit Course**

#### Step 2: Configure Pricing
| Field | Description |
|-------|-------------|
| **Free Course** | Toggle ON for free enrollment |
| **Price** | Enter price in USD (e.g., 99.00) |
| **Compare At Price** | Optional original price for showing discount |

#### Step 3: For Free Courses
1. Toggle **Free Course** to ON
2. Price fields will be disabled
3. Click **Save Changes**

#### Step 4: For Paid Courses
1. Ensure **Free Course** is OFF
2. Enter the **Price** (e.g., 149.00)
3. Optionally enter **Compare At Price** (e.g., 199.00)
4. Click **Save Changes**

#### Step 5: Stripe Product Creation
When you save a paid course:
1. System automatically creates a Stripe Product
2. System creates a Stripe Price
3. IDs are stored in the course record
4. Course is ready for checkout

### Pricing Display
- Free courses show "Free" badge
- Paid courses show price
- If compare-at price set, shows strikethrough original price

---

## Adding Modules to a Course

### Prerequisites
- Course already created
- Module titles and descriptions planned

### Steps

#### Step 1: Open Content Builder
1. Go to **Admin → Academy**
2. Find your course
3. Click **Manage Content** button
4. You'll see the Content Builder page

#### Step 2: Create First Module
1. Click **+ Add Section** button
2. Enter **Module Title** (e.g., "Module 1: Foundations")
3. Enter **Description** (optional)
4. Click **Create Module**

#### Step 3: Add Additional Modules
1. Repeat Step 2 for each module
2. Modules appear in order created
3. Recommended: 4-8 modules per course

#### Step 4: Reorder Modules (if needed)
1. Use **↑** and **↓** arrows next to each module
2. Or drag modules to reorder (if drag enabled)
3. Order is saved automatically

#### Step 5: Edit a Module
1. Click the **✏️** (pencil) icon on the module
2. Update title or description
3. Click **Save Changes**

#### Step 6: Delete a Module
1. Click the **🗑️** (trash) icon on the module
2. Confirm deletion in the dialog
3. ⚠️ **Warning:** This deletes all lessons in the module

### Module Best Practices
- Keep module titles concise but descriptive
- Group related lessons together
- Aim for 3-6 lessons per module
- Use consistent naming (Module 1, Module 2, etc.)

---

## Creating Lessons

### Prerequisites
- Course with at least one module
- Lesson content ready (video URL, text, etc.)

### Steps

#### Step 1: Open Content Builder
1. Go to **Admin → Academy → [Course] → Manage Content**
2. Expand the target module by clicking it

#### Step 2: Add New Lesson
1. Click **+ Add Lesson** within the module
2. The lesson dialog opens

#### Step 3: Enter Basic Information
| Field | Required | Description |
|-------|----------|-------------|
| Lesson Title | ✅ | Name of the lesson |
| Description | ❌ | Brief lesson overview |

#### Step 4: Select Content Type
Choose one of the following:

| Type | Icon | Use Case |
|------|------|----------|
| **Video** | ▶️ | YouTube, Vimeo, Loom embeds |
| **Text/Article** | 📄 | Written content with markdown |
| **Quiz** | ❓ | Assessment questions |
| **Assignment** | 📋 | Homework/projects |
| **Download** | ⬇️ | PDF, worksheets, resources |
| **Live** | 📻 | Scheduled live sessions |

#### Step 5: Configure Content Type

**For Video Lessons:**
1. Paste the video URL
2. Preview appears automatically
3. Enter duration in minutes
4. Supported: YouTube, Vimeo, Loom, direct URLs

**For Text Lessons:**
1. Enter content in the text area
2. Markdown formatting supported
3. Use headers, lists, code blocks, etc.

**For Quiz Lessons:**
1. Basic setup in lesson dialog
2. Detailed questions configured separately
3. Or use AI Quiz Generator (see AI Workflows)

**For Download Lessons:**
1. Enter the download URL
2. Link to PDF, ZIP, or other files

#### Step 6: Set Preview Access
1. Toggle **Free Preview** if lesson should be accessible without enrollment
2. Recommended: Make 1-2 lessons free preview

#### Step 7: Save Lesson
1. Click **Create Lesson**
2. Lesson appears in the module
3. Repeat for additional lessons

#### Step 8: Reorder Lessons
1. Use **↑** and **↓** arrows
2. Lessons display in set order

### Lesson Best Practices
- Keep video lessons under 15 minutes
- Include a mix of content types
- Add quizzes after major sections
- Provide downloadable resources

---

## Publishing a Course

### Prerequisites
- Course has at least one module
- Modules have at least one lesson each
- Pricing configured (if paid)

### Pre-Publication Checklist

#### Content Check
- [ ] All modules have descriptive titles
- [ ] All lessons have content
- [ ] Videos are accessible and playing
- [ ] Text content is proofread
- [ ] Downloads are working

#### Course Details Check
- [ ] Course title is finalized
- [ ] Description is complete
- [ ] Thumbnail image uploaded
- [ ] Learning outcomes listed
- [ ] Difficulty level set

#### Pricing Check
- [ ] Price is set correctly
- [ ] Stripe product created (for paid courses)
- [ ] Compare-at price set (if showing discount)

### Steps to Publish

#### Step 1: Review Course
1. Go to **Admin → Academy**
2. Click on your course
3. Review all details

#### Step 2: Toggle Published Status
1. Click **Edit Course**
2. Find the **Published** toggle
3. Turn it ON
4. Click **Save Changes**

#### Step 3: Verify Public Access
1. Open a new browser tab
2. Go to `/academy/courses`
3. Verify course appears in catalog
4. Click to view course details page

### Unpublishing a Course
1. Edit the course
2. Toggle **Published** to OFF
3. Course is hidden from public catalog
4. Existing enrollments remain active

---

## Managing Enrollments

### Viewing Enrollments
1. Go to **Admin → Academy**
2. Click on a course
3. View **Enrollment Count** in course details

### Manual Enrollment (Coming Soon)
- Admin ability to manually enroll users
- Bulk enrollment via CSV
- Enrollment notifications

### Enrollment Flow for Users

#### Free Course Enrollment
1. User browses `/academy/courses`
2. Clicks on free course
3. Clicks **Enroll Now**
4. Instant enrollment created
5. User can access content

#### Paid Course Enrollment
1. User browses `/academy/courses`
2. Adds course to cart
3. Proceeds to checkout
4. Completes Stripe payment
5. Enrollment created automatically
6. User can access content

---

## Viewing Purchase History

### Steps

#### Step 1: Navigate to Purchases
1. Go to **Admin → Academy**
2. Click **Purchases** button in the header

#### Step 2: View Dashboard
The purchases page shows:
- **Total Revenue** - Sum of all paid purchases
- **Total Purchases** - Count of all purchases
- **Paid Purchases** - Successfully completed
- **Pending Purchases** - Awaiting payment

#### Step 3: Browse Purchase Table
| Column | Description |
|--------|-------------|
| Customer | Name and email |
| Course | Course title |
| Amount | Price paid |
| Status | pending, paid, failed, refunded |
| Date | Purchase timestamp |

#### Step 4: Filter and Search
1. Use the **Status** dropdown to filter
2. Use the search box for customer/course name
3. Results update automatically

#### Step 5: Export Data
1. Click **Export CSV** button
2. Download purchase history
3. Open in Excel/Sheets for analysis

### Purchase Statuses
| Status | Meaning |
|--------|---------|
| **Pending** | Checkout started, payment not completed |
| **Paid** | Payment successful, user enrolled |
| **Failed** | Payment failed |
| **Refunded** | Payment refunded via Stripe |

---

## Quick Reference

### Navigation Paths
| Task | Path |
|------|------|
| Academy Dashboard | `/portal/admin/academy` |
| Course Content Builder | `/portal/admin/academy/courses/[id]/content` |
| Purchase History | `/portal/admin/academy/purchases` |
| Public Course Catalog | `/academy/courses` |
| Shopping Cart | `/academy/cart` |

### Keyboard Shortcuts
| Shortcut | Action |
|----------|--------|
| `Ctrl + S` | Save current form |
| `Esc` | Close dialog |
| `Enter` | Submit form |

### Common Issues

| Issue | Solution |
|-------|----------|
| Course not showing in catalog | Check if Published is ON |
| Stripe checkout not working | Verify Stripe keys in Settings |
| Video not playing | Check URL format and accessibility |
| Enrollment not created | Check Stripe webhook configuration |
