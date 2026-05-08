const AUTH_BACKEND_URL =
  process.env.AUTH_BACKEND_URL ||
  process.env.NEXT_PUBLIC_AUTH_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:4000";

async function proxyAuth(request, paramsPromise) {
  const params = await paramsPromise;
  const pathParts = params?.all || [];
  const search = new URL(request.url).search;
  const targetUrl = `${AUTH_BACKEND_URL.replace(/\/$/, "")}/api/auth/${pathParts.join("/")}${search}`;

  const headers = new Headers(request.headers);
  headers.delete("host");

  const method = request.method.toUpperCase();
  const hasBody = method !== "GET" && method !== "HEAD";

  const response = await fetch(targetUrl, {
    method,
    headers,
    body: hasBody ? request.body : undefined,
    duplex: hasBody ? "half" : undefined,
    redirect: "manual",
  });

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}

export async function GET(request, context) {
  return proxyAuth(request, context.params);
}

export async function POST(request, context) {
  return proxyAuth(request, context.params);
}

export async function PUT(request, context) {
  return proxyAuth(request, context.params);
}

export async function PATCH(request, context) {
  return proxyAuth(request, context.params);
}

export async function DELETE(request, context) {
  return proxyAuth(request, context.params);
}

export async function OPTIONS(request, context) {
  return proxyAuth(request, context.params);
}
