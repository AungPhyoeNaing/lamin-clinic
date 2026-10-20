export const CONNECTION_ERROR = 'Cannot reach the clinic server. Check your connection or try another network, then retry. / ဆေးခန်းဆာဗာသို့ ချိတ်ဆက်၍ မရပါ။ အင်တာနက် သို့မဟုတ် အခြားကွန်ရက်ဖြင့် ပြန်ကြိုးစားပါ။'

export function withTimeout<T>(task: PromiseLike<T>, milliseconds = 20000, abort?: () => void): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(CONNECTION_ERROR))
      abort?.()
    }, milliseconds)
    Promise.resolve(task).then(value => { clearTimeout(timer); resolve(value) }, cause => { clearTimeout(timer); reject(cause) })
  })
}

/** Bound stalled requests without changing Supabase credentials or permissions. */
export const clinicFetch: typeof fetch = async (input, init) => {
  const controller = new AbortController()
  const signal = init?.signal ?? (input instanceof Request ? input.signal : undefined)
  const cancel = () => controller.abort(signal?.reason)
  if (signal?.aborted) cancel()
  signal?.addEventListener('abort', cancel, { once: true })
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
  const method = init?.method ?? (input instanceof Request ? input.method : 'GET')
  const timeout = url.includes('/storage/v1/object/') && /^(POST|PUT)$/i.test(method) ? 90000 : 15000
  try {
    return await withTimeout(fetch(input, { ...init, signal: controller.signal }), timeout, () => controller.abort())
  } finally { signal?.removeEventListener('abort', cancel) }
}
