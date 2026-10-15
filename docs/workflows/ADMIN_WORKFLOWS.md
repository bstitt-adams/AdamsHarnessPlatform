# Admin Workflows

Complete step-by-step guides for administrative tasks including Hero management, Settings, and Backups.

---

## Table of Contents
- [Hero Carousel Management](#hero-carousel-management)
- [Platform Settings](#platform-settings)
- [Stripe Configuration](#stripe-configuration)
- [Backup Management](#backup-management)
- [User Management](#user-management)

---

## Hero Carousel Management

Manage the homepage hero carousel slides with full CRUD functionality.

### Accessing Hero Management

#### Step 1: Navigate to Hero Admin
1. Log into the portal at `/portal`
2. Click **Admin** in the sidebar
3. Select **Hero Management**
4. URL: `/portal/admin/hero`

### Creating a New Slide

#### Step 1: Open Create Dialog
1. Click **+ Add Slide** button
2. Slide creation wizard opens

#### Step 2: Fill in Content Fields

| Field | Required | Description | Example |
|-------|----------|-------------|---------|
| **Badge** | ❌ | Small label above headline | "New Feature" |
| **Headline** | ✅ | Main title text | "Transform Your Manufacturing" |
| **Highlighted Text** | ❌ | Emphasized portion (colored) | "Manufacturing" |
| **Subheadline** | ❌ | Supporting description | "Achieve operational excellence with our proven methodology" |

#### Step 3: Add Benefits
1. Click **Add Benefit**
2. Enter benefit text
3. Repeat for 3-5 benefits
4. Benefits display as bullet points

**Example Benefits:**
- "ISO certification support"
- "OEM contract readiness"
- "Operational efficiency gains"

#### Step 4: Configure Call-to-Action Buttons

**Primary CTA:**
| Field | Description |
|-------|-------------|
| Text | Button label (e.g., "Get Started") |
| URL | Destination link (e.g., "/contact") |
| Variant | default, outline, ghost |

**Secondary CTA:**
| Field | Description |
|-------|-------------|
| Text | Button label (e.g., "Learn More") |
| URL | Destination link (e.g., "/about") |
| Variant | Usually "outline" or "ghost" |

#### Step 5: Set Display Options
| Option | Description |
|--------|-------------|
| **Published** | Toggle to show/hide slide |
| **Order** | Display sequence (1 = first) |

#### Step 6: Save Slide
1. Review all fields
2. Click **Create Slide**
3. Slide appears in the list

### Editing a Slide

#### Step 1: Find the Slide
1. Go to **Admin → Hero Management**
2. Locate slide in the list

#### Step 2: Open Edit Dialog
1. Click the **✏️** (pencil) icon
2. Or click the slide row to expand, then **Edit**

#### Step 3: Make Changes
1. Update any fields
2. Preview changes in real-time (if available)
3. Click **Save Changes**

### Reordering Slides

#### Method 1: Arrow Buttons
1. Use **↑** to move slide up
2. Use **↓** to move slide down
3. Order saves automatically

#### Method 2: Edit Order Number
1. Edit the slide
2. Change the **Order** field
3. Save changes

### Publishing/Unpublishing Slides

#### Quick Toggle
1. Find the slide in the list
2. Click the **Published** toggle
3. Status changes immediately

#### Via Edit Dialog
1. Edit the slide
2. Toggle **Published** checkbox
3. Save changes

### Deleting a Slide

#### Step 1: Initiate Delete
1. Click the **🗑️** (trash) icon on the slide
2. Confirmation dialog appears

#### Step 2: Confirm Deletion
1. Review the slide being deleted
2. Click **Delete** to confirm
3. ⚠️ This action cannot be undone

### Viewing Live Carousel
1. Open homepage in new tab: `/`
2. Carousel displays published slides in order
3. Auto-advances every 5-7 seconds
4. Navigation dots show slide count

---

## Platform Settings

Configure integrations, API keys, and feature visibility.

### Accessing Settings

1. Click **Settings** in the sidebar
2. Or navigate to `/portal/settings`

### Integration Settings

#### OpenAI Configuration

| Field | Description |
|-------|-------------|
| **API Key** | Your OpenAI API key (sk-...) |
| **Model** | GPT-4o recommended |

**Steps:**
1. Go to **Settings → Integrations**
2. Find **OpenAI / LLM** section
3. Enter API key
4. Click **Test Connection**
5. Click **Save**

#### Stripe Configuration
See [Stripe Configuration](#stripe-configuration) section below.

#### Other Integrations

| Integration | Purpose |
|-------------|---------|
| **Mattermost** | Team notifications |
| **Zoom** | Video meeting integration |
| **DocuSeal** | Document signing |
| **Apollo** | Lead enrichment |
| **Go High Level** | CRM integration |
| **LinkedIn** | Professional networking |

### Feature Visibility

Control which features appear in the sidebar.

#### Step 1: Access Feature Settings
1. Go to **Settings**
2. Find **Feature Visibility** section

#### Step 2: Toggle Features
| Feature | Description |
|---------|-------------|
| Command Center | Main dashboard |
| Opportunities | Sales pipeline |
| Projects | Project management |
| Affiliates | Partner network |
| Customers | CRM |
| Meetings | Calendar |
| Academy | LMS |
| Documents | File management |

#### Step 3: Save Changes
1. Toggle features on/off
2. Click **Save**
3. Sidebar updates immediately

---

## Stripe Configuration

Set up Stripe for payment processing.

### Prerequisites
- Stripe account created
- Access to Stripe Dashboard

### Getting Stripe Keys

#### Step 1: Access Stripe Dashboard
1. Go to [dashboard.stripe.com](https://dashboard.stripe.com)
2. Log in to your account

#### Step 2: Navigate to API Keys
1. Click **Developers** in sidebar
2. Select **API Keys**

#### Step 3: Copy Keys
| Key | Location | Starts With |
|-----|----------|-------------|
| **Publishable Key** | Visible on page | `pk_test_` or `pk_live_` |
| **Secret Key** | Click "Reveal" | `sk_test_` or `sk_live_` |

### Configuring Webhook

#### Step 1: Create Webhook Endpoint
1. In Stripe Dashboard, go to **Developers → Webhooks**
2. Click **Add Endpoint**

#### Step 2: Enter Endpoint URL
```
https://yourdomain.com/api/stripe/webhook
```

#### Step 3: Select Events
Select these events:
- `checkout.session.completed`
- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`

#### Step 4: Get Webhook Secret
1. After creating, click on the webhook
2. Find **Signing Secret**
3. Click **Reveal**
4. Copy the secret (starts with `whsec_`)

### Adding Keys to Platform

#### Method 1: Environment Variables (Recommended)
```env
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

#### Method 2: Platform Settings
1. Go to **Settings → Integrations**
2. Find **Stripe** section
3. Enter all three keys
4. Click **Test Connection**
5. Click **Save**

### Testing Stripe Integration

#### Step 1: Use Test Mode
1. In Stripe Dashboard, toggle to **Test Mode**
2. Use test API keys (pk_test_, sk_test_)

#### Step 2: Test Checkout
1. Add a course to cart
2. Proceed to checkout
3. Use test card: `4242 4242 4242 4242`
4. Any future date, any CVC
5. Complete purchase

#### Step 3: Verify Webhook
1. Check Stripe Dashboard → Webhooks
2. View recent events
3. Ensure events show "Succeeded"

### Going Live

#### Checklist
- [ ] Switch to live API keys
- [ ] Update webhook endpoint URL
- [ ] Update webhook secret
- [ ] Test with real card (small amount)
- [ ] Verify enrollment creation

---

## Backup Management

Create and manage system backups.

### Accessing Backup System

1. Go to **Admin → Backups**
2. URL: `/portal/admin/backups`

### Creating a Manual Backup

#### Step 1: Open Backup Page
1. Navigate to **Admin → Backups**
2. View existing backups list

#### Step 2: Initiate Backup
1. Click **Create Backup** button
2. Select backup type:
   - **Full** - All collections
   - **Partial** - Selected collections

#### Step 3: Select Collections (Partial)
If partial backup:
- [ ] Courses
- [ ] Modules
- [ ] Lessons
- [ ] Purchases
- [ ] Enrollments
- [ ] Settings
- [ ] Hero Slides

#### Step 4: Start Backup
1. Click **Start Backup**
2. Progress indicator shows status
3. Wait for completion

#### Step 5: Verify Backup
1. Backup appears in list
2. Shows timestamp and size
3. Status: "Completed"

### Scheduling Automatic Backups

#### Step 1: Access Schedules
1. Go to **Admin → Backups**
2. Click **Schedules** tab

#### Step 2: Create Schedule
1. Click **+ Add Schedule**
2. Configure:

| Field | Options |
|-------|---------|
| **Frequency** | Daily, Weekly, Monthly |
| **Time** | Hour of day (UTC) |
| **Day** | Day of week (for weekly) |
| **Retention** | Days to keep backups |

#### Step 3: Enable Schedule
1. Toggle **Enabled** to ON
2. Click **Save Schedule**

### Restoring from Backup

#### Step 1: Select Backup
1. Find backup in list
2. Click **Restore** button

#### Step 2: Choose Restore Options
| Option | Description |
|--------|-------------|
| **Full Restore** | Replace all data |
| **Merge** | Add missing records only |
| **Selective** | Choose specific collections |

#### Step 3: Confirm Restore
1. Review what will be restored
2. ⚠️ **Warning:** Full restore overwrites existing data
3. Type confirmation phrase
4. Click **Restore**

#### Step 4: Verify Restoration
1. Check affected collections
2. Verify data integrity
3. Test application functionality

### Downloading Backups

#### Step 1: Find Backup
1. Locate backup in list
2. Click **Download** button

#### Step 2: Save File
1. JSON file downloads
2. Store securely offline
3. Use for disaster recovery

### Deleting Old Backups

#### Step 1: Select Backup
1. Find old backup
2. Click **🗑️** delete icon

#### Step 2: Confirm Deletion
1. Review backup details
2. Click **Delete**
3. Backup removed permanently

---

## User Management

Manage platform users and permissions.

### Viewing Users

1. Go to **Admin → Users** (if available)
2. View list of registered users
3. See roles and last activity

### User Roles

| Role | Permissions |
|------|-------------|
| **Admin** | Full access to all features |
| **Manager** | Access to portal, limited admin |
| **User** | Basic portal access |
| **Student** | Academy access only |

### Inviting Users

#### Step 1: Open Invite Dialog
1. Click **Invite User** button
2. Enter email address

#### Step 2: Set Role
1. Select appropriate role
2. Add to specific teams (optional)

#### Step 3: Send Invitation
1. Click **Send Invite**
2. User receives email
3. They complete registration

### Modifying User Permissions

#### Step 1: Find User
1. Search by name or email
2. Click on user row

#### Step 2: Edit Permissions
1. Change role if needed
2. Toggle specific permissions
3. Click **Save**

### Deactivating Users

#### Step 1: Find User
1. Locate in user list
2. Click **⋮** menu

#### Step 2: Deactivate
1. Select **Deactivate**
2. Confirm action
3. User can no longer log in

---

## Quick Reference

### Admin Navigation

| Task | Path |
|------|------|
| Hero Management | `/portal/admin/hero` |
| Academy Admin | `/portal/admin/academy` |
| Backup Management | `/portal/admin/backups` |
| Platform Settings | `/portal/settings` |

### Common Admin Tasks

| Task | Steps |
|------|-------|
| Add hero slide | Admin → Hero → + Add Slide |
| Configure Stripe | Settings → Integrations → Stripe |
| Create backup | Admin → Backups → Create Backup |
| Hide feature | Settings → Feature Visibility → Toggle |

### Troubleshooting

| Issue | Solution |
|-------|----------|
| Hero not updating | Clear browser cache, check Published status |
| Stripe not working | Verify all 3 keys, check webhook URL |
| Backup failed | Check storage space, retry |
| Settings not saving | Check network, refresh page |
