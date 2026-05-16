/**
 * Maps technical error messages to user-friendly Portuguese messages
 * Returns null for errors that should be silent (e.g., session expired - handled by API)
 */
export function getUserFriendlyErrorMessage(error: unknown): string | null {
  if (!error) {
    return 'Algo deu errado. Tente novamente.'
  }

  const message = error instanceof Error ? error.message : String(error)
  const cleanedMessage = message.replace(/\s*\([^)]*\/api[^)]*\)$/, '').trim()

  // Session/Auth errors - redirect happens server-side, don't show
  if (cleanedMessage.includes('Session expired')) {
    return null // Silent error, redirect handled in API
  }

  // Common auth errors
  if (
    cleanedMessage.includes('Email ou senha') ||
    cleanedMessage.includes('Invalid credentials') ||
    cleanedMessage.includes('Credenciais invalidas') ||
    cleanedMessage.includes('incorrect') ||
    cleanedMessage.includes('Incorrect')
  ) {
    return 'Email ou senha incorretos'
  }

  if (cleanedMessage.includes('Email already exists') || cleanedMessage.includes('email already')) {
    return 'Este email ja está cadastrado'
  }

  if (cleanedMessage.includes('Email invalido')) {
    return 'Email inválido'
  }

  if (
    cleanedMessage.includes('Senha') ||
    cleanedMessage.includes('password') ||
    cleanedMessage.includes('Password')
  ) {
    return 'Erro com a senha. Tente novamente.'
  }

  // Network errors
  if (
    message.includes('Network request failed') ||
    message.includes('Failed to fetch') ||
    message.includes('ERR_')
  ) {
    return 'Erro de conexão. Verifique sua internet e tente novamente.'
  }

  // 403, 404, 5xx status errors - don't expose
  if (
    message.match(/\(40[34]\)|500|502|503/) ||
    message.includes('not found') ||
    message.includes('forbidden')
  ) {
    return 'Algo deu errado. Tente novamente mais tarde.'
  }

  // Token/auth specific
  if (cleanedMessage.includes('Token')) {
    return 'Erro de autenticação. Faça login novamente.'
  }

  // Validation errors - these are usually good to show
  if (
    cleanedMessage.includes('must') ||
    cleanedMessage.includes('should') ||
    cleanedMessage.includes('deve')
  ) {
    return cleanedMessage
  }

  // If it has technical markers, hide it
  if (cleanedMessage.includes('endpoint') || cleanedMessage.includes('status') || cleanedMessage.includes('(')) {
    return 'Algo deu errado. Tente novamente.'
  }

  // For messages that seem safe to show (validation, specific server messages)
  // Only show if it's a short, user-facing message
  if (message.length < 100) {
    return message
  }

  // Default fallback
  return 'Algo deu errado. Tente novamente.'
}

