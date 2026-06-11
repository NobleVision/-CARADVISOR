# Documentation Refactoring Skill

**Purpose:** Refactor project documentation to eliminate redundancy, improve structure, and create clear separation between release history, current state, and future work.

**Applies To:** Any software project with `README.md`, `TODO.md`, and optionally `RELEASE.md` / `CHANGELOG.md` files.

## When to Use This Skill

Use this skill when your project has:
- Large `README.md` files with extensive completed-task history cluttering the current-state sections
- `TODO.md` files containing both completed and active tasks
- Redundant information scattered across multiple documentation files
- Difficulty finding current status or active work items due to historical clutter
- A new team member who would struggle to understand what is active vs. what is historical

## Overview of the Refactoring Process

The refactoring involves:
1. **Creating `RELEASE.md`** — A chronological history of all completed features with dates
2. **Restructuring `README.md`** — Focused on current state, architecture, and setup
3. **Cleaning `TODO.md`** — Contains only active/in-progress items and pending work
4. **Preserving all historical data** — No information is lost, just reorganized

> **Tip:** If your project uses semantic versioning, consider `CHANGELOG.md` (following [Keep a Changelog](https://keepachangelog.com)) instead of or alongside `RELEASE.md`. The structure below adapts to either format.

## Step-by-Step Instructions

### Step 1: Identify Completed Tasks

Search for completed tasks with dates in your documentation:
- Look for patterns like `**Month Day, Year**` or `✅ Completed (Date)`
- Check for version numbers, release dates, or completion markers
- Include items marked as "Complete", "Done", "Shipped", "Deployed"
- Don't move items without clear completion dates

### Step 2: Create RELEASE.md

Create a new `RELEASE.md` file with the following structure:

```markdown
# [Project Name] — Release History

This document contains the complete history of completed features and milestones with their completion dates. For current development progress and upcoming features, see [TODO.md](./TODO.md).

---

## [Month] [Year]

### [Date] - [Feature/Task Name]

[Brief description of what was completed]

**Key improvements/components:**
- [Bullet point 1]
- [Bullet point 2]
- [Bullet point 3]

[Continue with more completed tasks in chronological order]

---

*This release history is maintained chronologically with the most recent releases first. Each entry represents features that were 100% complete and available in production on the indicated date.*
```

**Best practices:**
- Group by month/year with most recent first
- Include contributor names if available
- Keep descriptions concise but informative
- Preserve all technical details and implementation notes
- Include links to related issues or PRs if available

### Step 3: Restructure README.md

Transform your README.md to follow this structure:

```markdown
# [Project Name]

## Executive Summary

[2-3 paragraph overview of what the project is, who it serves, and its key value proposition]

### Key Value Propositions

| Stakeholder | Value Delivered |
| ----------- | -------------- |
| [Group 1]   | [Benefit 1]    |
| [Group 2]   | [Benefit 2]    |
| [Group 3]   | [Benefit 3]    |

### Key Differentiators

- [Differentiator 1]
- [Differentiator 2]
- [Differentiator 3]

### Platform Metrics (if applicable)

| Metric | Target |
| ------ | ------ |
| [Metric 1] | [Value] |
| [Metric 2] | [Value] |

---

## Project Vision

### Purpose

[Why the project exists - the problem it solves]

### Solution

[How the project addresses the problem - key components and approach]

### Benefits

**For [User Group 1]:**
- [Benefit 1]
- [Benefit 2]

**For [User Group 2]:**
- [Benefit 1]
- [Benefit 2]

---

## How It Works — Technical Implementation

[Architecture overview with diagrams]

### Technology Stack

| Layer | Technology | Purpose |
| ----- | ---------- | ------- |
| [Layer 1] | [Tech 1] | [Purpose] |
| [Layer 2] | [Tech 2] | [Purpose] |

### User Journey Flow

[Mermaid flowchart showing user flow]

---

## Core Features

[Convert completed task descriptions into cohesive feature sections]

### [Feature Category 1]

- [Feature 1] - [Brief description]
- [Feature 2] - [Brief description]

### [Feature Category 2]

- [Feature 1] - [Brief description]
- [Feature 2] - [Brief description]

---

## Installation & Setup

[Clear setup instructions]

---

## API Documentation (if applicable)

[API overview and key endpoints]

---

## Deployment

[Deployment instructions]

---

## Project Structure

[Directory tree overview]

---

## Contributing

[Contribution guidelines]

---

## Support

[Support information]

---

## License

[License information]

---

*For detailed release history and completed features, see [RELEASE.md](./release.md). For current development progress, see [TODO.md](./TODO.md).*
```

### Step 4: Clean Up TODO.md

Transform TODO.md to focus only on active work:

```markdown
# [Project Name] — TODO

**Last Updated:** [Current Date]
**Status:** [Brief status summary]

---

## 🟡 In Progress ([Current Month] [Year])

### [Current Task 1]
[Description and remaining action items]

- [ ] [Action item 1]
- [ ] [Action item 2]
- [x] [Completed item]

### [Current Task 2]
[Description and remaining action items]

---

## 📋 Pending Tasks

### [Category 1]

- [ ] [Task 1]
- [ ] [Task 2]

### [Category 2]

- [ ] [Task 1]
- [ ] [Task 2]

---

## 🐛 Known Issues

### Priority

- [ ] [Issue 1]
- [ ] [Issue 2]

---

## 💡 Suggestions & Ideas

### Future Considerations

- [Idea 1]
- [Idea 2]

---

## 🔧 Development Guidelines

[Development process information]

---

*For completed features and release history, see [RELEASE.md](./release.md). For project overview and technical documentation, see [README.md](./README.md).*
```

## Validation Checklist

After completing the refactoring:

- [ ] All completed tasks with dates have been moved to RELEASE.md
- [ ] README.md focuses on current state and future vision
- [ ] TODO.md contains only active/in-progress items
- [ ] No historical data has been lost
- [ ] All three files reference each other appropriately
- [ ] Dates are consistent across all files
- [ ] Technical details are preserved in RELEASE.md
- [ ] README.md is approachable for new contributors
- [ ] TODO.md is actionable for current developers

## Common Patterns to Look For

### Completed Task Indicators
- `**Month Day, Year**`
- `✅ Complete` or `✅ Completed`
- `Status: Complete/Done/Shipped`
- Version numbers with dates
- Pull request merges with dates

### Section Headers to Restructure
- "Recent Changes" → Move to RELEASE.md
- "Latest Features" → Move to RELEASE.md
- "Completed Tasks" → Move to RELEASE.md
- "Current Status" → Keep only current items in TODO.md

### Content to Transform
- Individual completed tasks → Group into feature categories in README.md
- Technical implementation details → Keep in README.md under "How It Works"
- Historical context → Move to RELEASE.md
- Future plans → Keep in TODO.md under "Pending Tasks"

## Tips for Success

1. **Be thorough** - Don't skip any completed tasks, even minor ones
2. **Preserve details** - Keep technical specifics in RELEASE.md
3. **Stay organized** - Use consistent formatting and structure
4. **Link everything** - Ensure cross-references between files work
5. **Update dates** - Make sure all dates are current and accurate
6. **Get feedback** - Have team members review the new structure

## Example Transformation

**Before (scattered across files):**
```
## Recent Changes
**May 15, 2023:** Added user authentication
**May 10, 2023:** Fixed login bug
**May 5, 2023:** Updated dependencies
```

**After (organized):**

RELEASE.md:
```
## May 2023
### May 15, 2023 - User Authentication System
Implemented complete OAuth2 authentication with JWT tokens...
```

README.md:
```
## Core Features
### Authentication & Security
- OAuth2 integration (Google, GitHub)
- JWT-based session management
- Secure password handling
```

TODO.md:
```
## 🟡 In Progress
### Authentication Enhancements
- [ ] Add two-factor authentication
- [ ] Implement SSO for enterprise
```

## Adapting for Your Project

- Adjust section names and structure based on your project's needs and audience
- Add/remove sections as appropriate (e.g., skip "Payments" if not applicable)
- Modify the tone to match your project's culture (internal tool vs. open-source vs. enterprise)
- Include project-specific sections (e.g., "Architecture Decisions", "ADRs", "Migration Notes")
- For versioned software, use `CHANGELOG.md` with `## [x.y.z] - YYYY-MM-DD` headings per [Keep a Changelog](https://keepachangelog.com)
- For continuous-deployment projects without semantic versions, use date-grouped `RELEASE.md` (as shown above)
- Keep `README.md` as the **entry point**: it should answer "what is this, how do I set it up, what does it do" — not serve as a historical changelog

---

**Remember:** The goal is to make documentation more maintainable and user-friendly while preserving all valuable historical information. Every file should have a clear, distinct purpose that a new contributor can understand at a glance.
