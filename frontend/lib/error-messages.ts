/**
 * Maps technical error messages to user-friendly Portuguese messages
 * Returns null for errors that should be silent (e.g., session expired - handled by API)
 */
export function getUserFriendlyErrorMessage(error: unknown): string | null {
  if (!error) {
    return 'Algo deu errado. Tente novamente.'
  }

  const message = error instanceof Error ? error.message : String(error)

  // Session/Auth errors - redirect happens server-side, don't show
  if (message.includes('Session expired') || message.includes('401')) {
    return null // Silent error, redirect handled in API
  }

  // Common auth errors
  if (
    message.includes('Email ou senha') ||
    message.includes('incorrect') ||
    message.includes('Incorrect')
  ) {
    return 'Email ou senha incorretos'
  }

  if (message.includes('Email already exists') || message.includes('email already')) {
    return 'Este email ja está cadastrado'
  }

  if (message.includes('Email invalido')) {
    return 'Email inválido'
  }

  if (
    message.includes('Senha') ||
    message.includes('password') ||
    message.includes('Password')
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
  if (message.includes('Token')) {
    return 'Erro de autenticação. Faça login novamente.'
  }

  // Validation errors - these are usually good to show
  if (message.includes('must') || message.includes('should') || message.includes('deve')) {
    return message
  }

  // If it has technical markers, hide it
  if (message.includes('endpoint') || message.includes('status') || message.includes('(')) {
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

