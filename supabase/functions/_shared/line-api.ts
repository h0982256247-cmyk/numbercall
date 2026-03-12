/** 用 LIFF Access Token 向 LINE API 取得使用者 profile */
export async function getLineProfile(accessToken: string) {
  const res = await fetch('https://api.line.me/v2/profile', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) throw new Error('Invalid LINE access token')
  return res.json() as Promise<{
    userId: string
    displayName: string
    pictureUrl?: string
    statusMessage?: string
  }>
}

/** 發送 LINE push message */
export async function sendLinePushMessage(
  channelAccessToken: string,
  lineUserId: string,       // LINE 原生 userId (U1234...)
  messages: LineMessage[],
): Promise<void> {
  const res = await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${channelAccessToken}`,
    },
    body: JSON.stringify({ to: lineUserId, messages }),
  })
  if (!res.ok) {
    const body = await res.text()
    console.error('LINE push failed:', res.status, body)
    // 不 throw：通知失敗不應影響叫號流程
  }
}

type LineMessage =
  | { type: 'text'; text: string }
  | { type: 'flex'; altText: string; contents: unknown }

/** 叫號通知訊息 */
export function buildCalledMessage(eventName: string, queueNumber: number): LineMessage {
  return {
    type: 'flex',
    altText: `📣 輪到你了！#${queueNumber} 號請入場`,
    contents: {
      type: 'bubble',
      size: 'kilo',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#f59e0b',
        paddingAll: 'lg',
        contents: [
          { type: 'text', text: '輪到你了！', color: '#ffffff', weight: 'bold', size: 'xl' },
          { type: 'text', text: eventName, color: '#fef3c7', size: 'sm', wrap: true },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        paddingAll: 'lg',
        contents: [
          {
            type: 'box',
            layout: 'vertical',
            alignItems: 'center',
            contents: [
              { type: 'text', text: '你的號碼', color: '#6b7280', size: 'sm' },
              { type: 'text', text: `#${queueNumber}`, color: '#111827', size: '5xl', weight: 'bold' },
            ],
          },
          {
            type: 'separator',
            margin: 'lg',
          },
          {
            type: 'text',
            text: '請開啟 LINE 點擊「前往入場」完成核銷',
            color: '#6b7280',
            size: 'xs',
            wrap: true,
            margin: 'lg',
            align: 'center',
          },
        ],
      },
    },
  }
}
