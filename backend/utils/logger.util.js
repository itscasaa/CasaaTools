export const logger = {
  info(message) {
    const timestamp = new Date().toISOString()
    console.log(`[${timestamp}] [INFO]: ${message.trim()}`)
  },
  
  warn(message) {
    const timestamp = new Date().toISOString()
    console.warn(`[${timestamp}] [WARN]: ${message.trim()}`)
  },
  
  error(message, errorObject = null) {
    const timestamp = new Date().toISOString()
    console.error(`[${timestamp}] [ERROR]: ${message.trim()}`)
    if (errorObject && errorObject.stack) {
      console.error(errorObject.stack)
    }
  },
  
  stream: {
    write(message) {
      logger.info(message)
    }
  }
}
