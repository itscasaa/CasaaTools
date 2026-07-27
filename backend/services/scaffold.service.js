import AdmZip from 'adm-zip'
import path from 'path'
import fs from 'fs-extra'
import { nanoid } from 'nanoid'
import { logger } from '../utils/logger.util.js'

// Ensure temporary scaffold directory exists
const getScaffoldsDir = () => path.resolve(process.cwd(), 'output', 'scaffolds')

/**
 * Sends configuration requirements to 9router AI to generate custom tailored project file structures
 * and compiles them into a downloadable ZIP file.
 */
export const generateProjectScaffold = async (options) => {
  const {
    projectName = 'my-project',
    description = '',
    framework = 'React',
    language = 'JavaScript',
    styling = 'Tailwind CSS',
    folders = []
  } = options

  const apiKey = 'sk-a9363991482934a3-3d8b3w-d866ff89'
  const apiBaseUrl = 'https://casaaraksa.duckdns.org/v1'
  const modelName = 'PromntGenerator'

  const systemPrompt = `You are ProjectScaffoldGenerator, a Senior Frontend Architect.
Your task is to generate a clean, empty project directory structure based on the requested stack.
Create essential configuration files (e.g., package.json, vite.config.js or next.config.js, tailwind.config.js, postcss.config.js, tsconfig.json, .gitignore, README.md) with valid, working configurations.
For all other files inside the custom requested folders (like components, pages, hooks, utils, services), the "content" property MUST be a blank empty string "". Do not generate sample boilerplate codes, mock functions, or custom logic to keep response sizes extremely compact and prevent timeouts.

You must output ONLY a valid, parseable JSON object matching this exact schema:
{
  "files": [
    {
      "path": "relative/path/to/file.ext",
      "content": "Boilerplate setup code (ONLY for config files). For component/page/hook source files, set this value to \"\"."
    }
  ]
}
Do not write any markdown code blocks, conversational text, explanations, or notes. Output ONLY the raw JSON string.`

  const userContent = `Generate a project scaffold for a project named "${projectName}" with these requirements:
- **Description**: ${description || 'A modern web project.'}
- **Framework**: ${framework}
- **Language**: ${language} (Use correct file extensions)
- **Styling**: ${styling}
- **Custom folders to structure**: ${folders.join(', ')}

Strict constraints:
1. Do NOT write full component codes or contents.
2. Set "content": "" for all files in custom folders like components, pages, hooks, context, utils, and services.
3. Only provide configurations for configuration setup files (package.json, bundlers, configs).`

  try {
    logger.info(`Sending project scaffold request to 9router using model ${modelName}`)
    const response = await fetch(`${apiBaseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: modelName,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent }
        ],
        temperature: 0.5,
        stream: false
      })
    })

    const rawText = await response.text()

    if (!response.ok) {
      logger.error(`9router API request failed with HTTP status ${response.status}. Raw response text:\n${rawText}`)
      let errMsg = `Failed request to 9router API (status: ${response.status}).`
      try {
        const errObj = JSON.parse(rawText)
        errMsg = errObj?.error?.message || errObj?.message || errMsg
      } catch (e) {}
      throw new Error(errMsg)
    }

    // Try parsing the response JSON
    let scaffoldData = null
    const trimmed = rawText.trim()

    // Helper to normalize different JSON shapes the AI could output
    const normalizeScaffoldData = (data) => {
      if (!data) return null
      
      // Case 1: Direct Array
      if (Array.isArray(data)) {
        return { files: data }
      }
      
      // Case 2: Standard expected object
      if (data.files && Array.isArray(data.files)) {
        return data
      }
      
      // Case 3: Nested under common project keys
      const commonKeys = ['project', 'scaffold', 'structure', 'app']
      for (const key of commonKeys) {
        if (data[key]) {
          if (data[key].files && Array.isArray(data[key].files)) {
            return { files: data[key].files }
          }
          if (Array.isArray(data[key])) {
            return { files: data[key] }
          }
        }
      }
      
      // Case 4: Key-value map of path -> content
      const keys = Object.keys(data)
      if (keys.length > 0 && keys.every(k => typeof data[k] === 'string' || data[k] === null)) {
        return {
          files: keys.map(k => ({
            path: k,
            content: data[k] || ''
          }))
        }
      }

      return null
    }

    let chatCompletion = null
    try {
      chatCompletion = JSON.parse(trimmed)
    } catch (parseErr) {
      // Fallback stream check
      if (trimmed.startsWith('data:')) {
        logger.info('9router returned an SSE stream for scaffold. Parsing...')
        const lines = trimmed.split('\n')
        let fullContent = ''
        for (const line of lines) {
          const lineTrim = line.trim()
          if (lineTrim.startsWith('data:')) {
            const dataStr = lineTrim.slice(5).trim()
            if (dataStr === '[DONE]') continue
            try {
              const parsed = JSON.parse(dataStr)
              const content = parsed.choices?.[0]?.delta?.content || parsed.choices?.[0]?.message?.content || ''
              fullContent += content
            } catch (e) {}
          }
        }
        
        let cleanedContent = fullContent.trim()
        if (cleanedContent.startsWith('```')) {
          const match = cleanedContent.match(/^```(?:json)?([\s\S]+)```$/)
          if (match) cleanedContent = match[1].trim()
        }
        scaffoldData = JSON.parse(cleanedContent)
      } else {
        logger.error(`Failed to parse scaffold standard API response: ${parseErr.message}. Raw AI text was:\n${rawText}`)
        throw new Error('AI response wrapper was not formatted in a valid JSON structure.')
      }
    }

    // Extract completion message content if we successfully parsed standard response wrapper
    if (chatCompletion && chatCompletion.choices && chatCompletion.choices[0]) {
      const content = chatCompletion.choices[0].message?.content || ''
      let cleanedContent = content.trim()
      
      // Strip markdown JSON block ticks if present
      if (cleanedContent.startsWith('```')) {
        const match = cleanedContent.match(/^```(?:json)?([\s\S]+)```$/)
        if (match) cleanedContent = match[1].trim()
      }

      try {
        scaffoldData = JSON.parse(cleanedContent)
      } catch (nestedErr) {
        logger.error(`Failed to parse nested scaffold content JSON: ${nestedErr.message}. Content was:\n${content}`)
        throw new Error('AI generated scaffold content was not valid JSON.')
      }
    }

    // Apply normalizer to align the JSON output
    scaffoldData = normalizeScaffoldData(scaffoldData)

    if (!scaffoldData || !scaffoldData.files || !Array.isArray(scaffoldData.files)) {
      logger.error(`Parsed AI JSON object did not contain a valid file list. Parsed data was: ${JSON.stringify(scaffoldData)}. Raw AI text was:\n${rawText}`)
      throw new Error('AI did not return a valid list of files. Please try again.')
    }

    // 4. Build ZIP file using AdmZip
    const zip = new AdmZip()
    const fileList = []

    for (const file of scaffoldData.files) {
      if (!file.path) continue
      // Ensure path safety by resolving it relatively
      const safeRelativePath = file.path.replace(/^\/+/, '').replace(/\.\.\//g, '')
      zip.addFile(safeRelativePath, Buffer.from(file.content || ''))
      fileList.push(safeRelativePath)
    }

    // Save ZIP to disk under temporary ID
    const scaffoldId = nanoid(12)
    const scaffoldsDir = getScaffoldsDir()
    await fs.ensureDir(scaffoldsDir)

    const zipFilePath = path.join(scaffoldsDir, `${scaffoldId}.zip`)
    await zip.writeZipPromise(zipFilePath)

    logger.info(`Successfully generated project scaffold ZIP at: ${zipFilePath}`)

    return {
      success: true,
      scaffoldId,
      projectName,
      framework,
      language,
      styling,
      fileList
    }
  } catch (err) {
    logger.error(`Error in generateProjectScaffold: ${err.message}`)
    throw new Error(`Failed to generate project structure: ${err.message}`)
  }
}

/**
 * Retrieves the path of a pre-generated scaffold ZIP file
 * @param {string} scaffoldId
 * @returns {Promise<string>}
 */
export const getScaffoldZipPath = async (scaffoldId) => {
  const scaffoldsDir = getScaffoldsDir()
  const zipPath = path.join(scaffoldsDir, `${scaffoldId}.zip`)
  
  if (await fs.pathExists(zipPath)) {
    return zipPath
  }
  
  const error = new Error('Project scaffold file not found.')
  error.statusCode = 404
  throw error
}
