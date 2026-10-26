// Firebase RTDB REST API client using Database Secret authentication
// Works without requiring serviceAccountKey.json file!

const RTDB_BASE = (
  process.env.FIREBASE_DATABASE_URL ||
  process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL ||
  "https://hackthon-project-e419c-default-rtdb.firebaseio.com"
).replace(/\/$/, "");

const DB_SECRET =
  process.env.FIREBASE_DATABASE_SECRET ||
  "Ngp7JKNhSkHoLtxlDvwrUX7uMTzcZS7inPADcslU";

export const isRtdbConfigured = Boolean(RTDB_BASE && DB_SECRET);

async function rtdbRequest(path, method = "GET", body = null) {
  if (!isRtdbConfigured) return null;
  const cleanPath = path.replace(/^\//, "").replace(/\.json$/, "");
  const url = `${RTDB_BASE}/${cleanPath}.json?auth=${DB_SECRET}`;
  const options = {
    method,
    headers: { "Content-Type": "application/json" },
  };
  if (body !== null && method !== "GET" && method !== "DELETE") {
    options.body = JSON.stringify(body);
  }

  try {
    const res = await fetch(url, options);
    if (!res.ok) {
      const errText = await res.text();
      console.warn(`RTDB ${method} ${cleanPath} returned status ${res.status}:`, errText);
      return null;
    }
    return await res.json();
  } catch (err) {
    console.warn(`RTDB ${method} ${cleanPath} request error:`, err.message);
    return null;
  }
}

export const rtdb = {
  isConfigured: isRtdbConfigured,

  async get(path) {
    return rtdbRequest(path, "GET");
  },

  async set(path, data) {
    return rtdbRequest(path, "PUT", data);
  },

  async update(path, data) {
    return rtdbRequest(path, "PATCH", data);
  },

  async push(path, data) {
    return rtdbRequest(path, "POST", data);
  },

  async delete(path) {
    return rtdbRequest(path, "DELETE");
  },

  // Retrieve an object node as an array of items with { id: key, ...val }
  async getList(path) {
    const data = await rtdbRequest(path, "GET");
    if (!data || typeof data !== "object") return [];
    if (Array.isArray(data)) {
      return data.filter(Boolean);
    }
    return Object.entries(data).map(([id, val]) => ({
      id,
      ...(typeof val === "object" && val !== null ? val : { value: val }),
    }));
  },
};

export default rtdb;
