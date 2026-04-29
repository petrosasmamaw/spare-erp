const DEFAULT_API_ORIGIN = "http://localhost:4000";

function normalizeApiOrigin(value) {
  if (!value) {
    return DEFAULT_API_ORIGIN;
  }

  return value.replace(/\/api\/?$/, "").replace(/\/$/, "");
}

const API_ROOT = `${normalizeApiOrigin(process.env.NEXT_PUBLIC_API_URL)}/api`;

export async function apiRequest(path, options = {}) {
  const res = await fetch(`${API_ROOT}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  let data;
  try {
    data = await res.json();
  } catch (_error) {
    data = null;
  }

  if (!res.ok) {
    const message = data?.error || "Request failed";
    throw new Error(message);
  }

  return data;
}

export { API_ROOT };
