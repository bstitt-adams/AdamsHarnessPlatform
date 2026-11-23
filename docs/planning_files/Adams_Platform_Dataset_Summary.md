# Adams Platform: Dataset Inventory and Data Upkeep Plan

**Prepared for:** Brian Stitt, Mission Critical Safety
**Date:** November 22, 2026
**Scope:** Datasets sent to Brian by email or OneDrive share between Oct 14 and Nov 18, 2026, that are meant for the Adams Platform. Every count below comes from the files themselves. This document contains no personal details.

---

## 1. Summary

The team has sent **13 datasets**. They cover four platform areas: **People**, **Training & Certifications**, **Jobsites**, and **Order Tracking**. Three more datasets the platform needs have **not arrived yet**: vehicle expiration data, a JJ Keller training export, and calendar events.

Today each dataset is a one-time snapshot that lives in a spreadsheet or an email. As soon as it is loaded, it starts to go stale. This plan rests on three ideas:

1. **One system of record per data type.** A system of record is the one place where a given type of data is officially kept. The platform reads from it and does not compete with it.
2. **Every dataset has an owner and a refresh cadence.** The cadence is a fixed schedule for updating it.
3. **Every important date or status produces a task for a named person.** A report alone is not enough.

| # | Dataset | Sent by | Platform area | Size / shape | Main issue |
|---|---|---|---|---|---|
| 1 | MC Email and Phone List (10.23.2026) | Brittany Martin (HR) | People | About 210 employees, 10 columns | Mostly personal email addresses; text encoding errors |
| 2 | MC Employees (BJ) | Betty Jean Cardwell | People | OneDrive file | Overlaps with #1; needs merging |
| 3 | Hamlet roster (CLT 105) | Jeff Allen | People / Jobsites | 25 workers, 7 columns | Includes TechSource workers who are not on the HR list |
| 4 | New-hire onboarding tracker ("copy for Brian") | Jeff Allen | People / Onboarding | About 207 hires, about 38 columns | Free-text statuses; recent hires have steps still open |
| 5 | SiteDocs Certifications export (2026-10-26) | Jeff Allen | Training & Certs | 217 people, 1,190 cert records | 59 people with no certs uploaded; 46 with at least one expired |
| 6 | OSHA Certification Tracker (Current) | Jeff Allen | Training & Certs | 15 tabs, 330 records | 107 records have no document behind them; renewal rules differ from #7 |
| 7 | Certificate renewal periods | Betty Jean Cardwell | Training & Certs | 7 rules in an email body | Disagrees with #6 for OSHA 10 and OSHA 510 |
| 8 | JJ Keller certificates (Certificates.pdf) | Jeff Allen | Training & Certs | PDF + list of 22 recipients | No completion data through the JJ Keller API |
| 9 | Toolbox Talk Topics | Betty Jean Cardwell | Training / Safety Calendar | OneDrive file | Not yet tied to dates or sites |
| 10 | Site addresses | Betty Jean (via Jeff) | Jobsites / Map | 6 sites in an email body | Some sites have two addresses on file |
| 11 | Site job numbers and cost codes | Betty Jean Cardwell | Jobsites | 8 sites in an email body | Site names written several different ways |
| 12 | Site orientation requirements (Go Contractor, HammerTech, flyers) | Betty Jean / Jeff | Jobsites / Onboarding | 1 file, 1 PDF, 3 emails | Spread across 5 messages |
| 13 | Order log (Kojo Orders – Copy) | Betty Jean Cardwell | Order Tracking | 2 orders | No quantity, cost, or requester fields |

---

## 2. Dataset details

### People

#### 1. MC Email and Phone List (HR export)
- **Source:** Brittany Martin, Oct 23, in reply to Jeff's request for every Mission Critical employee's contact details.
- **Contents:** About 210 rows. Columns: Last, First, Middle, Home Email, Work Phone, Home Phone, Hire Date, Title, Department, Facility.
- **Data quality:**
  - Fewer than 10 rows have an `@adams-electric.com` address. Jeff asked (Oct 23) that the platform use company email, not home email.
  - Hire dates are stored as Excel serial numbers. These are raw day counts, such as 46314, that need converting to dates.
  - Accented names display incorrectly (for example, "JesÃºs"). The file was saved with the wrong character encoding.
  - Titles are inconsistent: mixed capitalization, typos such as "APPRENICE", and the same role under several names.
  - There is no employee ID column. The EE CODE in dataset #4 is the natural match key.
- **Use in the platform:** The base list for *My Mission Critical* profiles, hardhat QR codes, and training assignments.

#### 2. MC Employees (BJ)
- **Source:** Betty Jean Cardwell, OneDrive share, Nov 3.
- **Contents:** Betty Jean's working list of Mission Critical employees. The search tool could not open it, so its columns have not been checked.
- **Action:** Compare it against #1. Keep whatever extra fields it has, such as site assignment or safety notes, and merge it in. Then retire it as a separate list.

#### 3. Hamlet roster (CLT 105)
- **Source:** Jeff Allen, Oct 26.
- **Contents:** 25 workers at CLT 105, about half Adams and half TechSource. Columns: Last, First, Position, Company, Hire Date, Phone, Email.
- **Data quality:** It includes **TechSource workers who are not on the HR list**. One hire date was entered as "2025" instead of a date.
- **Use in the platform:** Shows the need for a *Company* field (Adams / TechSource / other) and a *current site* field on each person. Contractor workers need profiles and certification tracking too.

#### 4. New-hire onboarding tracker
- **Source:** Jeff Allen, Nov 18.
- **Contents:** About 207 hires, numbered in a Count column. About 38 columns in four stages:
  - **New Hire Info:** name, onboarding and hire dates, EE CODE, position, supervisor, jobsite, contact details.
  - **Pre-Hire:** offer sent, Arcoro paperwork, background check, OSHA card received, 10-panel drug screen, GC orientation, IT needs, vehicle needs, driving record (MVR) check, shirt and glove size, translator needed. Arcoro is the HR onboarding system.
  - **Onboarding:** onboarding location, internal new-hire email.
  - **Post-Hire:** drug screen results, E-Verify, documents scanned, push to CoreHR, Spectrum, Employee Navigator, email to payroll. Some columns already name an owner (Tangie, Brittany).
- **Data quality:**
  - Status cells are free text: "Needs 10", "Has 30", "BJ Sent", "JA sent renewal", "Unsent", "REQUESTED", "?".
  - Jobsite values are written many ways: "CLT100**", "AVC-43", "CLT04 / QTS", "04 - DLR", "(CLT04) Digital Reality".
  - The Count column has a duplicate number and a skipped number. Some supervisor names are misspelled.
  - The most recent hires (mid-to-late November) still show background checks "REQUESTED", OSHA cards "Need", and GC orientation "Unsent". These are open items that someone should be prompted to finish.
- **Use in the platform:** The best candidate for an **onboarding workflow** in the platform, where each column becomes a checklist step with an owner and a due date. The OSHA card, GC orientation, and IT/vehicle columns also feed the Training, Jobsite, and Asset modules.

### Training & Certifications

#### 5. SiteDocs Certifications export
- **Source:** Jeff Allen, Oct 26. Two sheets: *Summary by Person* and *All Certifications*.
- **Contents:** 217 people and 1,190 certification records. Each record has issuer, acquired date, expiry date, status, and whether an image is attached. Each person has a job title in SiteDocs format, such as `AEC - MC - ELECTRICIAN`.
- **What it shows (as of Oct 26):**
  - **59 people have no certifications uploaded.**
  - **46 people have at least one expired certification.**
  - **12 people had a certification expiring within 60 days.** Some of these have probably expired since.
  - First Aid/CPR is marked expired for 12 people, OSHA 10 for 6, and OSHA 30 for 2.
  - 8 rows carry name-match notes, where SiteDocs spells a name differently from HR.
- **Use in the platform:** The main source of certification records today. Name mismatches show why every system needs a shared employee ID.

#### 6. OSHA Certification Tracker (Current)
- **Source:** Jeff Allen, OneDrive share, Oct 26. Last changed Nov 2.
- **Contents:** 15 tabs: a summary, an employee tab, 12 certification tabs (OSHA 30/10/510, NFPA 70E, CPR/AED/First Aid, RT Forklift, Mini Excavator, Skid Steer, Boom Lift, Scissor Lift, MEWP Awareness, Excavation Competent Person), and a *Needs Certificate* tab. Renewal dates and statuses are calculated by formulas. Notes on the summary tab explain the regulation behind each renewal interval.
- **What it shows:** 330 records in total.
  - 128 have a certificate document on file.
  - **107 come from an HR roster only, with no document behind them.**
  - **21 are past due or expired.**
  - 5 are due within 90 days.
  - **68 are still waiting on a DOL card.** DOL cards are the official OSHA Outreach wallet cards issued through the Department of Labor.
  - It also splits counts by jobsite and by company (Adams / TechSource).
- **Use in the platform:** This is the best-structured certification model in the inbox. Its tab layout and renewal rules should become the platform's certification rules, replacing the spreadsheet.

#### 7. Certificate renewal periods
- **Source:** Betty Jean Cardwell, Nov 13.
- **Contents:** 70E 3 years, OSHA 510 5 years, OSHA 10 3 years, OSHA 30 5 years, CPR 2 years, Awareness 1 year, Competent Person 3 years.
- **Conflicts with dataset #6:**

  | Certification | Betty Jean | Jeff's tracker |
  |---|---|---|
  | OSHA 10 | **3 years** | **5 years** (60 months) |
  | OSHA 510 | **5 years** | **No expiry** |
  | All others | Same in both | Same in both |

- **Action:** Jeff and Betty Jean should agree on one rule per certification before the platform calculates due dates. Sites with stricter general-contractor rules can be handled as exceptions per site.

#### 8. JJ Keller awareness training (Certificates.pdf)
- **Source:** Jeff Allen, Nov 2, sent to 22 staff with the first module (fire extinguisher awareness). Jeff plans a new module about every two weeks.
- **Contents:** A PDF of completion certificates. The recipient list doubles as the awareness-training roster.
- **Limitation:** The JJ Keller API cannot return completions or expiry dates. The interim plan is a scheduled report export from JJ Keller imported into the platform.

#### 9. Toolbox Talk Topics
- **Source:** Betty Jean Cardwell, OneDrive share, Nov 13: "can we add this to the information?"
- **Contents:** A list of toolbox talk topics. The search tool could not open it.
- **Use in the platform:** Feeds the Safety Calendar and the learning system. Safety Bulletin SB-2026-01 (UV flash burn, Nov 19) is already scheduled for the December toolbox talks in SiteDocs, which is an example of a topic that should land on the calendar automatically.

### Jobsites

#### 10. Site addresses
- **Source:** Betty Jean, forwarded by Jeff, Nov 2.
- **Contents:** Six sites with street addresses: CLT 105 (Hamlet), CLT04 (Conover), AVC 43/44 (South Hill), AVC09/10 (La Crosse), DLR CLT13 (Charlotte), QTS CLT1 DC4 (York).
- **Data quality:** QTS has a second address in dataset #11. CLT 100 and AVC 44 have no address listed.
- **Use in the platform:** The jobsite map Jeff asked for on Nov 2.

#### 11. Site job numbers, cost codes, and SiteDocs title format
- **Source:** Betty Jean Cardwell, Nov 13.
- **Contents:** Job numbers per site: AVC09 MC5005, CLT 100 MC5010, CLT04 MC5015, CLT 105 MC5020, QTS CLT1 MC5050, AVC 044 MC5055, DLR CLT13 MC5060, and AVC 043 RA 3500.1. Each has a cost code (usually 1-10-906). The email also gives the SiteDocs job-title format `AEC - MC - <Role>` / `TS - RDU - <Role>`.
- **Use in the platform:** The **site master list.** The MC job number should be the official site ID that every other dataset points to.

#### 12. Site orientation requirements
- **Sources:**
  - Go Contractor 1 (Betty Jean, Nov 13): required onboarding for CLT04.
  - AWS CLT Hamlet / Walbridge orientation flyer (Betty Jean, Nov 13): CLT 100/105.
  - QTS CLT1 DC4 HammerTech orientation emails (Jeff, Oct 19; Betty Jean, Nov 13).
  - DLR CLT13 HammerTech orientation (Jeff, Oct 19).
- **Use in the platform:** A *site requirements* record. Assigning a person to a site should automatically create the orientation tasks that site requires.

### Order Tracking

#### 13. Order log (Kojo Orders – Copy)
- **Source:** Betty Jean Cardwell, Oct 15.
- **Contents:** 2 orders from Nefco (PPE and site supplies for CLT100 and AVC09). Columns: Date, Site, From, Ordered (several items in one cell), Accepted, Received (checkboxes).
- **What Betty Jean said she needs:** item, quantity, date ordered, destination site, vendor, and "maybe more." The previous spreadsheet failed because it was too tedious to enter by hand.
- **Use in the platform:** A starting design for *My Orders*. Each item needs its own line with a quantity, plus a requester, a cost, and a received date.

---

## 3. Data the platform still needs

| Gap | Needed for | Suggested source and owner |
|---|---|---|
| Vehicle list with registration, inspection, and insurance expiry dates | Vehicle Inspection module | Fleet or office manager; the new-hire tracker already lists who has a company vehicle or gas card |
| JJ Keller completions and expiry dates | Awareness training tracking | Jeff: monthly JJ Keller report export until the API supports it |
| Safety Calendar and Master Calendar events | Both calendars | Jeff / Betty Jean: toolbox talk schedule, site orientations, training sessions |
| Hardware assets | My Assets | JamF and NinjaOne APIs, already connected (per the Nov 8 update); no spreadsheet needed |

---

## 4. Keeping the data current

### 4.1 One system of record per data type

| Data | System of record | Platform's role |
|---|---|---|
| Employee identity, hire date, title, contact details | HR (Arcoro / CoreHR) | Reads it daily or weekly; never edited by hand in the platform |
| Contractor (TechSource) workers | Platform | Owns these records; the Safety Admin keeps them up to date |
| Certifications and documents | Platform, fed by SiteDocs and JJ Keller | Takes in certificate uploads and holds the renewal rules |
| Sites, job numbers, orientation requirements | Platform site master | Owned by the Safety Admin; checked when each project starts |
| Onboarding status | Platform onboarding workflow | Replaces the new-hire spreadsheet |
| Orders | Platform order log | Replaces the order spreadsheet |
| Devices | JamF / NinjaOne | Platform reads them |

**Shared keys.** Every record should carry an **EE CODE** (for employees), a **Contractor ID** (for TechSource workers), and an **MC job number** (for sites). The SiteDocs name-match problems in dataset #5 show why names alone are not enough to link records.

### 4.2 Refresh cadence and owners

| Dataset | How it refreshes | Cadence | Owner |
|---|---|---|---|
| Employee list | HR export or API sync, matched on EE CODE | Weekly, plus whenever someone is hired or leaves | Brittany (HR) / Brian (integration) |
| Contractor rosters | Site superintendent confirms on a short form | Every 2 weeks per site | Site Superintendent → Betty Jean |
| SiteDocs certifications | Scheduled export → automatic import | Weekly | Betty Jean |
| JJ Keller completions | Report export → import | After each module goes out (about every 2 weeks) | Jeff |
| Renewal rules | Change-controlled settings in the platform | Reviewed every year, or when a GC requires a change | Jeff (approver) |
| Site master and orientation requirements | Updated at each project start and close-out | When an event happens | Betty Jean |
| Onboarding workflow | Live, one step at a time | Daily | The owner named on each step |
| Orders | Live, entered when ordering | Daily | Requester / Betty Jean |
| Vehicles | Fleet list import, then live | Monthly check | Fleet owner |

### 4.3 Data-quality rules to enforce at import

- **Dates** are converted from Excel serial numbers to real dates. Hire dates in the future or before 1990 are flagged.
- **Email:** an Adams address is required for employees. Personal addresses go only into a separate "personal contact" field.
- **Site names** must match the site master. Variants such as "CLT100**" and "AVC-43" are converted automatically or rejected.
- **Status fields** use a fixed set of values instead of free text. For example: OSHA card = Has / Needs / Ordered / Received; GC orientation = Not sent / Sent / Complete / N/A.
- **Text encoding:** files are imported as UTF-8 so accented names display correctly.
- **Duplicate check** on EE CODE and on name plus date of birth. Possible matches go to a review queue instead of being merged silently.

---

## 5. Processes that turn data into staff action

The goal is that **no one has to open a spreadsheet to find out what to do.**

### 5.1 Certification expiry ladder
Each certification moves through statuses based on the agreed renewal rules:

| Days to expiry | Status | Automatic action |
|---|---|---|
| 90 | Due soon | Notify the employee and their supervisor; suggest the class |
| 60 | Due soon | Create a task for the Safety Admin to schedule training |
| 30 | At risk | Escalate to the Safety Director; show it on the site dashboard |
| 0 | Expired | Hardhat QR code turns red; the person is flagged on the site roster for the GC |

The **59 people with no certifications** and the **107 records with no document** start with a one-time clean-up task. Each person gets a "Upload your cards" request, sent through the platform with a phone-photo upload.

### 5.2 Onboarding checklist
- A new hire record in HR creates an onboarding case in the platform. Each tracker column becomes a step with an owner: HR (offer, Arcoro, E-Verify), Tangie (CoreHR, Spectrum, payroll email), Brittany (Employee Navigator), Safety (OSHA card, GC orientation), IT (devices), Fleet (vehicle).
- Each step has a due date relative to the start date. Steps still open after their due date show up in a daily digest for each owner.
- The **jobsite** chosen on the case pulls in that site's orientation requirements (dataset #12) and creates those tasks automatically.

### 5.3 Site assignment and orientation
- Moving a person to a new site checks that site's requirements: orientation, required certifications, and any special training. The superintendent sees a "ready to badge" or "not ready" status before the person arrives.
- Starting a project adds the site to the map, the calendars, and the dashboards from a single site-master entry.

### 5.4 Awareness training cycle
- Each JJ Keller module is entered in the platform with a due date and a list of assigned people.
- A reminder goes out 7 days and 2 days before the due date. Anyone not finished after the due date shows up on the supervisor's digest.
- When the JJ Keller export is imported, assignments close automatically and a 1-year renewal is set.

### 5.5 Safety bulletins and toolbox talks
- A bulletin such as SB-2026-01 becomes a toolbox talk on the Safety Calendar, assigned to each foreman's site.
- Foremen confirm the crew review in the platform instead of returning a paper form, so completion by site can be seen.

### 5.6 Orders
- Orders are logged one item per line with quantity, vendor, site, and requester. The requester is notified when the order is accepted and when it is received.
- Orders not received within an expected number of days are flagged to Betty Jean.

### 5.7 Weekly rhythm

| When | Who | What |
|---|---|---|
| Monday | Safety Admin | Review the data-quality queue (duplicates, missing documents, failed imports) |
| Monday | Site Superintendents | Confirm contractor rosters |
| Weekly | Safety Director | Dashboard: expired / due-soon by site, onboarding steps past due, training completion |
| Monthly | Jeff, Betty Jean, Brittany, Brian | Data review: renewal rules, new sites, integration issues |

---

## 6. Data protection

- The HR list and onboarding tracker contain **personal phone numbers, home email addresses, and onboarding results** (background checks, drug screens, driving records). Access in the platform should be **role-based**: HR and Safety leadership see everything; supervisors see only their own crew's training status; employees see only their own record.
- Do not send these files through Telegram or other outside chat tools. Leigh Pfeiffer raised this concern in the Nov 20 meeting.
- Login details for SiteDocs and JJ Keller, and a Claude API key, have been sent in plain email. These should be **changed** and kept in the platform's secret store or a password manager.
- Keep a record of who changed which certification or status, and when, for audits.

---

## 7. Recommended next steps

1. **Agree on renewal rules.** Jeff and Betty Jean settle the OSHA 10 and OSHA 510 differences (section 2, #7).
2. **Build the employee master.** Merge HR list #1, Betty Jean's list #2, and the CLT 105 contractor roster #3 on EE CODE, and switch employees to Adams email addresses.
3. **Load the site master.** Import sites #10 and #11 keyed on MC job number, and attach the orientation requirements from #12.
4. **Load certifications.** Import tracker #6 as the starting point, add SiteDocs #5 records that it doesn't have, and send upload requests to the people with gaps.
5. **Turn on the expiry ladder and daily digests** (5.1).
6. **Move onboarding into the platform** (5.2), starting with the open November hires.
7. **Request the missing data:** the vehicle list, the JJ Keller export schedule, and calendar events.
8. **Change the passwords and key** that were sent by email.
