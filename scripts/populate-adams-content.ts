/**
 * Populate Adams Academy Course Content
 * Run with: npx tsx scripts/populate-adams-content.ts
 */

import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, updateDoc, doc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "adams-platform",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Lesson content mapping
const LESSON_CONTENT: Record<string, { description: string; textContent: string }> = {
  "Welcome to Adams Academy": {
    description: "An overview of the Adams Electric approach to project delivery and what you'll learn in this course.",
    textContent: `# Welcome to Adams Academy

## Building Skills for Better Project Delivery

Welcome to Adams Academy—Adams Electric's training program for the people who plan, coordinate, and build electrical projects across the Southeast.

### What You'll Learn

This course covers the full lifecycle of electrical project delivery:

- **Safety Leadership** - Daily planning and hazard awareness
- **Preconstruction Planning** - Estimating, budgeting, and constructability review
- **BIM & Prefabrication** - Digital coordination and offsite fabrication
- **Field Leadership & Workforce** - Developing the leaders who run our jobsites
- **Project Closeout & Turnover** - Documentation and commissioning support

### How to Use This Course

Work through each module in order. Every module ends with a short quiz, and the course concludes with a certification assessment.

Let's get started.`
  },
  "Build Trust Through Performance": {
    description: "The mission and principles that guide every Adams Electric project.",
    textContent: `# Build Trust Through Performance

## Our Mission

Adams Electric was founded in 1928 and remains family owned three generations later. Our mission—Build Trust Through Performance—means we earn confidence the same way on every project: by doing what we said we'd do.

### What Performance Looks Like

- Safe jobsites where everyone goes home healthy
- Budgets and schedules that hold
- Coordination that prevents rework before it starts
- Clean closeouts and support after turnover

### Why It Matters to You

Every team member contributes to that trust. Whether you're in the field, the shop, or the office, the standards in this course exist so every project reflects the same level of care.`
  },
  "Assessing Your Current Practices": {
    description: "A self-assessment to baseline your current approach to planning, coordination, and field execution.",
    textContent: `# Assessing Your Current Practices

## Establish Your Baseline

Before building new skills, take stock of how your projects run today.

### Reflection Questions

1. Does every project start with a documented preconstruction plan covering budget, schedule, and scope?
2. Are coordination conflicts resolved in the model—or discovered in the field?
3. Do closeout documents get assembled during the project, or reconstructed at the end?
4. Can field leaders make day-to-day decisions without escalating everything?
5. Is safety planning part of the daily workflow, or a separate checkbox?

### Next Steps

Note your weakest areas. Those are where this course will pay off the most.`
  },
  "Module 1 Quiz": {
    description: "Test your understanding of Adams Academy fundamentals.",
    textContent: `# Module 1 Quiz: Course Foundations

**Passing Score: 70% | Time Limit: 15 minutes**

---

### Question 1
What are the five core areas covered in this course?

A) Sales, Marketing, Finance, HR, Legal
B) Safety, Preconstruction, BIM & Prefabrication, Field Leadership, Closeout ✓
C) Estimating, Purchasing, Scheduling, Billing, Payroll
D) Design, Permitting, Inspection, Warranty, Service

---

### Question 2
True or False: Adams Electric was founded in 1928 and is third-generation family owned.

A) True ✓
B) False

---

### Question 3
What does "Build Trust Through Performance" emphasize?

A) Marketing promises
B) Doing what we said we'd do, on every project ✓
C) Lowest possible bid
D) Working faster than competitors

---

### Question 4
When should closeout documentation be assembled?

A) At the end of the project
B) Throughout the project, starting at kickoff ✓
C) Only when the owner requests it
D) After commissioning

---

### Question 5
Who contributes to building trust through performance?

A) Project managers only
B) Field crews only
C) Every team member in field, shop, and office ✓
D) Leadership only`
  },
  "Pre-Task Planning Fundamentals": {
    description: "How daily pre-task planning prevents injuries and keeps work predictable.",
    textContent: `# Pre-Task Planning Fundamentals

## Plan the Work Before You Work the Plan

Pre-task planning is the daily habit that turns safety from a slogan into a practice. Before any task begins, the crew pauses to think through how the work will actually happen.

### What a Good Pre-Task Plan Covers

1. **Scope** - What exactly are we doing today?
2. **Hazards** - What could hurt us? Overhead work, energized systems, lifts, congested areas?
3. **Controls** - What eliminates or reduces each hazard?
4. **Resources** - Tools, materials, and people needed
5. **Stop-Work** - What conditions mean we stop and reassess?

### Making It Stick

- Keep it short and specific to today's tasks
- Everyone on the crew participates
- Revisit it when conditions change
- Document it—if it isn't written, it isn't a plan`
  },
  "Hazard Recognition & Reporting": {
    description: "Recognizing common electrical construction hazards and building a strong reporting culture.",
    textContent: `# Hazard Recognition & Reporting

## See It, Say It, Fix It

Most incidents are preceded by recognizable warning signs. Training your eye to spot them—and making it easy to report them—prevents injuries before they happen.

### Common Electrical Construction Hazards

- Energized equipment and incomplete lockout/tagout
- Overhead work and dropped objects
- Ladders, lifts, and elevated work
- Congested work areas and poor housekeeping
- Rushing to meet schedule pressure

### Building a Reporting Culture

A strong reporting culture treats every observation as a gift, not a complaint:

- Near-misses get reported and learned from
- No one is punished for raising a concern
- Issues get closed out visibly so reporting keeps happening
- Leadership responds quickly—nothing kills reporting like silence`
  },
  "Safety Communication on the Jobsite": {
    description: "Effective toolbox talks, handoffs, and escalation for safety-critical information.",
    textContent: `# Safety Communication on the Jobsite

## Information That Protects People

Safety communication isn't paperwork—it's how crews know what changed, what's energized, and who's working overhead.

### Key Communication Practices

- **Daily huddles** - Align on tasks, hazards, and handoffs before work starts
- **Shift and area handoffs** - Document what's complete, what's live, and what's pending
- **Signage and labeling** - Energized panels, open panels, and restricted areas marked clearly
- **Escalation paths** - Everyone knows who to call when something isn't right

### The Test

If a new crew member walked onto your site today, could they tell what's safe to touch and what isn't? If not, communication has a gap.`
  },
  "Leading Safety as a Foreman": {
    description: "How frontline leaders set the tone for jobsite safety culture.",
    textContent: `# Leading Safety as a Foreman

## Safety Leadership Happens at the Crew Level

Safety culture is set by what foremen model, not by what posters say. The crew takes its cues from the person running the work.

### What Safety Leadership Looks Like

- Start every day with a real pre-task plan, not a signature
- Stop work when conditions aren't right—and back up crew members who do the same
- Coach in the moment: correct unsafe practices privately and immediately
- Recognize good catches publicly
- Never let schedule pressure override a safe method

### The Standard

Your crew should be able to say: "My foreman cares more about how the work gets done than how fast it gets done."`
  },
  "Module 2 Quiz": {
    description: "Test your knowledge of jobsite safety practices.",
    textContent: `# Module 2 Quiz: Safety Leadership

**Passing Score: 70% | Time Limit: 15 minutes**

---

### Question 1
What are the five elements of a good pre-task plan?

A) Tools, budget, schedule, permits, weather
B) Scope, hazards, controls, resources, stop-work conditions ✓
C) Crew size, shift length, break times, overtime, attendance
D) Drawings, specs, submittals, RFIs, change orders

---

### Question 2
True or False: Near-misses should be reported and learned from.

A) True ✓
B) False

---

### Question 3
What kills a reporting culture fastest?

A) Too many reports
B) Leadership silence or punishment for raising concerns ✓
C) Daily huddles
D) Safety signage

---

### Question 4
Who sets the safety tone on a crew?

A) The safety director
B) The project manager
C) The foreman running the work ✓
D) The owner

---

### Question 5
When should a pre-task plan be revisited?

A) Only at the start of the week
B) When conditions change ✓
C) At project closeout
D) Never—once written it's final`
  },
  "Reading Scope & Building Accurate Budgets": {
    description: "Translating drawings and specifications into budgets that reflect real installation conditions.",
    textContent: `# Reading Scope & Building Accurate Budgets

## Know What You're Actually Building

Accurate budgets start with accurate scope. That means reading drawings and specs for what's really there—not what a square-foot allowance assumes.

### Scope Review Essentials

- Read the electrical drawings AND the spec sections that govern them
- Note equipment with long lead times or special requirements
- Identify site conditions: access, working hours, existing systems, phased turnover
- List assumptions and exclusions explicitly—ambiguity becomes disputes later

### Budget Discipline

- Break labor into tasks crews can actually plan against
- Price materials with current quotes for volatile commodities
- Carry realistic general conditions—supervision, layout, lifts, cleanup
- Document the basis of estimate so future changes are measurable`
  },
  "Constructability Reviews": {
    description: "Reviewing design for how work will actually be installed, before field crews inherit the problems.",
    textContent: `# Constructability Reviews

## Solve Problems on Paper, Not with a Bender

A constructability review asks one question: can this design actually be installed, maintained, and inspected the way it's drawn?

### What to Look For

- Physical fit: can conduit, panels, and gear fit in the allocated space with code clearances?
- Access: can equipment be delivered, set, and later serviced?
- Sequencing: does the design require work in an order the schedule can't support?
- Maintainability: can future operators reach breakers, valves, and junction points?

### Delivering Review Feedback

- Raise issues early, in writing, with suggested alternatives
- Quantify impact—cost, schedule, and serviceability
- Track every item to resolution before rough-in begins`
  },
  "Long-Lead Procurement Planning": {
    description: "Identifying and tracking long-lead electrical equipment so material never drives the schedule.",
    textContent: `# Long-Lead Procurement Planning

## Material Lead Times Are Schedule Risks

Switchgear, generators, transformers, and lighting controls can carry lead times measured in months. If they aren't identified at kickoff, they become the critical path.

### The Long-Lead Process

1. **Identify** - Flag every item with a lead time exceeding the field need date
2. **Release** - Get submittals approved and orders placed early
3. **Track** - Maintain a visible procurement log reviewed in every OAC meeting
4. **Verify** - Confirm ship dates, not just order dates
5. **Plan B** - Have alternates evaluated before they're needed

### Rule of Thumb

If a piece of equipment failing to arrive would idle a crew, it belongs on the long-lead list.`
  },
  "Module 3 Quiz": {
    description: "Test your understanding of preconstruction planning.",
    textContent: `# Module 3 Quiz: Preconstruction Planning

**Passing Score: 70% | Time Limit: 15 minutes**

---

### Question 1
What is the purpose of a constructability review?

A) To approve invoices
B) To verify the design can actually be installed, maintained, and inspected ✓
C) To select the project team
D) To create marketing materials

---

### Question 2
Which items belong on a long-lead procurement list?

A) Wire nuts and tape
B) Switchgear, generators, and specialty lighting controls ✓
C) Items already in the warehouse
D) Only items over $10,000

---

### Question 3
Why document assumptions and exclusions in an estimate?

A) To make the document longer
B) Ambiguity becomes disputes later; clear assumptions prevent them ✓
C) It's a contract requirement only
D) No reason—it's optional

---

### Question 4
What should be tracked in a procurement log?

A) Only purchase order numbers
B) Approval status, order dates, and confirmed ship dates ✓
C) Nothing—vendors handle it
D) Only items already delivered

---

### Question 5
When is the cheapest time to resolve a design conflict?

A) During rough-in
B) During trim-out
C) Before field work begins ✓
D) After the inspector flags it`
  },
  "Clash Detection & Coordination Workflows": {
    description: "How 3D coordination resolves conflicts between trades before installation.",
    textContent: `# Clash Detection & Coordination Workflows

## Resolve Conflicts in the Model, Not the Ceiling

BIM coordination brings trades together in a shared 3D model so conflicts are found and fixed before anyone installs anything.

### The Coordination Workflow

1. **Model** - Each trade models its systems to installation level of detail
2. **Clash detection** - Automated checks find conflicts between systems
3. **Coordination meetings** - Trades resolve clashes together, with clear sign-off
4. **Field release** - Coordinated drawings go to the field for installation

### What Good Coordination Produces

- Installations that fit the first time
- Serviceable systems future technicians can actually reach
- Prefabrication-ready dimensions
- Fewer RFIs, change orders, and rework hours`
  },
  "Designing for Prefabrication": {
    description: "Identifying assemblies that can be built offsite and designing them for repeatable fabrication.",
    textContent: `# Designing for Prefabrication

## Build in the Shop, Install in the Field

Prefabrication moves work from the jobsite into a controlled shop environment—improving quality, safety, and schedule.

### Good Prefabrication Candidates

- Repeatable rooms: patient rooms, restrooms, closets, corridors
- Standardized assemblies: in-wall rough-in kits, racks, skids
- Congested areas where field work is slow or hazardous
- Multi-trade racks coordinated in the model

### Making Prefab Work

- Involve prefab planning during coordination, not after
- Standardize dimensions and connection points
- Design for transport: size, weight, and lifting points
- Plan logistics: labeling, kitting, and delivery sequence match the schedule`
  },
  "Kitting & Jobsite Logistics": {
    description: "Delivering materials and assemblies to the field in the sequence crews need them.",
    textContent: `# Kitting & Jobsite Logistics

## Right Materials, Right Place, Right Time

Kitting packages everything a crew needs for a task into a single labeled delivery—eliminating trips to the gang box and time spent hunting for parts.

### What Goes in a Kit

- All materials for a specific area or task
- Drawings or details for that work
- Hardware, supports, and consumables
- Clear labeling: project, area, sequence

### Logistics Discipline

- Sequence deliveries to match the installation schedule
- Protect kitted material from weather and damage
- Track what's been delivered and what's been installed
- Capture feedback: what was missing, what was extra`
  },
  "Module 4 Quiz": {
    description: "Test your knowledge of BIM coordination and prefabrication.",
    textContent: `# Module 4 Quiz: BIM & Prefabrication

**Passing Score: 70% | Time Limit: 15 minutes**

---

### Question 1
Where should coordination conflicts be resolved?

A) In the field during installation
B) In the model during coordination meetings ✓
C) During punch list
D) By the inspector

---

### Question 2
Which areas are good prefabrication candidates?

A) One-time, unique conditions
B) Repeatable rooms and standardized assemblies ✓
C) Work with no drawings
D) Tasks with no measurements

---

### Question 3
What does effective kitting eliminate?

A) The need for drawings
B) Trips to the gang box and time hunting for parts ✓
C) The need for skilled labor
D) Safety planning

---

### Question 4
When should prefabrication planning happen?

A) After rough-in is complete
B) During coordination ✓
C) At project closeout
D) Only on large projects

---

### Question 5
What does good coordination produce?

A) More RFIs
B) Installations that fit the first time and are serviceable ✓
C) Longer schedules
D) More change orders`
  },
  "From Foreman to Field Leader": {
    description: "The mindset and skill shift from doing the work to leading the people who do it.",
    textContent: `# From Foreman to Field Leader

## Leading People Is a Different Job Than Doing Work

The skills that made someone a great electrician aren't the same ones that make a great field leader. The shift from foreman to leader means getting results through the crew instead of through your own hands.

### The Mindset Shift

- From solving problems yourself → teaching the crew to solve them
- From managing tasks → building people
- From being indispensable → making the crew capable without you

### Core Practices of Field Leaders

- Communicate the why, not just the what
- Set clear expectations for each task
- Coach in the moment, correct in private
- Plan tomorrow today—never let the crew wait on answers`
  },
  "Mentoring & Developing Your Crew": {
    description: "Building crew capability through deliberate mentorship and skill progression.",
    textContent: `# Mentoring & Developing Your Crew

## The Next Generation Is Built One Person at a Time

Workforce development isn't a program—it's what happens when experienced people deliberately teach the people coming up behind them.

### Effective Mentoring Practices

- Pair newer workers with experienced hands on real tasks
- Explain decisions, don't just make them
- Give stretch assignments with a safety net
- Give feedback that's specific and timely
- Ask questions that teach: "What would you check first?"

### Why It Matters

Every project needs leaders the crew hasn't met yet. Teaching someone to solve a problem takes longer than solving it yourself—but it's the only way the team grows.`
  },
  "Look-Ahead Planning for Field Teams": {
    description: "Weekly look-ahead routines that keep crews productive and remove blockers early.",
    textContent: `# Look-Ahead Planning for Field Teams

## See the Work Before the Crew Does

A look-ahead plan turns the master schedule into a week-by-week field plan—surfacing constraints early enough to fix them.

### The Weekly Look-Ahead Process

1. Review the next 2-4 weeks of scheduled work
2. For each task, confirm: drawings, materials, access, manpower, prerequisites
3. Flag constraints and assign owners to clear them
4. Communicate the plan to the crew daily

### Making Work Ready

A task is only "ready" when everything needed to execute it exists. Pulling a task forward that isn't ready wastes more time than it saves.`
  },
  "Module 5 Quiz": {
    description: "Test your understanding of field leadership and workforce development.",
    textContent: `# Module 5 Quiz: Field Leadership & Workforce

**Passing Score: 70% | Time Limit: 15 minutes**

---

### Question 1
What's the core shift from foreman to field leader?

A) Working faster
B) Getting results through the crew instead of your own hands ✓
C) Doing all the hardest tasks yourself
D) Delegating paperwork only

---

### Question 2
What makes a task "ready" in look-ahead planning?

A) It's on the schedule
B) Everything needed to execute it exists ✓
C) The crew is available
D) The drawings were issued

---

### Question 3
Effective mentoring includes:

A) Making decisions without explaining them
B) Asking questions that teach, like "What would you check first?" ✓
C) Doing the work yourself to save time
D) Only correcting mistakes at annual reviews

---

### Question 4
Why does teaching a crew member to solve a problem matter more than solving it yourself?

A) It doesn't—speed matters most
B) It's the only way the team's capacity grows ✓
C) It reduces your workload immediately
D) It looks good on reviews

---

### Question 5
When should constraints in the look-ahead be flagged?

A) The day the task starts
B) Early enough to clear them before the task ✓
C) At the end of the week
D) Never—crews figure it out`
  },
  "As-Builts & O&M Documentation": {
    description: "Producing accurate record documents and operation manuals that owners actually use.",
    textContent: `# As-Builts & O&M Documentation

## Documentation Is Part of the Product

Owners judge the project long after crews leave—by whether the documentation tells them what was actually built and how to operate it.

### As-Built Practices

- Mark up drawings during installation, not after
- Record actual routing, dimensions, and deviations from design
- Capture underground and concealed work before it's covered

### O&M Documentation

- Organized by system, not by trade package
- Include manufacturer data, settings, and maintenance requirements
- Deliver in a format the facility team can actually search and use`
  },
  "Punch List Management": {
    description: "Managing deficiencies continuously so the final punch list stays short.",
    textContent: `# Punch List Management

## A Punch List That Grows to the End Is a Schedule Risk

The final punch list should be short because problems were found and fixed throughout the project—not discovered all at once at the end.

### Continuous Quality Practices

- Inspect work-in-place continuously, not just at milestones
- Log deficiencies immediately with location, owner, and due date
- Fix as you go—open items compound
- Pre-punch areas before the official inspection

### The Standard

Walk each area before the owner's team does. Finding your own issues first is cheaper than having them found for you.`
  },
  "Commissioning Support": {
    description: "Supporting systems testing and commissioning through final turnover.",
    textContent: `# Commissioning Support

## Prove the Systems Work—Then Prove It Again

Commissioning verifies that installed systems operate the way they were designed to. Electrical support during commissioning is where design intent meets reality.

### Supporting Commissioning

- Pre-functional checks completed before the commissioning agent arrives
- Test documentation organized and accessible
- Deficiencies corrected quickly with verification evidence
- Training sessions recorded and documented for the owner

### Turnover Mindset

The goal isn't just passing tests—it's handing over a building the owner can operate with confidence.`
  },
  "Module 6 Quiz": {
    description: "Test your knowledge of closeout, documentation, and turnover.",
    textContent: `# Module 6 Quiz: Project Closeout & Turnover

**Passing Score: 70% | Time Limit: 15 minutes**

---

### Question 1
When should as-built markups be recorded?

A) At project end
B) During installation, before work is concealed ✓
C) Only when the owner requests them
D) After warranty expires

---

### Question 2
What does a growing punch list at project end indicate?

A) A thorough final inspection
B) Deficiencies weren't found and fixed continuously ✓
C) Good quality control
D) A fast project

---

### Question 3
How should O&M documentation be organized?

A) By purchase order
B) By system, searchable by the facility team ✓
C) Alphabetically by subcontractor
D) In boxes left at the jobsite

---

### Question 4
What should happen before the commissioning agent arrives?

A) Nothing—commissioning finds everything
B) Pre-functional checks completed and documented ✓
C) All power disconnected
D) Punch list items deferred

---

### Question 5
What is the goal of project turnover?

A) Getting final payment
B) Handing over a building the owner can operate with confidence ✓
C) Closing out subcontracts
D) Completing the warranty period`
  },
  "Course Review & Key Takeaways": {
    description: "A summary of the Adams Academy project delivery fundamentals.",
    textContent: `# Course Review & Key Takeaways

## What You've Learned

**Safety Leadership** - Pre-task planning, hazard recognition, and a reporting culture protect every crew member, every day.

**Preconstruction Planning** - Accurate budgets, constructability reviews, and long-lead procurement set projects up before mobilization.

**BIM & Prefabrication** - Resolve conflicts in the model, build assemblies in the shop, and deliver to the field in sequence.

**Field Leadership** - Develop the people who run the work; teaching beats doing.

**Closeout & Turnover** - Plan documentation from kickoff, manage punch continuously, and hand over a building the owner can operate.

### The Thread That Connects It All

Build Trust Through Performance. Every practice in this course exists to make commitments real—for owners, for project partners, and for each other.`
  },
  "Final Exam: Adams Academy Certification": {
    description: "Comprehensive exam covering all Adams Academy modules.",
    textContent: `# Final Exam: Adams Academy Certification

**Passing Score: 80% | Time Limit: 45 minutes | 25 Questions**

This comprehensive exam tests your mastery of all five Adams Academy modules. You must score 80% or higher to earn your certification.

---

## Section 1: Safety Leadership (5 Questions)

### Q1. A good pre-task plan covers:
B) Scope, hazards, controls, resources, stop-work conditions ✓

### Q2. Near-misses should be:
A) Reported and learned from ✓

### Q3. What kills a reporting culture fastest?
C) Leadership silence or punishment ✓

### Q4. Safety tone on a crew is set by:
B) The foreman running the work ✓

### Q5. Pre-task plans should be revisited when:
D) Conditions change ✓

---

## Section 2: Preconstruction Planning (5 Questions)

### Q6. A constructability review verifies:
B) The design can actually be installed, maintained, and inspected ✓

### Q7. Long-lead items include:
C) Switchgear, generators, specialty lighting controls ✓

### Q8. Assumptions and exclusions are documented because:
A) Ambiguity becomes disputes later ✓

### Q9. A procurement log tracks:
D) Approval status, order dates, confirmed ship dates ✓

### Q10. The cheapest time to resolve a design conflict is:
B) Before field work begins ✓

---

## Section 3: BIM & Prefabrication (5 Questions)

### Q11. Coordination conflicts should be resolved:
C) In the model during coordination meetings ✓

### Q12. Good prefabrication candidates are:
A) Repeatable rooms and standardized assemblies ✓

### Q13. Kitting eliminates:
D) Trips to the gang box and time hunting for parts ✓

### Q14. Prefabrication planning happens:
B) During coordination ✓

### Q15. Good coordination produces:
C) Installations that fit the first time and are serviceable ✓

---

## Section 4: Field Leadership & Workforce (5 Questions)

### Q16. The foreman-to-leader shift means:
B) Getting results through the crew ✓

### Q17. A task is "ready" when:
D) Everything needed to execute it exists ✓

### Q18. Effective mentoring includes:
A) Questions that teach, like "What would you check first?" ✓

### Q19. Teaching beats doing because:
C) It's the only way team capacity grows ✓

### Q20. Look-ahead constraints should be flagged:
B) Early enough to clear them ✓

---

## Section 5: Closeout & Turnover (5 Questions)

### Q21. As-built markups are recorded:
B) During installation, before concealment ✓

### Q22. A growing end-of-project punch list indicates:
C) Deficiencies weren't managed continuously ✓

### Q23. O&M documentation is organized:
A) By system, searchable by the facility team ✓

### Q24. Before commissioning:
D) Pre-functional checks are completed and documented ✓

### Q25. The goal of turnover is:
B) A building the owner can operate with confidence ✓

---

**Congratulations on completing the Adams Academy Certification Exam!**`
  },
  "Your Project Delivery Action Plan": {
    description: "A final assignment to apply what you've learned to your current project.",
    textContent: `# Your Project Delivery Action Plan

## Apply What You've Learned

For your current or next project, complete this action plan:

### 1. Safety
- When is your next pre-task planning huddle, and who leads it?
- What's the one hazard on your site that needs a better control?

### 2. Preconstruction
- What's on your long-lead procurement list, and when must each item be released?
- What scope assumption needs to be documented before it's a dispute?

### 3. Coordination
- Which area of your project most needs a clash-free sign-off?
- What's the best prefabrication candidate on your project?

### 4. Field Leadership
- Who on your crew is ready for a stretch assignment?
- What decision could you delegate this week?

### 5. Closeout
- What documentation should start being assembled now?
- What's your plan for keeping the punch list short?

---

Bring this plan to your next team meeting and commit to one action this week.`
  },
};

async function populateContent() {
  console.log("📝 Populating Adams Academy Course Content...\n");

  const lessonsRef = collection(db, "lms_lessons");
  const snapshot = await getDocs(lessonsRef);

  let updated = 0;
  for (const docSnap of snapshot.docs) {
    const lesson = docSnap.data();
    const content = LESSON_CONTENT[lesson.title];
    
    if (content) {
      await updateDoc(doc(db, "lms_lessons", docSnap.id), {
        description: content.description,
        textContent: content.textContent,
      });
      console.log(`✅ Updated: ${lesson.title}`);
      updated++;
    }
  }

  console.log(`\n✅ Updated ${updated} lessons with content!`);
}

populateContent().catch(console.error);
