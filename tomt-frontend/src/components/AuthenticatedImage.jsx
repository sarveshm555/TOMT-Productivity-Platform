import React, { useEffect, useState } from 'react';

import apiClient from '../api/axiosClient.js';

/**
 * GridFS-backed images (profile logos, later document previews) are served
 * from JWT-protected endpoints - a plain `<img src="...">` can't attach an
 * Authorization header, so the browser would get a 401 instead of the
 * image. This fetches the image through the authenticated axios client and
 * renders it as an object URL instead.
 */
export default function AuthenticatedImage({ src, alt, className, style }) {
  const [objectUrl, setObjectUrl] = useState(null);

  useEffect(() => {
    if (!src) {
      setObjectUrl(null);
      return undefined;
    }

    let cancelled = false;
    let currentUrl = null;

    apiClient
      .get(src, { responseType: 'blob' })
      .then((res) => {
        if (cancelled) return;
        currentUrl = URL.createObjectURL(res.data);
        setObjectUrl(currentUrl);
      })
      .catch(() => {
        if (!cancelled) setObjectUrl(null);
      });

    return () => {
      cancelled = true;
      if (currentUrl) URL.revokeObjectURL(currentUrl);
    };
  }, [src]);

  if (!objectUrl) return null;
  return <img src={objectUrl} alt={alt} className={className} style={style} />;
}
