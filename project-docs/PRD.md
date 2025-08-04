## Current State Summary

The existing prototype is a basic writing application with:
- **Multi-project management** using browser LocalStorage
- **Simple text editor** with word counting and auto-save
- **AI feedback** via OpenAI API (appears below editor after clicking "Process Text")
- **Basic dashboard** showing writing statistics
- **Profile settings** for font preferences

## Scribex Writer - Product Requirements Document (PRD)

### Executive Summary

Transform the current Scribex prototype into a comprehensive writing education platform that teaches writing through metacognitive reflection, peer feedback, and AI-guided exercises. The platform will evolve from a simple text editor into a gamified learning environment where students improve their writing by editing their own work and helping others.

### Core Philosophy Alignment

The implementation must adhere to these principles:
1. **AI as Guide, Not Ghostwriter** - AI never writes for students, only prompts reflection
2. **Iteration Through Self-Editing** - Learning happens through revising one's own work
3. **Cued Recall Learning** - Exercises generated from student's own writing
4. **Recursive Writing Process** - Seamless flow between writing, editing, and revising
5. **Peer Learning Ecosystems** - Structured social feedback through "Bubbles"

### Technical Architecture Evolution

**Phase 1-3**: Continue with current architecture (Flask + LocalStorage)
**Phase 4+**: Migrate to:
- **Backend**: FastAPI + PostgreSQL + Redis
- **Frontend**: React/Vue.js with TypeScript
- **Authentication**: Auth0 or Supabase Auth
- **Real-time**: WebSockets for collaborative features
- **Storage**: S3-compatible object storage for documents

## Implementation Phases

### Phase 1: Enhanced Writing Experience (2 weeks)

**Goal**: Transform the basic editor into an intelligent writing environment with inline AI feedback.

**Technical Implementation**:

1. **Inline AI Feedback System**
   ```javascript
   // New component: InlineFeedback.js
   - Conservative analysis triggers:
     • 5-second pause in typing
     • New paragraph (double newline)
   - Only analyzes complete sentences
   - Tracks last analyzed position
   - Highlights feedback inline with tooltips
   - Toggle to hide/show feedback
   ```

2. **Genre Selection**
   ```javascript
   // Update project schema
   {
     ...existing,
     genre: 'narrative' | 'persuasive' | 'descriptive' | 'creative',
     feedbackPreferences: {
       mechanics: true,
       sequence: true,
       voice: true
     }
   }
   ```

3. **Positive Reinforcement System**
   ```javascript
   // AI response enhancement
   - Detect well-written passages
   - Display praise tooltips intermittently
   - Track positive feedback for motivation
   ```

4. **Inline Analysis Trigger Logic**
   ```javascript
   // Conservative trigger system
   State tracking:
   - lastAnalyzedPosition: where last analysis ended
   - lastActivityTime: timestamp of last keystroke
   - analysisInProgress: prevent overlapping requests
   
   Triggers on:
   - 5 seconds of inactivity
   - New paragraph (double newline)
   
   Analysis rules:
   - Only send complete sentences
   - Start from lastAnalyzedPosition
   - End at last sentence before cursor
   - Update position after successful analysis
   ```

**Backend Changes**:
```python
# server.py additions
@app.route('/analyze_inline', methods=['POST'])
def analyze_inline():
    # Endpoint for inline feedback analysis
    # Receives: text segment, start position, inline prompt
    # Returns: JSON with feedback items and exact positions
    # Only processes complete sentences
```

**UI/UX Updates**:
- Inline highlighting with customizable colors
- Feedback sidebar that syncs with cursor position
- Genre selector in project creation modal

### Phase 2: Exercise Generation Engine (3 weeks)

**Goal**: Build the core exercise system that generates challenges from student writing.

**Technical Implementation**:

1. **Exercise Generator**
   ```python
   # New file: exercise_generator.py
   class ExerciseGenerator:
       def extract_errors(text, genre):
           # Identify grammar, flow, clarity issues
       
       def create_exercise(error_type, context):
           # Generate interactive exercise
           # Types: multiple_choice, rewrite, fill_blank
   ```

2. **Exercise Types**
   ```javascript
   // New: ExerciseTypes.js
   - Comma placement (multiple choice)
   - Sentence clarity (rewrite with scoring)
   - Transition improvement (add sentence)
   - Tone consistency (identify/fix)
   ```

3. **Exercise Storage**
   ```javascript
   // Update project schema
   {
     ...existing,
     exercises: [{
       id: string,
       type: 'mechanics' | 'sequence' | 'voice',
       difficulty: 1-5,
       completed: boolean,
       score: number,
       attempts: number,
       sourceText: string,
       position: {start, end}
     }]
   }
   ```

4. **Editor Mode Toggle**
   ```javascript
   // New UI component
   - Toggle button: "Writing Mode" ↔ "Editor Mode"
   - Split screen in Editor Mode
   - Exercise panel with categorized tasks
   ```

### Phase 3: Publishing & Version Control (2 weeks)

**Goal**: Implement the publishing system with version tracking.

**Technical Implementation**:

1. **Version Control System**
   ```javascript
   // New schema: ProjectVersion
   {
     projectId: string,
     versionNumber: number,
     content: string,
     publishedAt: timestamp,
     exerciseScore: number,
     isPublished: boolean,
     changePercent: number // from previous version
   }
   ```

2. **Publishing Gateway**
   ```javascript
   // Publishing logic
   - Check exercise completion (90%+ threshold)
   - Lock published versions
   - Calculate change percentage
   - Allow re-publishing if >25% changed
   ```

3. **Draft Management**
   ```javascript
   // Auto-save drafts with version comparison
   - Track unsaved changes
   - Compare with last published version
   - Show version timeline
   ```

### Phase 4: User Authentication & Backend Migration (3 weeks)

**Goal**: Add user accounts and migrate to persistent storage.

**Technical Implementation**:

1. **Authentication System**
   ```python
   # New: auth.py
   - JWT-based authentication
   - User types: regular, student, guide
   - Email verification
   - Password reset flow
   ```

2. **Database Schema**
   ```sql
   -- PostgreSQL schema
   users (id, email, user_type, created_at)
   projects (id, user_id, title, genre, created_at)
   versions (id, project_id, content, version, published_at)
   exercises (id, version_id, type, score, attempts)
   ```

3. **Data Migration Tool**
   ```javascript
   // Migration utility
   - Export LocalStorage data
   - Upload to user account
   - Verify data integrity
   ```

### Phase 5: XP & Gamification System (2 weeks)

**Goal**: Implement the leveling and progression system.

**Technical Implementation**:

1. **XP Calculation Engine**
   ```python
   # xp_system.py
   XP_RULES = {
       'write_100_words': 10,
       'complete_exercise': 5,
       'publish_draft': 50,
       'peer_feedback': 20,
       'daily_streak': 15
   }
   ```

2. **Level Progression**
   ```javascript
   // Exponential leveling curve
   function getXPForLevel(level) {
     return Math.floor(100 * Math.pow(1.5, level - 1));
   }
   ```

3. **AI Adaptation by Level**
   ```python
   # Feedback complexity based on level
   FEEDBACK_TEMPLATES = {
       1-3: "direct_guidance",
       4-7: "questioning_prompts",
       8+: "minimal_hints"
   }
   ```

### Phase 6: Social Bubbles System (4 weeks)

**Goal**: Build the collaborative learning environment.

**Technical Implementation**:

1. **Bubble Architecture**
   ```python
   # bubbles.py
   class Bubble:
       - classroom (guide-managed)
       - public (adult-only)
       - private (invite-code)
   ```

2. **Commenting System**
   ```javascript
   // Real-time comments with WebSockets
   - Inline comments on published drafts
   - Anonymous option (visible to guides)
   - Upvoting for quality feedback
   ```

3. **Peer Exercise System**
   ```javascript
   // Generate exercises from peer writing
   - Same exercise types as self-editing
   - XP rewards for accurate editing
   - Leaderboards per bubble
   ```

4. **Moderation Tools**
   ```python
   # For guides/teachers
   - View all anonymous identities
   - Remove inappropriate content
   - Set bubble rules
   ```

### Phase 7: Advanced Features (3 weeks)

**Goal**: Polish and enhance the platform with advanced capabilities.

**Technical Implementation**:

1. **Analytics Dashboard**
   ```javascript
   // Writing analytics
   - Progress over time charts
   - Common error patterns
   - Improvement tracking
   - Genre-specific insights
   ```

2. **Mobile Optimization**
   ```javascript
   // Progressive Web App
   - Responsive design improvements
   - Touch-optimized exercises
   - Offline mode with sync
   ```

3. **Advanced AI Features**
   ```python
   # Enhanced AI capabilities
   - Multi-language support
   - Plagiarism detection
   - Style consistency analysis
   - Reading level assessment
   ```

## Technical Action Items by Phase

### Phase 1 Action Items:
1. Implement inline analysis trigger system (5-second pause, paragraph breaks)
2. Create sentence boundary detection algorithm
3. Build position tracking for analyzed text
4. Create inline annotation system with CSS highlights
5. Build feedback tooltip component
6. Add genre selector to project creation
7. Create feedback toggle button

### Phase 2 Action Items:
1. Build exercise generation API endpoint
2. Create exercise UI components (multiple choice, rewrite, etc.)
3. Implement exercise scoring system
4. Add Editor Mode toggle and split-screen view
5. Create exercise categorization (Mechanics/Sequence/Voice)
6. Build exercise attempt tracking

### Phase 3 Action Items:
1. Design version control schema
2. Implement publishing gateway with 90% threshold check
3. Create version comparison algorithm
4. Build version timeline UI
5. Implement change percentage calculation
6. Add re-publishing logic

### Phase 4 Action Items:
1. Set up PostgreSQL database
2. Implement JWT authentication
3. Create user registration/login flows
4. Build data migration tool
5. Implement role-based access control
6. Create password reset functionality

### Phase 5 Action Items:
1. Design XP calculation rules
2. Implement level progression system
3. Create XP transaction logging
4. Build level-based AI adaptation
5. Design achievement system
6. Create progress visualization

### Phase 6 Action Items:
1. Implement bubble creation and management
2. Build real-time commenting with WebSockets
3. Create anonymous commenting system
4. Implement peer exercise generation
5. Build moderation tools
6. Create bubble invitation system

### Phase 7 Action Items:
1. Build analytics data collection
2. Create visualization dashboards
3. Implement PWA features
4. Add offline synchronization
5. Enhance AI with advanced features
6. Perform security audit

## Success Metrics

- **User Engagement**: Daily active users, session duration
- **Learning Outcomes**: Exercise completion rates, score improvements
- **Social Interaction**: Comments per draft, peer exercise completion
- **Retention**: 30-day retention, project completion rates
- **Technical**: Page load time <2s, 99.9% uptime

## Risk Mitigation

1. **Data Loss**: Implement redundant backups during LocalStorage → Database migration
2. **Inappropriate Content**: AI content filtering + human moderation tools
3. **Scalability**: Design for horizontal scaling from the start
4. **Privacy**: COPPA/FERPA compliance built into architecture

This PRD provides a clear path from the current prototype to the full vision while maintaining a working product at each phase. Each phase builds upon the previous one, allowing for continuous testing and user feedback.
