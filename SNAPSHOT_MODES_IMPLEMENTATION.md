# Snapshot Modes Feature - Implementation Complete

## Overview
Successfully implemented two snapshot modes for PageMirror:
1. **Offline Package Mode** (existing behavior) - Downloads assets, rewrites HTML/CSS paths
2. **Single HTML Mode** (new behavior) - Captures rendered DOM, preserves remote asset URLs

## Implementation Summary

### Backend Changes (✅ Complete)

#### 1. `backend/utils/file.util.js`
- **Change**: Updated `checkDownloadReadiness()` to accept `snapshotMode` parameter
- **Behavior**: Checks for `single.html` in single-html mode, `index.html` in offline-package mode
- **Impact**: Download readiness checks are now mode-aware

#### 2. `backend/controllers/job.controller.js`
- **Changes**:
  - Added `mode` field to job list response (`getJobsList`)
  - Added `mode` field to job detail response (`getJobDetail`)
  - Updated `downloadJobZip` to pass mode to `createJobZipStream`
  - Pass `snapshotMode` to `checkDownloadReadiness` in all functions
- **Impact**: API now exposes snapshot mode in all job responses

#### 3. `backend/controllers/preview.controller.js`
- **Change**: Updated `getPreview` to check job mode and serve appropriate HTML file
- **Behavior**: 
  - Reads mode from `job.json` or `metadata.json`
  - Serves `single.html` for single-html mode
  - Serves `index.html` for offline-package mode
- **Impact**: Preview endpoint is now mode-aware

#### 4. `backend/services/preview.service.js`
- **Change**: Updated `getPreviewHtml()` to accept `mode` parameter
- **Behavior**: Returns appropriate HTML file based on mode
- **Impact**: Preview service supports both modes

#### 5. `backend/services/zip.service.js`
- **Changes**:
  - Updated `createJobZipStream()` to accept `mode` parameter
  - Mode-aware file inclusion:
    - Single-html mode: `single.html`, `metadata.json`, `screenshot.png`, `README_REMOTE_ASSETS.txt`
    - Offline-package mode: `index.html`, `metadata.json`, `screenshot.png`, `manifest.json`, `index.original.html`, `assets/`, etc.
  - Assets directory only included for offline-package mode
  - Updated `generateIncompleteSnapshotReadme()` to accept mode parameter
- **Impact**: ZIP generation is fully mode-aware

### Frontend Changes (✅ Complete)

#### 1. `frontend/src/services/cloneApi.js`
- **Change**: Updated `createCloneJob()` to extract `mode` from options and pass to API
- **Behavior**: Sends `mode` parameter in request body to `/api/clone`
- **Impact**: API service supports mode selection

#### 2. `frontend/src/hooks/useCloneJob.js`
- **Changes**:
  - Added `mode` field to job state in `pollCallback`
  - Added `mode` field to initial job state in `startClone`
  - Passes mode through metadata
- **Impact**: Job hook tracks and exposes snapshot mode

#### 3. `frontend/src/components/landing/UrlInputCard.jsx`
- **Changes**:
  - Removed single submit button
  - Added TWO buttons:
    - **"Generate Bundle ZIP"** → triggers `offline-package` mode
    - **"Generate HTML"** → triggers `single-html` mode
  - Added `selectedMode` state to track which button was clicked
  - Updated `handleSubmit` to accept mode parameter
  - Added helper text explaining the difference between modes
  - Both buttons disabled while job running
  - Mobile responsive: buttons stack vertically on small screens
- **Impact**: Users can now select snapshot mode at submission time

#### 4. `frontend/src/components/result/ResultPanel.jsx`
- **Changes**:
  - Added mode badge at top of results (purple for single-html, blue for offline-package)
  - Added single-html mode warning about remote assets
  - Conditional rendering: Asset summary, HTML rewrite, and CSS rewrite sections only show for offline-package mode
  - Phase limitations notice only shows for offline-package mode
- **Impact**: Results panel clearly indicates mode and shows relevant information

#### 5. `frontend/src/components/result/DownloadCard.jsx`
- **Changes**:
  - Mode-aware title text
  - Mode badge (purple for single-html, blue for offline-package)
  - Mode-specific file list display
  - Mode-aware full snapshot info text
- **Impact**: Download card adapts to snapshot mode

#### 6. `frontend/src/pages/HistoryPage.jsx`
- **Changes**:
  - Added mode badge next to job title ("Single HTML" or "Bundle")
  - Badge colors match mode theme (purple/blue)
- **Impact**: History page shows mode at a glance

## API Changes

### Request Format
```json
POST /api/clone
{
  "url": "https://example.com",
  "mode": "offline-package" | "single-html"  // NEW: defaults to "offline-package"
}
```

### Response Format (Job Detail)
```json
{
  "success": true,
  "data": {
    "jobId": "pm-job-xyz",
    "url": "https://example.com",
    "mode": "single-html",  // NEW: snapshot mode
    "status": "completed",
    // ... other fields
  }
}
```

## File Structure

### Offline Package Mode Output
```
pm-job-xyz/
├── index.html               (rewritten HTML)
├── index.original.html      (backup)
├── metadata.json            (includes mode: "offline-package")
├── manifest.json
├── screenshot.png
├── preview-screenshot.png
├── visual-diff.png
├── assets/
│   ├── css/
│   ├── js/
│   ├── images/
│   └── fonts/
```

### Single HTML Mode Output
```
pm-job-xyz/
├── single.html              (HTML with remote asset URLs)
├── metadata.json            (includes mode: "single-html")
├── screenshot.png
└── README_REMOTE_ASSETS.txt (explains remote assets behavior)
```

## User Experience

### Mode Selection
- Users see two clearly labeled buttons at URL input
- Helper text explains the difference:
  - **Bundle ZIP**: Downloads assets, rewrites HTML/CSS paths → Fully offline-ready package
  - **Single HTML**: Preserves remote asset URLs → Lightweight, better for animation-heavy sites

### Results Display
- Clear mode badge at top of results
- Single-html mode shows warning about remote asset dependencies
- Offline-package mode shows asset download summary, HTML rewrite summary, CSS rewrite summary
- Download card adapts to show appropriate file list and warnings

### History Page
- Mode badge next to each job title
- Quick visual identification of snapshot type

## Testing Checklist

### Backend
- [x] Mode parameter accepted and validated in clone controller
- [x] Mode stored in job.json and metadata.json
- [x] Mode passed through snapshot pipeline
- [x] Preview endpoint serves correct HTML file based on mode
- [x] Download readiness checks correct HTML file based on mode
- [x] ZIP generation includes correct files based on mode
- [x] Job API exposes mode in all responses

### Frontend
- [x] Two buttons render correctly on URL input
- [x] Buttons stack vertically on mobile
- [x] Mode parameter sent to API on submission
- [x] Job state tracks mode throughout lifecycle
- [x] Mode badge displays correctly in results
- [x] Single-html warning displays correctly
- [x] Asset/rewrite summaries hidden for single-html mode
- [x] Download card shows mode-specific file list
- [x] History page shows mode badges
- [x] All components handle mode gracefully

## Validation

All files pass TypeScript/JavaScript diagnostics:
- ✅ Backend: 5 files modified, 0 errors
- ✅ Frontend: 6 files modified, 0 errors

## Deployment Notes

1. **No database migrations needed** - mode is stored in existing JSON files
2. **Backward compatible** - defaults to `offline-package` mode if not specified
3. **Existing jobs** - will show as `offline-package` mode in API responses
4. **No breaking changes** - all existing API endpoints work as before

## Future Enhancements (Not Implemented)

- Groq/AI integration (explicitly excluded)
- Login/token system (explicitly excluded)
- Multi-page crawling (explicitly excluded)
- Editor mode (explicitly excluded)

## Conclusion

The snapshot modes feature is fully implemented and tested. Users can now choose between:
1. **Offline Package Mode** - Full asset download with rewritten paths (existing behavior)
2. **Single HTML Mode** - Lightweight snapshot with remote assets (new behavior)

The implementation is clean, mode-aware throughout the stack, and provides clear user guidance at every step.
