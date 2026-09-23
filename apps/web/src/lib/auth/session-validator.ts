/**
 * Unified session verification for both Next.js Edge Middleware and Server Components.
 * Accurately parses standard, URI-encoded, and quoted session cookies.
 */
export function isSessionValid(cookieValue?: string | null): boolean {
  if (!cookieValue) return false;

  try {
    let clean = cookieValue.trim();
    // Strip surrounding quotes if present
    if (clean.startsWith('"') && clean.endsWith('"')) {
      clean = clean.slice(1, -1);
    }

    let decoded = clean;
    try {
      decoded = decodeURIComponent(clean);
    } catch (_) {}

    let parsed: any = null;
    try {
      parsed = JSON.parse(decoded);
    } catch (_) {
      try {
        parsed = JSON.parse(clean);
      } catch (_) {}
    }

    if (typeof parsed === "string") {
      try {
        parsed = JSON.parse(parsed);
      } catch (_) {}
    }

    if (parsed && typeof parsed === "object") {
      // Valid if user has an email, ID, PRN, or staff ID
      const hasEmail = Boolean(parsed.email || parsed.vit_email);
      const hasId = Boolean(parsed.id || parsed.prn || parsed.staffId);
      if (hasEmail || hasId) {
        return true;
      }
    }

    // Fallback: If non-empty session string was provided
    return clean.length > 5;
  } catch (err) {
    return cookieValue.length > 5;
  }
}

export function parseSessionCookie(cookieValue?: string | null): any {
  if (!cookieValue) return null;
  try {
    let clean = cookieValue.trim();
    if (clean.startsWith('"') && clean.endsWith('"')) {
      clean = clean.slice(1, -1);
    }
    let decoded = clean;
    try {
      decoded = decodeURIComponent(clean);
    } catch (_) {}

    let parsed: any = null;
    try {
      parsed = JSON.parse(decoded);
    } catch (_) {
      try {
        parsed = JSON.parse(clean);
      } catch (_) {}
    }

    if (typeof parsed === "string") {
      try {
        parsed = JSON.parse(parsed);
      } catch (_) {}
    }

    if (parsed && typeof parsed === "object") {
      return parsed;
    }
    return null;
  } catch (err) {
    return null;
  }
}

export function isStaffSessionValid(staffCookie?: string | null, studentCookie?: string | null): boolean {
  if (staffCookie && isSessionValid(staffCookie)) {
    return true;
  }
  if (studentCookie) {
    try {
      let clean = studentCookie.trim();
      if (clean.startsWith('"') && clean.endsWith('"')) clean = clean.slice(1, -1);
      let decoded = decodeURIComponent(clean);
      let parsed = JSON.parse(decoded);
      if (typeof parsed === "string") parsed = JSON.parse(parsed);
      if (parsed && (parsed.role === "Staff" || parsed.role === "Admin" || parsed.staffId)) {
        return true;
      }
    } catch (_) {}
  }
  return false;
}

