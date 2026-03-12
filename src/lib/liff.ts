import liff from '@line/liff'

let initialized = false

export async function initLiff(liffId: string): Promise<void> {
  if (initialized) return
  await liff.init({ liffId })
  initialized = true
}

export function getLiffAccessToken(): string | null {
  return liff.getAccessToken()
}

export async function getLiffProfile() {
  return liff.getProfile()
}

export function isLiffLoggedIn(): boolean {
  return liff.isLoggedIn()
}

export function liffLogin(redirectUri?: string): void {
  liff.login({ redirectUri })
}

export function isInLiffClient(): boolean {
  return liff.isInClient()
}

export { liff }
