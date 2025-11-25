# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Google Apps Script project that implements a Gmail Add-on for AI-powered email responses using OpenAI's Assistant API. The add-on adds a "✨ KI-Antwort" button directly in Gmail's compose toolbar that inserts AI-generated reply text based on email thread context. Users can optionally provide bullet points that are integrated into the AI response.

## Technology Stack

- **Platform**: Google Apps Script (V8 runtime)
- **Language**: JavaScript (Google Apps Script flavor)
- **APIs**:
  - Gmail API (via GmailApp service)
  - OpenAI Assistant API v2 (via UrlFetchApp)
  - CardService (for Gmail Add-on UI)
- **Storage**: PropertiesService, CacheService, LockService

## Performance Optimizations

The add-on includes several performance optimizations for faster response times:

1. **Adaptive Polling**: Uses faster intervals (500ms → 1s → 2s) for checking completion status, reducing latency for quick responses
2. **Reduced Context Window**: Limits thread history to last 3 messages (max 1500 chars each) instead of entire thread, reducing token count by ~60%
3. **Model Selection**: Users can choose between:
   - **⚡ Ultra-Fast Mode (gpt-4.1-nano)**: 2-5 second response time, maximum speed
   - **🎯 Fast Mode (gpt-4.1-mini)**: 3-8 second response time, balanced performance
4. **Performance Logging**: Tracks completion times in logs for monitoring

Expected improvements: 50-80% faster response times compared to baseline.

## Architecture

### Core Components

1. **UI Layer** (`buildMessageCard`, `showSettings`)
   - CardService-based UI rendered in Gmail sidebar
   - Settings dialog for OpenAI API key and Assistant ID configuration
   - Status display showing configuration state

2. **Compose Action** (`insertAITextToCompose`, `generateAIResponse`)
   - Main entry point triggered by "✨ KI-Antwort" button in compose toolbar
   - Shows dialog for optional user notes/bullet points input
   - Implements 3-tier duplicate request prevention system
   - Extracts thread context and generates AI response
   - User notes are passed as `additional_instructions` to OpenAI Assistant (not as thread messages)
   - Inserts generated text into active compose window

3. **Thread Processing** (`extractThreadHistory`)
   - Retrieves email thread messages from Gmail
   - Builds chronological history with sender, date, subject, body
   - Marks target message for AI to respond to

4. **OpenAI Integration** (helper functions)
   - `createOpenAIThread`: Creates OpenAI conversation thread
   - `addMessageToThread`: Sends email context to OpenAI
   - `runAssistant`: Executes configured OpenAI Assistant with optional `additional_instructions` parameter
   - `waitForCompletion`: Polls for completion with timeout (30s)
   - `getThreadMessages`: Retrieves AI-generated response

5. **User Notes Feature** (`generateAIResponse`)
   - Optional bullet points/notes can be provided via dialog
   - Notes are passed as `additional_instructions` parameter to OpenAI API (NOT as thread messages)
   - This ensures notes are treated as content directives, not as conversation messages
   - AI integrates notes naturally into the email response

### Critical Systems

**3-Tier Duplicate Prevention System** (lines 157-196 in Code.gs):
1. **CacheService**: Fast initial check (15-second blocking window)
2. **LockService**: Prevents parallel execution across requests
3. **PropertiesService**: Persistent tracking of processed requests

This system prevents Gmail's internal behavior of triggering multiple duplicate API calls from causing double text insertion.

**Thread Identification** (lines 198-218):
- Uses subject + recipient to search for matching Gmail thread
- Removes "Re:" prefix for accurate matching
- Falls back gracefully with error messages if thread not found

## Development Workflow

### Testing Changes

Since this is a Google Apps Script project, development happens directly in the Apps Script editor:

1. Open [script.google.com](https://script.google.com)
2. Navigate to the "Gmail AI Assistant" project
3. Make changes to `Code.gs` or `appsscript.json`
4. Click Save (Ctrl+S)
5. Deploy as Test Deployment: **Deploy** → **Test deployments** → **Install**
6. Test in Gmail by opening an email and clicking the add-on icon
7. Check logs: **Executions** menu in Apps Script editor

### Debugging

- Use `Logger.log()` for debugging output
- View logs in Apps Script editor: **Executions** menu
- Check for errors in the execution transcript
- Test with simple email threads first before complex scenarios

### Deployment

**Test Deployment**: For personal testing
- **Deploy** → **Test deployments** → **Install**

**Production Deployment**: For team/domain-wide distribution
- **Deploy** → **New deployment** → Type: "Add-on"
- Configure visibility and install via Google Workspace Admin Console

## Configuration Requirements

Before the add-on functions, users must configure:

1. **OpenAI API Key** (format: `sk-...`)
   - Stored in UserProperties under key `OPENAI_API_KEY`
   - Get from [platform.openai.com/api-keys](https://platform.openai.com/api-keys)

2. **OpenAI Assistant ID** (format: `asst_...`)
   - Stored in UserProperties under key `OPENAI_ASSISTANT_ID`
   - Create Assistant at [platform.openai.com/assistants](https://platform.openai.com/assistants)
   - Recommended model: gpt-4o or gpt-4-turbo (can be overridden by Model Type setting)
   - See `prompt.txt` for recommended instructions
   - Instructions should specify: German language, professional tone, no subject line, mandatory greeting and closing
   - **CRITICAL**: All generated emails MUST include context-appropriate greeting (e.g., "Guten Tag...") and closing (e.g., "Viele Grüße", "Mit freundlichen Grüßen")

3. **Model Type** (optional, default: 'nano')
   - Stored in UserProperties under key `OPENAI_MODEL_TYPE`
   - Options: 'nano' (gpt-4.1-nano) or 'mini' (gpt-4.1-mini)
   - Can be changed in Settings dialog
   - Selected model overrides the Assistant's model setting for optimized performance

## OAuth Scopes

Required scopes (defined in appsscript.json:8-14):
- `gmail.addons.execute` - Add-on execution
- `gmail.addons.current.message.metadata` - Access subject, recipients from event
- `gmail.addons.current.action.compose` - Compose actions and draft updates
- `gmail.readonly` - Search for threads and read messages
- `gmail.compose` - Insert text into compose window
- `script.external_request` - Call OpenAI API

## Common Issues

**"DUPLICATE_REQUEST_IGNORED" in logs**: Expected behavior, duplicate prevention working correctly

**"Kein passender E-Mail-Thread gefunden"**: Thread search failed - happens with brand new emails without history or when subject/recipient don't match existing threads

**"Timeout: Assistant hat zu lange gebraucht"**: OpenAI Assistant took >30 seconds - consider using faster model or simplifying instructions

**Text inserted twice**: Should not happen due to 3-tier protection, but if it does, indicates all three protection layers failed - check logs for errors

**AI responds TO user notes instead of integrating them**: Check that `runAssistant()` properly passes `additional_instructions` parameter - notes must NOT be added as separate thread messages

## Email Format Requirements

**Greeting and Closing (MANDATORY)**:
All generated emails must follow this structure:
1. **Greeting**: Context-appropriate salutation based on thread history and sender
   - Formal: "Sehr geehrte/r Frau/Herr [Name],"
   - Neutral-professional: "Guten Tag Frau/Herr [Name]," (default)
   - Informal: "Hallo [Vorname]," (when using "Du" form)
2. **Body**: Main email content
3. **Closing**: Matching sign-off followed by sender's name on new line
   - Formal: "Mit freundlichen Grüßen" + [newline] + [Name]
   - Neutral: "Viele Grüße" + [newline] + [Name] (default)
   - Informal: "Beste Grüße" / "Liebe Grüße" + [newline] + [Name]
   - **Name extraction**: AI extracts sender's name from thread history (how it was used in previous emails)
   - For new emails: AI uses contextually appropriate name

The AI analyzes thread history for formality level (Du/Sie) and sender name, adapting automatically.

## Key Constraints

- Maximum 30-second timeout for OpenAI API calls (Apps Script limit)
- Email body truncated to 2000 characters per message for context (to stay within token limits)
- 15-second blocking window for duplicate requests
- Thread search limited to 5 most recent results
- No automatic sending - user must manually review and send
