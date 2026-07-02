# ASC Integrated Academy Management Program — UI/UX Implementation Guidelines for Codex

> **Purpose:** This file is a practical UI/UX instruction document for AI coding agents working on the ASC integrated academy management program. Codex should be able to apply these guidelines without independently reviewing external reference products.

> **Core product premise:** ASC is a B2B operational system for private academies. It manages students, classes, attendance, scores, assignments, counseling, parent communication, textbook/payment workflows, and student risk signals. The interface must prioritize operational speed, error prevention, and clear student-status judgment over decorative visuals.

---

## 0. How Codex Should Use This Document

When implementing or modifying any ASC feature, apply the following process:

1. Identify the **primary user role** for the feature: owner, instructor, teaching assistant, admin staff, or system administrator.
2. Identify the **primary operational job**: find, review, decide, input, message, bill, resolve, audit, or configure.
3. Choose the correct **screen pattern** from this document: operations inbox, list-detail-action, student 360 profile, communication thread, payment dashboard, record review queue, or lifecycle board.
4. Design the screen around the **next action** the user must take, not around passive data display.
5. Prefer **recognition over recall**: show options, status badges, templates, suggestions, and saved views instead of asking the user to remember codes, menu paths, or manual procedures.
6. Reduce typing by using defaults, autocomplete, dropdowns, batch actions, templates, and prefilled variables.
7. Add explicit safeguards for sensitive actions: SMS sending, payment changes, refunds, deletion, class transfer, score deletion, and parent-contact edits.
8. Keep UI rules consistent across features: table behavior, filters, status badges, buttons, modals, side panels, empty states, and error states.
9. Include accessibility, loading state, error state, empty state, and permission behavior in the implementation.
10. Before marking a feature complete, run the **ASC UI/UX Pull Request Checklist** at the end of this file.

---

## 1. Reference Patterns to Internalize

Codex does **not** need to browse these products. Use the abstracted patterns below.

| Reference Pattern | What to Take | How ASC Should Use It |
|---|---|---|
| HubSpot-style CRM record | 360-degree profile, activity timeline, quick actions | Student detail page with attendance, scores, counseling, SMS, payments, textbooks, and class history in one timeline |
| Linear-style triage | Central queue of unresolved items | Home dashboard as an operations inbox for at-risk students, absences, unpaid invoices, failed messages, and pending counseling |
| Front/Intercom-style inbox | Conversation thread, assignee, internal note, resolved/unresolved states | Parent communication and counseling center connected to each student profile |
| Airtable/Notion-style views | Same data shown through table, board, calendar, saved filters | Student list, class list, payment list, and risk list with saved views by class, teacher, status, date, or risk group |
| Retool-style admin UI | Table + detail panel + action buttons | Internal admin screens, batch workflows, record editing, and operational tools |
| Shopify/Stripe-style admin | Payment statuses, filters, transaction detail, refunds, audit trail | Billing, textbook payments, unpaid students, partial payment, refund/cancellation management |
| Rippling-style lifecycle and permissions | Person lifecycle, role-based access, automated tasks | Student lifecycle from inquiry to enrollment to leave/withdrawal, plus staff permission scopes |
| Monday/ClickUp-style workflow board | Status columns, owner assignment, operational progress | Counseling queue, OMR review queue, risk student follow-up board, and task assignment |

**Important:** Do not copy the visual identity of these tools. Apply only their interaction patterns and information architecture.

---

## 2. Global ASC UX Principles

### 2.1 Workflow Over Feature Menus

Design around academy operations, not around database tables.

Bad structure:

```text
Students / Scores / Attendance / Messages / Payments as isolated modules
```

Better structure:

```text
Today -> Review risk -> Take action -> Record result -> Follow up
```

Every important screen should answer:

- What needs attention now?
- Which students are affected?
- Why are they flagged?
- What action should staff take next?
- Has the issue been resolved?

### 2.2 Student-Centered Architecture

The student is the primary object in ASC. Most workflows should connect back to a student profile.

A student profile should unify:

- Basic identity: name, school, grade, class, assigned instructor, parent contact
- Enrollment status and lifecycle
- Attendance history
- Score history and score trends
- Assignment completion
- Counseling notes
- Parent communication history
- Payment and textbook history
- Risk status and resolution history
- Internal staff notes

### 2.3 List -> Detail -> Action

For operational software, use a stable pattern:

```text
List or queue -> Selected record detail -> Contextual action
```

Examples:

- Student list -> student detail panel -> send SMS / add note / update class
- Payment list -> payment detail panel -> send payment reminder / mark paid / refund
- Risk queue -> risk detail -> assign owner / message parent / resolve
- OMR review list -> scanned result detail -> fix error / confirm score / publish

Avoid forcing users to navigate across many full pages for simple actions.

### 2.4 Status First, Raw Data Second

ASC should not merely show raw data. It should translate data into an actionable status.

Examples:

| Raw Data | Better ASC Interpretation |
|---|---|
| Score: 64 | Down 18 points from previous test; below class average by 12 points; counseling recommended |
| Attendance: absent twice | Two absences in the last four weeks; parent notification not sent |
| Payment: unpaid | Tuition unpaid for 7 days; reminder SMS available |
| Assignment: 60% complete | Below completion threshold; student is in homework-risk group |

### 2.5 Input Minimization

Every manually typed field increases friction and error risk. Prefer:

- Defaults
- Dropdowns
- Autocomplete
- Preset templates
- Batch actions
- Bulk import
- Smart matching
- Saved filters
- Variable substitution in messages
- One-click status updates with undo where safe

### 2.6 Error Prevention for Sensitive Workflows

Add strong safeguards for:

- Bulk SMS or Kakao/message sending
- Payment edits
- Refunds
- Student deletion
- Class transfer
- Score deletion or overwrite
- Parent phone number changes
- Counseling note deletion
- Bulk status updates

Required safeguards:

- Preview before commit
- Display affected student count
- Display selected recipients or records
- Confirm destructive or irreversible actions
- Explain consequences in plain language
- Provide undo for reversible actions
- Add audit log for sensitive changes

### 2.7 Consistency Over Novelty

Do not invent a new interaction for every feature. Reuse shared components and patterns.

The following must remain consistent:

- Primary button placement
- Secondary/destructive button treatment
- Table sorting/filtering behavior
- Status badge colors and labels
- Side panel behavior
- Modal behavior
- Toast and inline error behavior
- Empty state wording
- Permission-denied states
- Date and currency formatting

### 2.8 Search and Filter Are Core UX

ASC will become difficult to use as student count grows unless search and filtering are excellent.

Every major list must support relevant filters, quick search, and saved views.

Minimum searchable fields:

- Student name
- Parent phone last digits
- School
- Grade
- Class
- Instructor
- Attendance status
- Score-risk status
- Assignment status
- Payment status
- Counseling status
- Message status

### 2.9 Role-Based Interfaces

Do not show every feature to every user. Use role-focused navigation and permission gates.

Recommended roles:

| Role | Main Jobs | UI Focus |
|---|---|---|
| Owner / Director | Business overview, risk, revenue, staff performance | Dashboard, revenue, risk students, staff workload, global search |
| Instructor | Class operation, scores, counseling | Today’s classes, attendance, score review, student notes, parent communication |
| Teaching Assistant | Attendance, homework, OMR, operational support | Checklists, batch input, scan review, limited student data |
| Admin Staff | Enrollment, payments, messages, scheduling | Student registration, billing, reminders, parent contact, class assignment |
| System Admin | Configuration, permissions, audit | Settings, roles, integrations, logs |

### 2.10 Accessibility and Density

ASC is information-dense. It must still be readable.

Baseline rules:

- Body text should generally be at least 14px.
- Key numbers and status labels should generally be 16px or visually prominent.
- Use sufficient line height for tables and lists.
- Provide a compact table mode only as an optional setting.
- Do not rely on color alone; pair every status color with text or icon.
- Ensure keyboard navigation for forms, tables, modals, and side panels.
- Provide visible focus states.
- Avoid tiny icon-only controls unless accompanied by tooltip and accessible label.

---

## 3. Design System Rules

### 3.1 Layout System

Use a predictable admin-app layout:

```text
Top bar: global search, current academy/branch, notifications, account
Left sidebar: primary navigation
Main content: list, board, dashboard, form, or detail
Right side panel: selected record detail or contextual action
```

Primary navigation should generally be:

```text
Home
Students
Classes / Attendance
Scores / Analysis
Assignments
Messages / Counseling
Payments / Textbooks
Reports
Settings
```

Adjust labels to match actual product scope, but avoid deeply nested menus.

### 3.2 Spacing

Use an 8px spacing system.

Recommended values:

- 4px: very tight inline spacing
- 8px: default small gap
- 16px: component internal padding
- 24px: section spacing
- 32px: major layout separation
- 48px+: dashboard or page-level separation only when needed

### 3.3 Typography

Use clear hierarchy:

- Page title: screen purpose
- Section title: group of related controls or data
- Record title: student/class/payment/message name
- Label: field meaning
- Body: normal content
- Helper text: explanatory secondary information
- Metadata: timestamps, staff names, IDs

Do not use small gray text for important operational information.

### 3.4 Color Semantics

Use color as a status language, not decoration.

| Status Meaning | Recommended Color Semantics | Use Cases |
|---|---|---|
| Critical / urgent | Red | absent without notice, severe score drop, overdue payment, failed bulk message |
| Warning / attention | Yellow or orange | homework issue, score stagnation, partial payment, review needed |
| Normal / completed | Green | paid, attended, message sent, resolved |
| Primary action / selected | Blue or brand primary | save, send, selected tab, active filter |
| Neutral / inactive | Gray | archived, disabled, historical, metadata |

Rules:

- Do not overuse red.
- Do not use more than one primary action color.
- Always include text labels with colored badges.
- Use muted background badges for table status indicators.

### 3.5 Button Rules

Each screen should have one obvious primary action.

Button hierarchy:

- Primary: one main action, visually strongest
- Secondary: supporting actions
- Tertiary/ghost: low-emphasis actions
- Destructive: red or clearly separated, never placed too close to primary save/send actions

Examples:

- Student detail: primary action may be `Send Message` or `Save Changes`, depending on mode.
- Message preview: primary action is `Send to N Recipients`.
- Payment detail: primary action may be `Mark as Paid`; destructive action `Refund` must be separated and confirmed.

### 3.6 Table Rules

Tables are for scanning, comparing, filtering, and selecting.

Required table capabilities for major lists:

- Search box
- Filters
- Sortable key columns
- Status badges
- Row selection
- Batch actions where useful
- Sticky header for long tables
- Pagination or virtualization for large datasets
- Empty state
- Loading skeleton
- Error state with retry

Avoid placing too many columns. Prefer essential scan fields in the table and details in the side panel.

Recommended student table columns:

```text
Name | School | Grade | Class | Instructor | Status | Recent Signal | Payment | Last Contact | Actions
```

Recommended payment table columns:

```text
Student | Class | Billing Item | Amount | Due Date | Status | Last Reminder | Actions
```

### 3.7 Side Panel Rules

Use a side panel for contextual detail and quick actions.

Good side panel uses:

- Student summary from a list
- Payment details from a payment table
- Message preview from a recipient list
- OMR scan result review
- Counseling note creation

Side panel should include:

- Clear title
- Key status summary
- Relevant fields only
- Primary action
- Secondary actions
- Close control
- Unsaved changes protection when applicable

### 3.8 Modal Rules

Use modals only for focused tasks or confirmations.

Good modal uses:

- Confirm bulk SMS send
- Confirm refund
- Confirm deletion
- Confirm class transfer
- Short form with limited fields

Do not use modals for complex multi-step workflows. Use a full page or side panel instead.

### 3.9 Toast, Alert, and Inline Error Rules

Use correct feedback type:

- Toast: short success or non-critical confirmation
- Inline error: field-level validation error
- Alert banner: page-level issue or critical warning
- Modal confirmation: dangerous or irreversible action

Examples:

- `Saved successfully.` -> toast
- `Parent phone number is required.` -> inline error under phone field
- `3 messages failed to send. Review failed recipients.` -> alert banner with action
- `Refund this payment?` -> confirmation modal

---

## 4. Feature Guidelines

---

# Feature: Home / Operations Inbox

## Purpose

Home should function as the user’s operational command center. It should answer: **What requires attention today?**

Do not make Home a decorative statistics dashboard only.

## Reference Pattern

Use a Linear-style triage queue combined with a light operational dashboard.

## Primary Users

- Owner / director
- Instructor
- Teaching assistant
- Admin staff

## Core UI Structure

```text
Top summary cards
- Today’s classes
- At-risk students
- Unresolved messages
- Unpaid payments
- Pending score/OMR reviews

Main queue
- Urgent items
- Warnings
- Routine tasks

Right panel or secondary area
- Selected item detail
- Quick action buttons
```

## Required Queue Items

Include configurable item types:

- Absent student
- Repeated tardiness
- Score dropped sharply
- Homework not submitted
- Payment overdue
- SMS/message failed
- Counseling follow-up overdue
- OMR recognition issue
- New enrollment pending class assignment
- Student lifecycle change requiring action

## Queue Item Anatomy

Each item must show:

```text
Severity badge
Student name
Class / instructor
Reason for flag
Timestamp or due date
Recommended action
Owner / assignee if available
Resolution state
```

Example:

```text
[Critical] Kim Minjun · Grade 10 · Wed/Fri 7PM
Score dropped by 18 points from previous test. Parent has not been notified.
Actions: Send Message | Add Counseling Note | Assign Owner | Resolve
```

## UX Rules

- Sort by severity and due time by default.
- Allow filtering by role, class, instructor, and item type.
- Provide `Resolve`, `Assign`, `Snooze`, and `View Student` actions.
- Show counts, but make the actionable list more prominent than charts.
- Avoid overwhelming users with every minor signal. Use thresholds.
- Once resolved, keep history in the student timeline.

## Empty State

When there are no pending items:

```text
No urgent items for today.
You can review upcoming classes or open the student list.
```

## Acceptance Criteria

- User can identify urgent work within 5 seconds.
- Every queue item explains why it exists.
- Every queue item has at least one next action.
- Resolution writes back to student history.
- Dashboard changes by user role and permissions.

---

# Feature: Student List

## Purpose

Student List is for finding, filtering, comparing, selecting, and batch-operating on students.

## Reference Pattern

Use Airtable/Retool-style data table with saved views and a detail side panel.

## Primary Users

- Instructor
- Admin staff
- Owner / director
- Teaching assistant with limited scope

## Core UI Structure

```text
Header
- Page title: Students
- Primary action: Add Student
- Secondary: Import, Export, Saved Views if supported

Filter bar
- Search
- Grade
- School
- Class
- Instructor
- Status
- Risk
- Payment
- Attendance

Table
- Student rows
- Status badges
- Recent signal
- Batch selection

Right side panel
- Selected student summary
- Quick actions
```

## Recommended Columns

```text
Name
School
Grade
Class
Instructor
Student Status
Risk Status
Recent Signal
Payment Status
Last Contact
Quick Actions
```

## Saved Views

Provide default saved views:

- All students
- Today’s class students
- At-risk students
- Repeated absences
- Score decline
- Homework incomplete
- Payment overdue
- Counseling needed
- Recently enrolled
- Leave/withdrawal candidates

## Search Behavior

Search must support:

- Student name
- Parent phone last digits
- School
- Class name
- Instructor name

Search should be forgiving of spacing and partial input.

## Batch Actions

Support only safe batch actions initially:

- Send message
- Assign instructor
- Add tag/status
- Export selected
- Create counseling tasks

Dangerous batch actions must require confirmation and audit logging.

## UX Rules

- Table rows should open side panel, not always navigate away.
- Keep table columns limited; move detailed data into side panel.
- Show status badges using consistent colors and labels.
- Provide a clear reset-filter action.
- Remember the last used view per user if feasible.

## Acceptance Criteria

- User can find a student by name or phone digits quickly.
- User can isolate a class, teacher, grade, or risk group quickly.
- Selected student can be acted on without losing list context.
- Batch actions show selected count before execution.

---

# Feature: Student 360 Detail Profile

## Purpose

Student Detail is the central operational record. It should answer: **What is happening with this student, and what should staff do next?**

## Reference Pattern

Use HubSpot-style CRM record: profile summary, activity timeline, and quick actions.

## Primary Users

- Instructor
- Owner / director
- Admin staff
- Teaching assistant with limited access

## Core UI Structure

```text
Left or top summary
- Student name, school, grade, class
- Assigned instructor
- Parent contact
- Student status
- Risk status
- Payment status
- Recent attendance summary

Main content
- Activity timeline
- Tabs or filters for Attendance, Scores, Assignments, Messages, Counseling, Payments, Textbooks

Right action panel
- Send message
- Add counseling note
- Register payment
- Edit class
- Update status
- Add task
```

## Activity Timeline Items

Timeline should include:

- Attendance events
- Score updates
- Score-risk flags
- Assignment events
- Counseling notes
- Sent messages
- Failed messages
- Payment events
- Textbook purchase events
- Class transfers
- Status changes
- Staff notes
- System-generated risk events

## Timeline Item Anatomy

```text
Icon or category badge
Event title
Short description
Date/time
Staff member or system actor
Linked source record
Available follow-up action
```

Example:

```text
[Score] June mock test: 64 points
Down 18 points from previous test; 12 points below class average.
Added by System · 2026-06-29 18:20
Actions: Send score report | Add counseling note | View exam detail
```

## Summary Cards

Show interpreted summaries:

- Attendance: `2 absences in last 4 weeks`
- Score trend: `3-test decline`
- Homework: `60% submission rate`
- Payment: `Tuition overdue by 7 days`
- Counseling: `Last contact 18 days ago`

## UX Rules

- Place urgent status near the student name.
- Do not bury parent contact or assigned instructor.
- Keep raw history available, but summarize risk first.
- Use timeline filters: All, Attendance, Scores, Assignments, Messages, Counseling, Payments, System.
- Sensitive information should respect role permissions.
- Notes must distinguish internal-only notes from parent-facing messages.

## Acceptance Criteria

- User can understand the student’s current status within 10 seconds.
- User can see the latest meaningful event immediately.
- User can perform common actions without leaving the page.
- Timeline is filterable and chronological.
- Sensitive actions are logged.

---

# Feature: Student Lifecycle Management

## Purpose

Manage students as lifecycle entities, not just rows in a list.

## Reference Pattern

Use Rippling-style person lifecycle and status transitions.

## Recommended Lifecycle States

```text
Inquiry
Level Test Scheduled
Level Test Completed
Enrollment Pending
Active
Attention Needed
At Risk
Paused / Leave
Withdrawn
Re-enrollment Candidate
Archived
```

Adjust labels to actual ASC business rules.

## Required UX

- Show current lifecycle state on student profile.
- Allow permitted users to change state.
- Explain consequences before major state changes.
- Trigger follow-up tasks where appropriate.
- Log state changes in timeline.

## Example Automations

| State Change | Suggested System Action |
|---|---|
| Inquiry -> Level Test Scheduled | Create test reminder message |
| Level Test Completed -> Enrollment Pending | Prompt class recommendation |
| Enrollment Pending -> Active | Create first-class checklist |
| Active -> At Risk | Add to operations inbox |
| Active -> Paused | Pause billing reminder if policy allows |
| Active -> Withdrawn | Prompt final payment/refund review |
| Withdrawn -> Re-enrollment Candidate | Add to reactivation campaign list |

## UX Rules

- Do not allow accidental lifecycle changes.
- Show only valid next states where possible.
- Use confirmation for withdrawal, archive, or reactivation.
- Keep lifecycle history auditable.

## Acceptance Criteria

- Student state is visible in list and detail.
- Invalid transitions are blocked or clearly explained.
- State changes produce timeline entries.
- Lifecycle state can be filtered in student list.

---

# Feature: Classes and Attendance

## Purpose

Support fast class operation before, during, and after class.

## Reference Pattern

Use checklist and table patterns optimized for speed.

## Primary Users

- Instructor
- Teaching assistant
- Admin staff

## Core UI Structure

```text
Today’s classes
- Class name
- Time
- Instructor
- Room
- Expected students
- Attendance status

Selected class attendance sheet
- Student list
- Default status: present
- Quick toggles: absent, late, left early, excused
- Note field
- Parent notification status
```

## Attendance Input Rules

- Default status should be `Present` when appropriate.
- Allow fast changes for exceptions: absent, late, early leave, excused.
- Support keyboard shortcuts or single-click toggles for high-frequency workflows.
- Support batch mark present.
- Show unsaved changes clearly.
- Ask for confirmation only when changing finalized attendance or sending messages.

## Attendance Status Labels

Recommended labels:

```text
Present
Absent
Late
Left Early
Excused
Pending
```

## Parent Notification Integration

When a student is absent or repeatedly late:

- Offer message template.
- Show whether parent has already been notified.
- Log message in student timeline.
- Add unresolved item to operations inbox if not handled.

## Acceptance Criteria

- Instructor or assistant can complete attendance quickly.
- Exceptions are visually obvious.
- Parent notification status is visible.
- Attendance history updates student profile.
- Revisions are auditable.

---

# Feature: Scores / Exams / OMR / Analysis

## Purpose

Scores should help staff identify who needs intervention, not merely store grades.

## Reference Pattern

Use Airtable record review for OMR validation and Linear-style triage for score-risk review.

## Primary Users

- Instructor
- Teaching assistant
- Owner / director

## Core UI Structure

```text
Exam list or selected exam
- Exam name
- Date
- Class
- Score input/completion status

Score table
- Student
- Raw score
- Class average comparison
- Previous exam comparison
- Trend
- Risk badge
- Actions

Review queue
- OMR recognition issues
- Large score drops
- Missing scores
- Students needing counseling or parent notification
```

## Score Interpretation Rules

Display both raw and interpreted information:

- Raw score
- Percentile or rank if available
- Difference from class average
- Difference from previous test
- Multi-test trend
- Risk category
- Recommended action

Example:

```text
64 points · -18 from previous · -12 vs class average · Risk: Critical
```

## Risk Signals

Configure thresholds rather than hardcoding where possible.

Example risk signals:

- Score dropped more than N points from previous test
- Three consecutive declines
- Below class average by N points
- Missing score
- OMR recognition confidence below threshold
- Score and homework both weak

## OMR Review UX

For scanned/recognized results:

- Show scan image or recognition result if available.
- Highlight low-confidence fields.
- Provide quick correction controls.
- Confirm before publishing scores.
- Track reviewer and timestamp.

## Messaging Integration

After score confirmation:

- Offer score report message template.
- Allow filtering recipients by risk, class, or score band.
- Preview personalized variables before sending.
- Log sent messages to student timeline.

## Acceptance Criteria

- User can distinguish normal scores from intervention-needed scores.
- Score-risk students can be added to counseling/message workflows.
- OMR errors are reviewed before final publication.
- Score changes are auditable.

---

# Feature: Assignments / Homework

## Purpose

Help staff track completion and identify homework-risk students.

## Reference Pattern

Use table/checklist patterns with batch input and interpreted status badges.

## Primary Users

- Instructor
- Teaching assistant

## Core UI Structure

```text
Assignment list
- Assignment name
- Class
- Due date
- Completion rate
- Risk count

Selected assignment detail
- Student list
- Submitted / missing / partial / excused
- Quick notes
- Parent notification status
```

## Status Labels

Recommended labels:

```text
Submitted
Missing
Partial
Late
Excused
Not Checked
```

## UX Rules

- Support batch mark submitted.
- Highlight students with repeated missing assignments.
- Show recent assignment completion rate in student profile.
- Offer parent message template for repeated missing work.
- Avoid excessive manual entry.

## Acceptance Criteria

- User can mark homework status quickly.
- Repeated missing work creates a risk signal.
- Homework data appears in student timeline and risk profile.

---

# Feature: Messages / Parent Communication / Counseling

## Purpose

Communication should be a student-linked relationship history, not just a send form.

## Reference Pattern

Use Front/Intercom-style shared inbox and conversation thread.

## Primary Users

- Instructor
- Admin staff
- Owner / director

## Core UI Structure

```text
Left column
- Inbox filters: Unresolved, Failed, Payment, Attendance, Score, Counseling, Sent, Archived

Center
- Conversation thread or message history
- Internal notes
- Message composer

Right panel
- Student summary
- Parent contact
- Recent scores
- Attendance summary
- Payment status
- Assigned staff
```

## Message Types

Support categories:

- Attendance notice
- Score report
- Homework reminder
- Payment reminder
- Counseling schedule
- General notice
- Class change notice
- Textbook/payment notice

## Internal Notes vs External Messages

Clearly separate:

- Internal staff note: visible only to staff
- Parent-facing message: sent externally

Use distinct UI treatment and labels.

Example:

```text
Internal note: Mother is sensitive to sudden score drops. Instructor should call before sending automated warning.
Parent message: Hello, this is ASC. We are sharing the recent test result and recommended follow-up.
```

## Message Composer Rules

- Use templates.
- Support variables such as student name, class, score, due amount, due date, instructor name.
- Validate variables before send.
- Preview personalized messages.
- Show recipient count.
- Show excluded or invalid recipients.
- Confirm bulk send.
- Log sent and failed messages.

## Bulk Send Confirmation Must Show

```text
Message type
Recipient count
Excluded count
Sample personalized preview
Variable validation status
Estimated send action
Final confirmation button
```

## Counseling Workflow

Counseling records should include:

- Student
- Parent or student contact type
- Counseling reason
- Summary
- Next action
- Follow-up date
- Staff owner
- Visibility: internal-only or shareable summary

## Conversation States

Recommended states:

```text
Unresolved
Waiting for Staff
Waiting for Parent
Scheduled
Resolved
Failed
Archived
```

## Acceptance Criteria

- User can see communication history next to student context.
- Bulk sends cannot happen without preview and confirmation.
- Failed messages can be reviewed and retried.
- Internal notes are never confused with parent-facing messages.
- Counseling follow-ups can generate tasks or inbox items.

---

# Feature: Payments / Billing / Textbooks

## Purpose

Payment UX should make financial states clear, searchable, auditable, and safe.

## Reference Pattern

Use Shopify/Stripe-style admin patterns: filters, payment status, transaction detail, refund/cancellation safeguards.

## Primary Users

- Admin staff
- Owner / director

## Core UI Structure

```text
Payment dashboard
- Due this month
- Overdue
- Paid
- Partial payment
- Refund/cancellation review

Payment list
- Student
- Class
- Item
- Amount
- Due date
- Status
- Last reminder
- Actions

Payment detail panel
- Billing item breakdown
- Student context
- Payment history
- Reminder history
- Refund/cancellation controls
```

## Payment Status Labels

Recommended labels:

```text
Draft
Issued
Due Soon
Overdue
Paid
Partially Paid
Cancelled
Refund Requested
Refunded
Partially Refunded
Failed
```

## Billing Item Types

Support separation of:

- Tuition
- Textbook
- Materials
- Test fee
- Discount
- Adjustment
- Refund

Do not merge everything into a single ambiguous `payment` field.

## Payment Detail Must Show

```text
Student
Class
Billing item
Amount
Discount/adjustment
Final amount
Due date
Payment method if available
Payment date
Current status
Reminder history
Related messages
Refund/cancel history
Staff actor history
```

## Safety Rules

Require confirmation for:

- Marking unpaid as paid manually
- Refund
- Cancellation
- Deleting payment record
- Changing amount after issue
- Bulk payment status update

Show plain-language consequences.

Example:

```text
You are about to mark this invoice as Paid. This will update the student payment status and add an audit log entry. Continue?
```

## Reminder Integration

Payment reminders should:

- Use templates.
- Show amount and due date variables.
- Prevent sending to invalid or missing parent contact.
- Log reminders in payment history and student timeline.

## Acceptance Criteria

- User can filter unpaid or overdue students quickly.
- Payment status is unambiguous.
- Risky financial actions require confirmation.
- Every financial change has an audit trail.
- Payment reminders are connected to message history.

---

# Feature: Textbook / Materials Management

## Purpose

Track required textbooks/materials and their payment or distribution status.

## Reference Pattern

Use lightweight order-management patterns similar to ecommerce admin tools.

## Primary Users

- Admin staff
- Instructor
- Owner / director

## Core UI Structure

```text
Materials list
- Item name
- Class
- Required students
- Paid count
- Distributed count
- Stock if available

Student material detail
- Required item
- Payment status
- Distribution status
- Date
- Staff note
```

## Status Labels

Recommended labels:

```text
Required
Payment Pending
Paid
Distributed
Not Distributed
Returned
Cancelled
```

## UX Rules

- Connect textbook/material payment to payment module.
- Connect distribution status to student profile.
- Allow batch mark distributed for a class.
- Highlight required-but-unpaid students.
- Avoid mixing textbook payment with tuition unless itemized.

## Acceptance Criteria

- Staff can identify who needs to pay for or receive materials.
- Student profile shows material/payment history.
- Batch actions show selected count and require confirmation if financial state changes.

---

# Feature: Saved Views / Filters

## Purpose

Saved views reduce repeated filtering and make the system role-specific without building separate screens for every case.

## Reference Pattern

Use Airtable/Notion-style saved views with ASC-defined defaults.

## Required Default Views

Student views:

- All students
- Today’s students
- My students
- At-risk students
- Attendance issues
- Score decline
- Homework issues
- Payment overdue
- Counseling needed
- Recently enrolled
- Paused/withdrawn

Payment views:

- Due this month
- Overdue
- Paid
- Partial payment
- Textbook unpaid
- Refund review

Message views:

- Unresolved
- Failed
- Scheduled follow-up
- Attendance notices
- Score reports
- Payment reminders

Score views:

- Missing score
- OMR review needed
- Critical decline
- Below class average
- Counseling recommended

## UX Rules

- Provide defaults first; allow limited customization later.
- Do not expose full database-builder complexity in the MVP.
- Let users save filters if implementation scope allows.
- Show active filters visibly.
- Include reset filters.
- Persist user’s last selected view if appropriate.

## Acceptance Criteria

- User can reach common operational segments in one click.
- Active filter state is obvious.
- Saved views do not break permissions.

---

# Feature: Reports and Analytics

## Purpose

Reports should support operational decisions and academy management, not merely display charts.

## Reference Pattern

Use executive dashboard patterns, but prioritize actionable metrics and drill-downs.

## Primary Users

- Owner / director
- Instructor for class-level reports

## Report Categories

Recommended report areas:

- Enrollment status
- Attendance trends
- Score trends
- Homework completion
- At-risk student count
- Counseling activity
- Message delivery/failure
- Payment collection
- Class performance
- Instructor workload

## UX Rules

- Every chart should allow drill-down into student/class records where feasible.
- Do not show charts without explaining operational meaning.
- Prefer simple trend lines, bar charts, and status breakdowns.
- Avoid decorative charts that do not drive action.
- Show date range and filter scope clearly.

## Example Metric Treatment

Bad:

```text
Average score: 72
```

Better:

```text
Average score: 72 · down 4 points from previous test · 11 students flagged for review
```

## Acceptance Criteria

- Reports identify where action is needed.
- User can drill down from summary to affected students.
- Filter scope is clear.
- Data freshness or last updated time is visible where relevant.

---

# Feature: Global Search

## Purpose

Global search should help staff immediately locate students, classes, messages, payments, and tasks.

## Primary Users

All staff roles, scoped by permission.

## Search Targets

Include as implementation scope allows:

- Students
- Parent phone digits
- Classes
- Schools
- Instructors
- Payments
- Messages
- Counseling notes
- Exams
- Materials

## UX Rules

- Place global search in top bar.
- Support keyboard shortcut if feasible.
- Show grouped results by type.
- Respect permissions.
- Highlight matched terms.
- Show useful metadata: class, grade, status, payment state.

## Result Example

```text
Students
Kim Minjun · Grade 10 · Wed/Fri 7PM · Risk: Critical

Payments
Kim Minjun · June Tuition · Overdue by 7 days

Messages
Kim Minjun parent · Score report sent · 2026-06-29
```

## Acceptance Criteria

- User can find a student without knowing menu location.
- Search works with partial names and phone digits.
- Results are permission-safe.

---

# Feature: Notifications and Alerts

## Purpose

Notifications should direct users to actionable issues, not create noise.

## Notification Types

- Critical absence issue
- Failed message
- Payment overdue threshold reached
- Counseling follow-up due
- OMR review needed
- Score-risk detected
- Assigned task due
- Lifecycle transition pending

## UX Rules

- Every notification must link to a relevant record or queue item.
- Avoid notifying multiple roles for the same issue unless necessary.
- Use severity levels.
- Allow resolution from the target workflow.
- Keep notification history available where useful.

## Acceptance Criteria

- Notifications are actionable.
- Users are not spammed with low-value alerts.
- Notification state aligns with operations inbox state.

---

# Feature: Permissions and Role-Based Access

## Purpose

Protect sensitive information and reduce UI clutter.

## Reference Pattern

Use Rippling-style role and scope management.

## Permission Dimensions

Consider both role and data scope:

```text
Role: owner, instructor, assistant, admin staff, system admin
Scope: all academy, branch, class, assigned students, limited task-only
Action: view, create, edit, delete, export, send, refund, configure
```

## Sensitive Data

Restrict access to:

- Parent phone numbers
- Payment history
- Refunds
- Counseling notes
- Internal notes
- Bulk export
- System settings
- Audit logs

## UX Rules

- Hide unavailable actions when appropriate.
- For visible-but-disabled actions, explain why.
- Never show sensitive data and merely block editing if the user should not see it.
- Permission errors should be clear and non-technical.

Example:

```text
You do not have permission to view payment details for this student.
```

## Acceptance Criteria

- UI respects role and scope.
- Restricted actions cannot be triggered through direct UI routes.
- Permission-denied states are understandable.

---

# Feature: Settings and Configuration

## Purpose

Settings should configure academy operations without overwhelming users.

## Settings Categories

- Academy profile
- Branches
- Staff and roles
- Classes
- Student lifecycle states
- Attendance statuses
- Score-risk thresholds
- Message templates
- Payment items
- Materials/textbooks
- Integrations
- Audit logs

## UX Rules

- Separate everyday operations from configuration.
- Use clear descriptions for settings that affect automation.
- Show preview for message templates.
- Confirm changes that affect many students or workflows.
- Keep settings screens simple and grouped.

## Acceptance Criteria

- Configuration is discoverable but not mixed with daily operations.
- Risk thresholds and message templates can be understood by non-technical users.
- Major setting changes are auditable.

---

# Feature: Import / Export

## Purpose

Allow practical migration and operational reporting while preventing data damage.

## Import UX Rules

- Support CSV/XLSX import if feature scope includes it.
- Provide field mapping.
- Detect duplicates.
- Validate required fields.
- Show preview before import.
- Show error rows with reasons.
- Do not partially import silently without clear result summary.

## Export UX Rules

- Respect permissions.
- Show export scope and row count.
- Confirm export if sensitive information is included.
- Log exports if policy requires.

## Acceptance Criteria

- User can detect import problems before committing.
- Export cannot leak unauthorized data.
- Import result is clearly summarized.

---

## 5. Common Components and Their Expected Behavior

### 5.1 Status Badge

Use for student, payment, attendance, message, score-risk, and lifecycle states.

Badge requirements:

- Text label
- Consistent color semantic
- Optional icon
- Tooltip or explanation for non-obvious statuses
- Accessible label

Examples:

```text
[Risk: Critical]
[Payment: Overdue]
[Attendance: Late]
[Message: Failed]
[Lifecycle: Active]
```

### 5.2 Action Menu

Use for secondary record actions.

Rules:

- Do not hide primary action in overflow menu.
- Separate destructive actions visually.
- Disable actions that are invalid for current state.
- Explain disabled states.

### 5.3 Confirmation Dialog

Required for risky actions.

Must include:

- Action title
- Plain-language consequence
- Affected record count
- Primary confirmation button
- Cancel button
- Additional typed confirmation only for destructive/high-impact actions if needed

### 5.4 Empty State

Every major list, table, queue, and inbox needs an empty state.

Good empty state includes:

- What is empty
- Why it may be empty
- What the user can do next

Example:

```text
No overdue payments.
All current billing items are paid or not yet due.
```

### 5.5 Loading State

Use skeletons for tables and panels. Avoid layout shifts.

### 5.6 Error State

Error state must include:

- What failed
- Whether user data is safe
- Retry action where possible
- Support/debug detail only if useful

Bad:

```text
Error 500
```

Better:

```text
Student list could not be loaded. Your data was not changed. Retry.
```

---

## 6. Data and State Modeling Guidelines

### 6.1 Model Status Explicitly

Do not infer every UI state from vague booleans.

Prefer explicit enums:

```ts
type PaymentStatus =
  | 'draft'
  | 'issued'
  | 'due_soon'
  | 'overdue'
  | 'paid'
  | 'partially_paid'
  | 'cancelled'
  | 'refund_requested'
  | 'refunded'
  | 'partially_refunded'
  | 'failed';
```

### 6.2 Keep Audit Events

Sensitive changes should produce audit records.

Audit event fields:

```text
actorId
actorRole
actionType
targetType
targetId
beforeValue
afterValue
timestamp
reason or note if required
```

### 6.3 Timeline Event Model

Student timeline should be generated from normalized events where feasible.

Suggested event fields:

```text
eventId
studentId
eventType
title
description
occurredAt
createdBy
sourceType
sourceId
visibility
metadata
```

### 6.4 Risk Signal Model

Risk signals should be explicit and resolvable.

Suggested fields:

```text
signalId
studentId
signalType
severity
reason
sourceType
sourceId
createdAt
assignedTo
status
resolvedAt
resolutionNote
```

Recommended statuses:

```text
Open
Assigned
Snoozed
Resolved
Dismissed
```

---

## 7. UX Writing Rules

### 7.1 Tone

Use concise, operational language. Avoid playful copy in core workflows.

Good:

```text
Send payment reminder
Review failed messages
Mark attendance as finalized
```

Bad:

```text
Let’s blast these messages!
Oopsie, something went wrong!
```

### 7.2 Labels

Labels should be specific and action-oriented.

Use:

```text
Send to 24 recipients
Mark 3 students as absent
Resolve risk signal
Preview message
```

Avoid:

```text
Submit
OK
Process
Manage
```

### 7.3 Error Messages

Errors should tell users what to fix.

Good:

```text
Parent phone number is missing for 2 selected students. Remove them or add phone numbers before sending.
```

Bad:

```text
Invalid recipients.
```

---

## 8. Mobile and Tablet Considerations

ASC is likely desktop-first, but attendance and quick checks may need tablet/mobile support.

## Responsive Rules

- Desktop: sidebar + main content + right panel is acceptable.
- Tablet: use navigation rail or collapsible sidebar; side panel may become drawer.
- Mobile: prioritize quick tasks such as attendance, student lookup, message review, and task resolution.

## Mobile Priority Features

- Today’s classes
- Attendance input
- Student quick lookup
- Parent contact action if permitted
- Operations inbox
- Counseling note quick add

Avoid complex payment/refund workflows on mobile unless carefully designed.

---

## 9. Feature-Specific Skills for Codex

Use these as mental implementation modes. A single task may require multiple skills.

### Skill: `workflow-first-ia`

Use when modifying navigation, dashboard, or module grouping.

Apply:

- Group by user job, not database entity.
- Keep primary navigation shallow.
- Make daily work visible from Home.

### Skill: `student-360-profile`

Use when building or editing student detail screens.

Apply:

- Show current status first.
- Include timeline.
- Connect attendance, score, counseling, message, payment, and material events.
- Provide quick actions.

### Skill: `operations-triage`

Use when building Home, risk queue, alerts, or review workflows.

Apply:

- Every item must have severity, reason, owner, state, and next action.
- Support resolve, assign, snooze, and view source.
- Log resolution.

### Skill: `list-detail-action`

Use when building tables, admin pages, and operational lists.

Apply:

- Main list for scanning.
- Side panel for detail.
- Contextual actions near detail.
- Preserve list context.

### Skill: `communication-inbox`

Use when building message, SMS, counseling, or parent-contact features.

Apply:

- Threaded history.
- Internal note vs external message separation.
- Assignment and resolution state.
- Preview and validation before bulk send.

### Skill: `payment-admin-safety`

Use when building payment, billing, refund, textbook payment, or financial state features.

Apply:

- Explicit payment status.
- Itemized billing.
- Confirmation for risky actions.
- Audit logs.
- Reminder history.

### Skill: `saved-view-filtering`

Use when building list filters, saved views, and role-specific segments.

Apply:

- Provide default ASC views.
- Show active filters.
- Allow reset.
- Respect permissions.

### Skill: `status-badge-system`

Use when adding or changing any status UI.

Apply:

- Use consistent label and color semantics.
- Do not rely on color alone.
- Keep enum values stable.
- Document new status meanings.

### Skill: `safe-bulk-action`

Use when implementing batch operations.

Apply:

- Show selected count.
- Validate records.
- Show excluded records.
- Preview result.
- Confirm sensitive actions.
- Log changes.

### Skill: `accessible-admin-ui`

Use for all UI work.

Apply:

- Keyboard navigation.
- Visible focus.
- Sufficient contrast.
- Accessible labels.
- Readable density.
- Text labels for status.

---

## 10. Implementation Defaults

Unless a specific product decision overrides them, use these defaults.

## Navigation Defaults

```text
Home
Students
Classes / Attendance
Scores / Analysis
Assignments
Messages / Counseling
Payments / Textbooks
Reports
Settings
```

## Status Severity Defaults

```text
Critical
Warning
Normal
Resolved
Inactive
```

## Risk Signal Defaults

```text
Attendance Risk
Score Risk
Assignment Risk
Payment Risk
Communication Risk
Lifecycle Risk
OMR Review Needed
```

## Common Actions

```text
View Student
Send Message
Add Note
Assign Owner
Resolve
Snooze
Edit
Save
Cancel
Preview
Confirm
Export
Import
```

## Date and Time

- Show absolute dates in audit logs and detailed records.
- Relative dates may be used as secondary information: `3 days ago`.
- Avoid ambiguous wording such as `recently` in operational state.

## Currency

- Use clear currency formatting.
- Keep tuition, textbook, discounts, and refunds itemized.

---

## 11. Anti-Patterns to Avoid

### 11.1 Dashboard as Decoration

Do not fill Home with charts that do not lead to action.

Bad:

```text
Large revenue chart, student count chart, generic announcements only
```

Better:

```text
Urgent student issues, unpaid payments, failed messages, pending reviews, today’s classes
```

### 11.2 Raw Data Dump

Do not show every field with equal importance.

Better:

- Show key status first.
- Hide detailed history behind tabs or filters.
- Use summaries and interpreted signals.

### 11.3 Over-Customization in MVP

Do not build a fully flexible database builder too early.

Better:

- Provide strong default views.
- Allow limited filter/sort/column customization.

### 11.4 Color Overload

Do not use too many colors or treat color as decoration.

Better:

- Use limited semantic colors.
- Pair color with text.

### 11.5 Isolated Modules

Do not make attendance, scores, messages, and payments feel unrelated.

Better:

- Student profile and timeline should connect them.
- Home queue should aggregate signals across modules.

### 11.6 Dangerous One-Click Actions

Never allow risky actions without preview or confirmation.

Examples:

- Bulk SMS send
- Refund
- Delete student
- Delete scores
- Bulk payment update
- Class transfer

### 11.7 Ambiguous Buttons

Avoid generic buttons like:

```text
Submit
OK
Done
Process
```

Prefer:

```text
Send to 24 recipients
Save attendance
Mark as paid
Resolve risk signal
Preview message
```

---

## 12. Example Screen Blueprints

### 12.1 Home Blueprint

```text
[Top Bar]
Global Search | Notifications | User

[Sidebar]
Home | Students | Classes | Scores | Messages | Payments | Reports | Settings

[Main]
Today’s Operations
- Critical: 8
- Warnings: 17
- Failed Messages: 3
- Overdue Payments: 12

Queue
[Critical] Student A - Score dropped 18 points
Actions: Send Message | Add Note | Assign | Resolve

[Warning] Student B - Homework missing twice
Actions: Send Reminder | Add Note | Resolve

[Payment] Student C - Tuition overdue 7 days
Actions: Send Payment Reminder | View Payment | Resolve

[Right Panel]
Selected item detail
Student summary
Recommended action
Timeline snippet
```

### 12.2 Student Detail Blueprint

```text
[Header]
Kim Minjun | Grade 10 | Daechi High | Wed/Fri 7PM | Risk: Critical | Payment: Overdue
Actions: Send Message | Add Counseling Note | Edit Student

[Summary Cards]
Attendance: 2 absences in 4 weeks
Scores: 3-test decline
Homework: 60% completion
Payment: Overdue by 7 days
Last Contact: 18 days ago

[Timeline Filters]
All | Attendance | Scores | Assignments | Messages | Counseling | Payments | System

[Timeline]
Score event
Attendance event
Message event
Payment event
Counseling note

[Right Panel]
Parent contact
Instructor
Quick actions
Open risk signals
```

### 12.3 Message Send Blueprint

```text
[Step 1: Select Recipients]
Filter by class, risk, payment, attendance, saved view
Show selected count and invalid recipients

[Step 2: Choose Template]
Attendance notice / Score report / Payment reminder / Counseling schedule

[Step 3: Preview]
Show personalized samples
Validate variables
Show excluded recipients

[Step 4: Confirm]
Send to N recipients
Log result
Show failed messages with retry option
```

### 12.4 Payment Detail Blueprint

```text
[Header]
June Tuition · Kim Minjun · Status: Overdue

[Summary]
Amount: ₩500,000
Due date: 2026-06-25
Overdue: 7 days
Last reminder: 2026-06-28

[Itemization]
Tuition: ₩450,000
Textbook: ₩50,000
Discount: ₩0
Total: ₩500,000

[History]
Invoice issued
Reminder sent
Status changed

[Actions]
Send Reminder
Mark as Paid
Edit Amount
Cancel
Refund
```

---

## 13. Testing and QA Requirements

### 13.1 UX Test Cases

For every major feature, test:

- Empty state
- Loading state
- Error state
- Permission-denied state
- Single-record action
- Bulk action
- Validation failure
- Success feedback
- Undo or confirmation behavior if applicable
- Audit log creation for sensitive actions

### 13.2 Role-Based QA

Test each role:

- Owner/director
- Instructor
- Teaching assistant
- Admin staff
- System admin

Verify:

- Correct navigation visibility
- Correct data scope
- Correct action permissions
- Sensitive data masking or hiding

### 13.3 Data Volume QA

Test lists with:

- 0 records
- 1 record
- 50 records
- 500+ records
- Long names
- Missing optional data
- Missing required data edge cases
- Duplicate names
- Same parent phone for siblings if applicable

---

## 14. ASC UI/UX Pull Request Checklist

Before completing any UI/UX-related implementation, verify:

### Product Fit

- [ ] The feature supports a real academy workflow.
- [ ] The primary user role is clear.
- [ ] The screen makes the next action obvious.
- [ ] The feature connects back to student context where relevant.

### Information Architecture

- [ ] Navigation placement is logical.
- [ ] Data is not shown with equal importance.
- [ ] Important status is visible before raw detail.
- [ ] Related workflows are connected, not isolated.

### Interaction Pattern

- [ ] Uses list-detail-action where appropriate.
- [ ] Uses side panel for contextual detail where appropriate.
- [ ] Uses confirmation modal only for focused or risky actions.
- [ ] Preserves user context after action.

### Tables and Filters

- [ ] Search is available where needed.
- [ ] Filters are relevant to academy operations.
- [ ] Active filters are visible.
- [ ] Empty, loading, and error states exist.
- [ ] Batch actions show selected count.

### Status and Feedback

- [ ] Status labels are explicit.
- [ ] Color semantics match ASC rules.
- [ ] Status is not communicated by color alone.
- [ ] Success feedback is clear.
- [ ] Errors explain how to recover.

### Safety

- [ ] Bulk SMS/message send has preview and confirmation.
- [ ] Payment/refund/cancellation actions are confirmed.
- [ ] Deletion and irreversible actions are confirmed.
- [ ] Sensitive changes create audit logs.
- [ ] Permission restrictions are enforced in UI and backend where applicable.

### Accessibility

- [ ] Keyboard interaction works for main controls.
- [ ] Focus states are visible.
- [ ] Icon-only buttons have accessible labels.
- [ ] Text is readable at normal density.
- [ ] Status badges include text labels.

### UX Writing

- [ ] Button labels are specific.
- [ ] Error messages are actionable.
- [ ] Empty states are helpful.
- [ ] Dangerous actions explain consequences.

---

## 15. Final North Star

ASC should feel like an academy operations cockpit.

The ideal user experience is:

```text
Open ASC -> See what needs attention -> Select student or issue -> Understand context -> Take safe action -> Record result automatically
```

Every feature should strengthen this loop.

