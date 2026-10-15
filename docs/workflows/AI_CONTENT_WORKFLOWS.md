# AI Content Builder Workflows

Complete step-by-step guides for using AI-powered content generation tools.

---

## Table of Contents
- [Generating a Course Syllabus](#generating-a-course-syllabus)
- [Generating Lesson Content](#generating-lesson-content)
- [Creating AI-Generated Quizzes](#creating-ai-generated-quizzes)
- [Creating AI-Generated Exams](#creating-ai-generated-exams)
- [Enhancing Existing Content](#enhancing-existing-content)
- [AI Configuration](#ai-configuration)
- [Best Practices](#best-practices)

---

## Generating a Course Syllabus

Use AI to generate a complete course outline with modules and lessons in minutes.

### Prerequisites
- Course created in Academy
- OpenAI API key configured (or Ollama running locally)
- Clear idea of course topic and target audience

### Steps

#### Step 1: Open Content Builder
1. Go to **Admin → Academy**
2. Find your course (can be empty)
3. Click **Manage Content**

#### Step 2: Access AI Tools
1. Locate the **AI Tools** toolbar (purple gradient bar)
2. Click **Generate Syllabus** button

#### Step 3: Configure Generation Settings

| Field | Description | Example |
|-------|-------------|---------|
| **Course Topic** | Main subject of the course | "ISO 9001 Quality Management Systems" |
| **Target Audience** | Who the course is for | "Manufacturing quality managers and engineers" |
| **Difficulty Level** | Beginner/Intermediate/Advanced | "Intermediate" |
| **Number of Modules** | How many sections (3-10) | 6 |

#### Step 4: Add Learning Outcomes
1. Click **Add Outcome**
2. Enter desired learning outcomes
3. Add 3-5 outcomes for best results

**Example outcomes:**
- "Understand the ISO 9001:2015 standard requirements"
- "Implement a quality management system from scratch"
- "Conduct internal audits effectively"

#### Step 5: Add Context (Optional)
Enter additional context to guide the AI:
- Industry-specific requirements
- Specific topics to cover
- Content to avoid
- Preferred teaching style

**Example:**
```
Focus on practical implementation rather than theory.
Include real-world case studies from automotive manufacturing.
Emphasize documentation requirements.
```

#### Step 6: Generate Syllabus
1. Click **Generate Syllabus** button
2. Wait 10-30 seconds for AI processing
3. Loading indicator shows progress

#### Step 7: Review Generated Content
The preview shows:
- **Course Title** - AI-suggested title
- **Course Description** - Overview paragraph
- **Learning Outcomes** - What students will achieve
- **Prerequisites** - Required prior knowledge
- **Modules** - Expandable list with lessons

#### Step 8: Expand and Review Modules
1. Click on each module to expand
2. Review lesson titles and descriptions
3. Check content types assigned to each lesson

#### Step 9: Apply or Regenerate

**To Apply:**
1. Click **Apply Syllabus** button
2. All modules and lessons are created
3. Toast notification confirms success

**To Regenerate:**
1. Click **Regenerate** button
2. Adjust settings if needed
3. Generate new syllabus

### Result
- All modules created with titles and descriptions
- All lessons created with appropriate content types
- Course structure ready for content addition
- Estimated: 5-10 minutes saved per module

---

## Generating Lesson Content

Generate detailed content for individual lessons including video scripts, articles, and assignments.

### Prerequisites
- Lesson already created with title
- Module context established
- Content type selected

### Steps

#### Step 1: Open Lesson Dialog
1. Go to **Content Builder** for your course
2. Click **+ Add Lesson** or edit existing lesson
3. Enter the **Lesson Title**

#### Step 2: Select Content Type
Choose the appropriate type:
- **Video** - For video script generation
- **Text** - For article/written content
- **Assignment** - For homework instructions

#### Step 3: Access AI Generator
1. Look for the purple **Generate with AI** button
2. Button text changes based on content type:
   - "Generate Video Script with AI"
   - "Generate Article Content with AI"
   - "Generate Assignment with AI"
3. Click the button

#### Step 4: Configure Generation

| Field | Description |
|-------|-------------|
| **Key Points** | Main topics to cover in the lesson |
| **Tone** | Professional, Conversational, Academic |
| **Length** | Short (5 min), Medium (10 min), Long (15+ min) |
| **Include Examples** | Toggle for practical examples |

#### Step 5: Generate Content
1. Click **Generate** button
2. Wait for AI processing (15-45 seconds)
3. Preview appears in dialog

#### Step 6: Review Generated Content

**For Video Scripts:**
```
[INTRO]
Welcome to this lesson on quality management fundamentals...

[VISUAL: Show ISO 9001 diagram]
The ISO 9001 standard consists of ten clauses...

[B-ROLL: Manufacturing floor footage]
Let's see how this applies in a real factory setting...

[KEY POINT]
Remember: Documentation is the backbone of any QMS...

[OUTRO]
In the next lesson, we'll dive deeper into...
```

**For Text Articles:**
- Markdown formatted content
- Headers and subheaders
- Bullet points and numbered lists
- Code blocks if applicable

**For Assignments:**
- Clear instructions
- Deliverables list
- Grading rubric
- Due date suggestions

#### Step 7: Apply Content
1. Click **Apply Content** button
2. Content populates the lesson form
3. Edit as needed
4. Save the lesson

### Video Script Markers
| Marker | Meaning |
|--------|---------|
| `[INTRO]` | Opening segment |
| `[VISUAL: description]` | On-screen graphic needed |
| `[B-ROLL: description]` | Supplementary footage |
| `[KEY POINT]` | Important takeaway |
| `[DEMO]` | Live demonstration |
| `[OUTRO]` | Closing segment |

---

## Creating AI-Generated Quizzes

Generate quiz questions with multiple choice and true/false formats.

### Prerequisites
- Course content defined
- Topic for quiz identified
- Understanding of difficulty requirements

### Steps

#### Step 1: Access Quiz Generator
1. Open **Content Builder** for your course
2. Click **Generate Quiz** in the AI Tools toolbar
3. Quiz Generator dialog opens

#### Step 2: Configure Quiz Settings

| Setting | Options | Recommendation |
|---------|---------|----------------|
| **Topic** | Free text | Be specific (e.g., "Module 2: Process Mapping") |
| **Number of Questions** | 3-20 | 5-10 for lesson quiz, 15-20 for module quiz |
| **Question Types** | Multiple Choice, True/False, Mixed | Mixed for variety |
| **Difficulty** | Easy, Medium, Hard, Mixed | Mixed for assessment |
| **Time Limit** | Minutes | 1-2 minutes per question |
| **Passing Score** | Percentage | 70-80% typical |

#### Step 3: Add Context
Provide additional guidance:
```
Focus on practical application questions.
Include questions about the case study from Lesson 3.
Avoid questions about deprecated processes.
```

#### Step 4: Generate Quiz
1. Click **Generate Quiz**
2. Wait for AI processing
3. Preview shows generated questions

#### Step 5: Review Questions
Each question shows:
- Question text
- Answer options (A, B, C, D)
- Correct answer marked with ✓
- Explanation for the answer
- Difficulty level
- Points value

**Example Question:**
```
Q: What is the primary purpose of a Process FMEA?

A) To document employee training records
B) To identify potential failure modes and their effects ✓
C) To calculate production costs
D) To schedule maintenance activities

Explanation: Process FMEA (Failure Mode and Effects Analysis) 
is specifically designed to identify potential failures in 
manufacturing processes and assess their impact.

Difficulty: Medium | Points: 10
```

#### Step 6: Edit Questions (Optional)
1. Click **Edit** on any question
2. Modify question text, options, or explanation
3. Change correct answer if needed
4. Adjust difficulty/points

#### Step 7: Apply Quiz
1. Click **Apply Quiz** button
2. Quiz content is formatted and added
3. Create a Quiz-type lesson to use it

### Quiz Best Practices
- Mix difficulty levels (40% easy, 40% medium, 20% hard)
- Include explanations for learning
- Avoid trick questions
- Test understanding, not memorization
- Review AI output for accuracy

---

## Creating AI-Generated Exams

Generate comprehensive exams covering multiple modules.

### Prerequisites
- Course has multiple modules with content
- Clear understanding of exam scope
- Exam type determined (midterm, final, certification)

### Steps

#### Step 1: Access Exam Generator
1. Open **Content Builder**
2. Click **Generate Exam** in AI Tools toolbar
3. Note: Button disabled if no modules exist

#### Step 2: Select Exam Type

| Type | Description | Typical Use |
|------|-------------|-------------|
| **Midterm** | Covers first half of course | Mid-course assessment |
| **Final** | Covers entire course | End-of-course assessment |
| **Certification** | Comprehensive with higher standards | Professional certification |

#### Step 3: Configure Exam Settings

| Setting | Description |
|---------|-------------|
| **Total Questions** | Number across all sections (20-100) |
| **Time Limit** | Total exam time in minutes |
| **Passing Score** | Percentage required to pass |
| **Question Distribution** | How questions spread across modules |

#### Step 4: Select Modules to Cover
1. Check/uncheck modules to include
2. Set question weight per module
3. Example: Module 1 (20%), Module 2 (30%), Module 3 (50%)

#### Step 5: Generate Exam
1. Click **Generate Exam**
2. Processing takes 30-60 seconds
3. Preview shows exam structure

#### Step 6: Review Exam Structure

**Exam Preview:**
```
FINAL EXAMINATION
Course: ISO 9001 Implementation

Instructions: Complete all sections. You have 90 minutes.
Passing Score: 75%

SECTION 1: Quality Management Fundamentals (20 points)
- 10 questions covering Module 1 content
- Mix of multiple choice and true/false

SECTION 2: Documentation Requirements (30 points)
- 15 questions covering Module 2 content
- Includes scenario-based questions

SECTION 3: Audit Processes (30 points)
- 15 questions covering Module 3 content
- Practical application focus

SECTION 4: Continuous Improvement (20 points)
- 10 questions covering Module 4 content
- Case study analysis
```

#### Step 7: Review Individual Questions
1. Expand each section
2. Review questions and answers
3. Check for accuracy and relevance
4. Edit as needed

#### Step 8: Apply Exam
1. Click **Apply Exam**
2. Exam content formatted
3. Create Quiz-type lesson for the exam

---

## Enhancing Existing Content

Quickly improve descriptions, lessons, and other text content.

### Steps

#### Step 1: Locate Enhance Button
Look for the **✨ Enhance** button next to:
- Lesson descriptions
- Text content fields
- Module descriptions

#### Step 2: Click Enhance
1. Ensure field has some content
2. Click the **✨ Enhance** button
3. AI processes the content

#### Step 3: Review Enhancement
- Original content is replaced with enhanced version
- Improvements include:
  - Better clarity and flow
  - Professional tone
  - Proper formatting
  - Grammar corrections

#### Step 4: Accept or Undo
- If satisfied, continue editing
- If not, use Ctrl+Z to undo
- Re-enhance with different content

### Enhancement Examples

**Before:**
```
This lesson talks about quality stuff and how to do audits good.
```

**After:**
```
This lesson provides a comprehensive overview of quality management 
principles and demonstrates effective internal audit techniques. 
You'll learn industry-standard methodologies for conducting thorough 
audits that drive continuous improvement.
```

---

## AI Configuration

### OpenAI Setup (Recommended)

#### Step 1: Get API Key
1. Go to [platform.openai.com](https://platform.openai.com)
2. Navigate to API Keys
3. Create new secret key
4. Copy the key (starts with `sk-`)

#### Step 2: Configure in Platform
1. Go to **Portal → Settings**
2. Find **Integrations** section
3. Locate **OpenAI** settings
4. Paste API key
5. Click **Save**

#### Step 3: Verify Connection
1. Click **Test Connection**
2. Should show "Connected" status
3. If error, verify key is correct

### Ollama Setup (Local/Free Alternative)

#### Step 1: Install Ollama
```bash
# macOS/Linux
curl -fsSL https://ollama.com/install.sh | sh

# Windows
# Download from https://ollama.com/download
```

#### Step 2: Pull Model
```bash
ollama pull llama3.1
# or
ollama pull mistral
```

#### Step 3: Configure Platform
1. Set environment variable: `USE_OLLAMA=true`
2. Set `OLLAMA_URL=http://localhost:11434`
3. Restart the application

#### Step 4: Verify
1. Ensure Ollama is running
2. Test AI features in platform
3. Note: Quality may vary from OpenAI

---

## Best Practices

### Content Quality

| Do | Don't |
|----|-------|
| Review all AI output before publishing | Blindly accept AI content |
| Edit for your specific context | Use generic AI content as-is |
| Verify technical accuracy | Assume AI is always correct |
| Maintain consistent tone | Mix different AI-generated styles |

### Prompt Engineering

**Be Specific:**
```
❌ "Create a lesson about quality"
✅ "Create a lesson about implementing Statistical Process Control 
   in automotive manufacturing, targeting quality engineers with 
   3-5 years experience"
```

**Provide Context:**
```
❌ "Generate quiz questions"
✅ "Generate 10 quiz questions for Module 3 covering FMEA methodology,
   focusing on practical application in medical device manufacturing.
   Include 2 easy, 5 medium, and 3 hard questions."
```

**Set Constraints:**
```
❌ "Write content"
✅ "Write a 500-word article explaining the 5 Whys technique.
   Use simple language suitable for beginners.
   Include one real-world example from manufacturing."
```

### Efficiency Tips

1. **Batch Generation**
   - Generate syllabus first
   - Then generate content for multiple lessons
   - Review and edit in batches

2. **Template Approach**
   - Save successful prompts
   - Reuse for similar content
   - Adjust specifics as needed

3. **Iterative Refinement**
   - Generate initial content
   - Enhance specific sections
   - Polish final output manually

### Cost Management (OpenAI)

| Action | Approximate Cost |
|--------|------------------|
| Syllabus generation | $0.05-0.15 |
| Lesson content | $0.02-0.08 |
| Quiz (10 questions) | $0.03-0.06 |
| Exam generation | $0.10-0.25 |
| Content enhancement | $0.01-0.03 |

**Tips to reduce costs:**
- Use Ollama for drafts, OpenAI for finals
- Be specific in prompts (fewer regenerations)
- Review before regenerating
- Batch similar requests

---

## Troubleshooting

### AI Not Responding

| Symptom | Solution |
|---------|----------|
| Spinning forever | Check API key validity |
| Error message | Read error, check configuration |
| Empty response | Try more specific prompt |
| Timeout | Reduce content length requested |

### Poor Quality Output

| Issue | Solution |
|-------|----------|
| Too generic | Add more context to prompt |
| Wrong topic | Be more specific about subject |
| Wrong tone | Specify audience and style |
| Inaccurate info | Verify and edit manually |

### Configuration Issues

| Issue | Solution |
|-------|----------|
| "API key not found" | Check Settings → Integrations |
| "Model not available" | Verify Ollama is running |
| "Rate limited" | Wait and retry, or upgrade plan |
| "Invalid response" | Check API key permissions |
