// Log error ke stderr dengan waktu dan konteks (nama controller/fungsi) supaya mudah dilacak di log server
export const logError = (context: string, error: unknown): void => {
  console.error(`[${new Date().toISOString()}] [${context}]`, error)
}

export const logWarn = (context: string, message: string): void => {
  console.warn(`[${new Date().toISOString()}] [${context}] ${message}`)
}
