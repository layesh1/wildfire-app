/**
 * Request a GPS fix with high accuracy. Retries once if accuracy is poor (common indoors / first fix).
 */
export function getBestGeolocationPosition(options?: {
  timeoutMs?: number
  /** If accuracy (meters) is worse than this, retry once after a short delay */
  maxAcceptableAccuracyM?: number
}): Promise<GeolocationPosition> {
  const timeoutMs = options?.timeoutMs ?? 28_000
  const maxAcceptableAccuracyM = options?.maxAcceptableAccuracyM ?? 80

  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new Error('Geolocation not supported'))
      return
    }

    const geoOpts: PositionOptions = {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: timeoutMs,
    }

    function read(pos: GeolocationPosition) {
      const acc = pos.coords.accuracy
      return typeof acc === 'number' && Number.isFinite(acc) ? acc : 9999
    }

    navigator.geolocation.getCurrentPosition(
      pos1 => {
        if (read(pos1) <= maxAcceptableAccuracyM) {
          resolve(pos1)
          return
        }
        window.setTimeout(() => {
          navigator.geolocation.getCurrentPosition(
            pos2 => {
              resolve(read(pos2) <= read(pos1) ? pos2 : pos1)
            },
            () => resolve(pos1),
            geoOpts
          )
        }, 600)
      },
      err => reject(err),
      geoOpts
    )
  })
}
