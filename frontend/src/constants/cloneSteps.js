export const cloneSteps = [
  { id: 'validating_url', label: 'Validating URL', description: 'Checking for protocol, format, and blocking internal/SSRF addresses.' },
  { id: 'launching_browser', label: 'Launching Browser', description: 'Initializing headless browser context safely.' },
  { id: 'rendering_page', label: 'Rendering Page', description: 'Loading page elements, scripts, and resolving lazy loaded items.' },
  { id: 'capturing_dom', label: 'Capturing DOM', description: 'Grabbing full static DOM hierarchy after page render.' },
  { id: 'collecting_assets', label: 'Collecting Assets', description: 'Parsing nodes to identify scripts, sheets, images, and fonts.' },
  { id: 'rewriting_paths', label: 'Rewriting Paths', description: 'Translating references to map to local folder locations.' },
  { id: 'building_zip', label: 'Building ZIP Archive', description: 'Compressing assets, snapshot HTML, and metadata.' },
  { id: 'ready', label: 'Snapshot Ready', description: 'ZIP and screenshot packaged and available for download.' }
]
