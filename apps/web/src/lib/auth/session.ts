import { createClient } from "@/lib/supabase/client";

export interface UserSession {
  id: string;
  email: string;
  fullName: string;
  role: "Student" | "Faculty" | "Staff";
  prn: string;
  department: string;
  campus: string;
}

export function parseVitEmail(email: string): { fullName: string; prn: string; role: "Student" | "Staff" } {
  const cleanEmail = email.trim().toLowerCase();
  const localPart = cleanEmail.split("@")[0] || "";

  // Check if staff/security
  if (localPart.includes("security") || localPart.includes("staff") || localPart.includes("admin")) {
    const formatted = localPart
      .split(".")
      .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
      .join(" ");
    return {
      fullName: formatted || "Campus Security Officer",
      prn: "STAFF-" + Math.floor(1000 + Math.random() * 9000),
      role: "Staff",
    };
  }

  // Student format: firstname.lastnameYY e.g. ragini.kengale24
  const digitsMatch = localPart.match(/\d+$/);
  const yearSuffix = digitsMatch ? digitsMatch[0] : "24";
  const namePart = localPart.replace(/\d+$/, "");
  const parts = namePart.split(".").filter(Boolean);

  let fullName = "VIT Student";
  if (parts.length >= 2) {
    fullName = parts
      .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
      .join(" ");
  } else if (parts.length === 1) {
    fullName = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
  }

  const randomHash = Math.abs(
    email.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) % 90000 + 10000
  );
  const prn = `PRN-${yearSuffix}${randomHash}`;

  return { fullName, prn, role: "Student" };
}

export function getStoredSession(): UserSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("vit_user_session");
    if (!raw) return null;
    return JSON.parse(raw) as UserSession;
  } catch (e) {
    return null;
  }
}

export function setStoredSession(session: UserSession): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("vit_user_session", JSON.stringify(session));
    window.dispatchEvent(new Event("vit_session_updated"));
  } catch (e) {
    console.warn("Could not save session to localStorage:", e);
  }
}

export async function syncUserWithSupabase(email: string): Promise<UserSession> {
  const supabase = createClient();
  const parsed = parseVitEmail(email);

  let session: UserSession = {
    id: "user-" + Math.random().toString(36).substring(2, 9),
    email,
    fullName: parsed.fullName,
    role: parsed.role,
    prn: parsed.prn,
    department: "Department of Electronics & Computer Engineering",
    campus: "Bibwewadi Main Campus, Pune",
  };

  try {
    // 1. Check if user already exists in public.users
    const { data: existingUser, error: fetchErr } = await supabase
      .from("users")
      .select("*")
      .eq("vit_email", email)
      .maybeSingle();

    if (existingUser) {
      session = {
        id: existingUser.id,
        email: existingUser.vit_email,
        fullName: existingUser.full_name || parsed.fullName,
        role: (existingUser.role as any) || parsed.role,
        prn: existingUser.id_number || parsed.prn,
        department: "Department of Electronics Engineering",
        campus: "Bibwewadi Main Campus, Pune",
      };
    } else {
      // 2. Insert new user record into public.users
      const newUserId = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : session.id;
      const { data: insertedUser, error: insertErr } = await supabase
        .from("users")
        .insert({
          id: newUserId,
          vit_email: email,
          full_name: parsed.fullName,
          role: parsed.role,
          id_number: parsed.prn,
        })
        .select()
        .single();

      if (insertedUser) {
        session.id = insertedUser.id;
      }
    }
  } catch (err) {
    console.warn("Supabase user sync fallback notice:", err);
  }

  setStoredSession(session);
  return session;
}
