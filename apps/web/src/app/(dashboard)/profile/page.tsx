"use client";

import React, { useState, useEffect } from "react";
import { User, ShieldCheck, Moon, Sun, Bell, CheckCircle2, History, Building2, Edit3, Save, Check, LogOut, Sparkles } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Input } from "@vit/ui";
import { ThemeToggle } from "@/components/ThemeToggle";
import { getStoredSession, setStoredSession, clearStoredSession, UserSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/client";

const DEMO_STUDENT_PROFILE: UserSession = {
  id: "6a426f9d-091d-4acf-972c-9e9857175c4c",
  email: "ragini.kengale24@vit.edu",
  fullName: "Ragini Kengale",
  prn: "PRN-24108924",
  role: "Student",
  department: "Electronics & Telecommunication",
  campus: "Bibwewadi & Kondhwa",
};

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserSession | null>(DEMO_STUDENT_PROFILE);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<UserSession | null>(DEMO_STUDENT_PROFILE);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const [userReportCount, setUserReportCount] = useState<number>(2);
  const [userRecoveredCount, setUserRecoveredCount] = useState<number>(1);

  useEffect(() => {
    const session = getStoredSession();
    if (session) {
      setProfile(session);
      setEditForm(session);
    } else {
      fetch("/api/auth/me")
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.session) {
            setProfile(data.session);
            setEditForm(data.session);
            setStoredSession(data.session);
          } else {
            setProfile(DEMO_STUDENT_PROFILE);
            setEditForm(DEMO_STUDENT_PROFILE);
          }
        })
        .catch(() => {
          setProfile(DEMO_STUDENT_PROFILE);
          setEditForm(DEMO_STUDENT_PROFILE);
        });
    }
  }, []);

  useEffect(() => {
    if (!profile?.id && !profile?.email) return;
    const fetchUserStats = async () => {
      try {
        const queryParams = new URLSearchParams();
        if (profile?.id) queryParams.set("userId", profile.id);
        if (profile?.email) queryParams.set("email", profile.email);
        const res = await fetch(`/api/reports?${queryParams.toString()}`);
        if (res.ok) {
          const data = await res.json();
          const userReports = data.reports || [];
          setUserReportCount(userReports.filter((r: any) => r.status !== "recovered").length);
          setUserRecoveredCount(userReports.filter((r: any) => r.status === "recovered").length);
        }
      } catch (e) {
        console.warn("User stats fetch notice:", e);
      }
    };
    fetchUserStats();
  }, [profile?.id, profile?.email]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm) return;
    setProfile(editForm);
    setStoredSession(editForm);
    setIsEditing(false);

    // Persist to Supabase public.users if connected
    try {
      const supabase = createClient();
      await supabase
        .from("users")
        .update({
          full_name: editForm.fullName,
          id_number: editForm.prn,
        })
        .eq("vit_email", editForm.email);
    } catch (err) {
      console.warn("Supabase user update notice:", err);
    }

    setSaveMessage("Profile credentials updated successfully.");
    setTimeout(() => setSaveMessage(null), 3000);
  };

  const getInitials = (name: string) => {
    if (!name) return "VIT";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  if (!profile) {
    return (
      <div className="max-w-3xl mx-auto py-16 text-center text-[#718096]">
        <div className="w-8 h-8 rounded-full border-2 border-[#23395B] border-t-transparent animate-spin mx-auto mb-3" />
        <p className="text-sm font-medium">Loading profile credentials...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200/60 dark:border-slate-800/60">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#202B3C] dark:text-slate-100">
            Student Profile & Identity
          </h1>
          <p className="text-sm text-[#718096] dark:text-slate-400 mt-1">
            Verified institutional credentials and campus recovery preferences.
          </p>
        </div>

        <button
          onClick={() => {
            if (isEditing) {
              setEditForm(profile);
            }
            setIsEditing(!isEditing);
          }}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-[#202B3C] dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-xs"
        >
          <Edit3 className="w-3.5 h-3.5 text-[#3A7D80]" />
          <span>{isEditing ? "Cancel Editing" : "Edit Profile"}</span>
        </button>
      </div>

      {saveMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-xs text-emerald-900 dark:text-emerald-200 flex items-center gap-2 shadow-xs">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{saveMessage}</span>
        </div>
      )}

      {/* Identity Card */}
      <Card className="rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        <CardHeader className="flex flex-row items-center gap-4 p-6 bg-gradient-to-r from-slate-50/70 to-white dark:from-slate-900/60 dark:to-slate-900 border-b border-slate-100 dark:border-slate-800">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#23395B] to-[#3A7D80] text-white flex items-center justify-center font-bold text-xl shadow-md shrink-0">
            {getInitials(profile.fullName)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle className="text-xl font-bold text-[#202B3C] dark:text-slate-100 truncate">
                {profile.fullName}
              </CardTitle>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-teal-100 text-[#3A7D80] dark:bg-teal-950 dark:text-teal-300 border border-teal-200/60 dark:border-teal-800">
                {profile.role}
              </span>
            </div>
            <CardDescription className="text-xs text-[#718096] dark:text-slate-400 mt-1 truncate">
              {profile.email}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-4 text-xs">
          {!isEditing ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800">
                  <span className="text-[#718096] block font-semibold uppercase text-[10px] tracking-wider mb-1">
                    Institutional ID / PRN
                  </span>
                  <span className="text-[#202B3C] dark:text-slate-100 font-mono font-bold text-sm">{profile.prn}</span>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800">
                  <span className="text-[#718096] block font-semibold uppercase text-[10px] tracking-wider mb-1">
                    Campus Location
                  </span>
                  <span className="text-[#202B3C] dark:text-slate-100 font-semibold">{profile.campus}</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800">
                <span className="text-[#718096] block font-semibold uppercase text-[10px] tracking-wider mb-1">
                  Academic Department
                </span>
                <span className="text-[#202B3C] dark:text-slate-100 font-semibold">{profile.department}</span>
              </div>
            </>
          ) : (
            <form onSubmit={handleSaveProfile} className="space-y-4 pt-1">
              <Input
                label="Full Name"
                id="editFullName"
                value={editForm?.fullName || profile.fullName}
                onChange={(e) => setEditForm({ ...(editForm || profile), fullName: e.target.value })}
                required
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="PRN / ID Number"
                  id="editPrn"
                  value={editForm?.prn || profile.prn}
                  onChange={(e) => setEditForm({ ...(editForm || profile), prn: e.target.value })}
                  required
                />
                <Input
                  label="Campus Location"
                  id="editCampus"
                  value={editForm?.campus || profile.campus}
                  onChange={(e) => setEditForm({ ...(editForm || profile), campus: e.target.value })}
                  required
                />
              </div>
              <Input
                label="Department"
                id="editDepartment"
                value={editForm?.department || profile.department}
                onChange={(e) => setEditForm({ ...(editForm || profile), department: e.target.value })}
                required
              />
              <div className="flex justify-end gap-2.5 pt-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => setIsEditing(false)} className="rounded-xl">
                  <span>Cancel</span>
                </Button>
                <Button type="submit" variant="primary" size="sm" className="rounded-xl shadow-xs">
                  <Save className="w-3.5 h-3.5 mr-1.5" />
                  <span>Save Changes</span>
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      {/* Recovery Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex items-center gap-4 shadow-xs">
          <div className="p-3.5 rounded-xl bg-teal-100 dark:bg-teal-950/60 text-[#3A7D80] dark:text-teal-300">
            <History className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-[#718096] font-semibold uppercase tracking-wider">Active Submissions</span>
            <h4 className="text-2xl font-extrabold text-[#202B3C] dark:text-slate-100 mt-0.5">{userReportCount} {userReportCount === 1 ? 'report' : 'reports'}</h4>
          </div>
        </Card>

        <Card className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex items-center gap-4 shadow-xs">
          <div className="p-3.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-[#718096] font-semibold uppercase tracking-wider">Belongings Recovered</span>
            <h4 className="text-2xl font-extrabold text-[#202B3C] dark:text-slate-100 mt-0.5">{userRecoveredCount} {userRecoveredCount === 1 ? 'item returned' : 'items returned'}</h4>
          </div>
        </Card>
      </div>

      {/* System Preferences & Theme */}
      <Card className="rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800 p-6">
          <CardTitle className="text-base font-bold text-[#202B3C] dark:text-slate-100">System Preferences</CardTitle>
          <CardDescription className="text-xs text-[#718096]">Configure theme appearance and alert notifications.</CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-4 text-xs">
          <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200/60 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
            <div>
              <span className="font-bold text-[#202B3C] dark:text-slate-100 block">Appearance Mode</span>
              <span className="text-[#718096] dark:text-slate-400 text-[11px]">
                Toggle between light and dark charcoal themes (WCAG AA compliant).
              </span>
            </div>
            <ThemeToggle />
          </div>

          <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200/60 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
            <div>
              <span className="font-bold text-[#202B3C] dark:text-slate-100 block">Match Alerts & Push Notifications</span>
              <span className="text-[#718096] dark:text-slate-400 text-[11px]">
                Receive instant browser notifications when a candidate match is found.
              </span>
            </div>
            <button
              onClick={() => setNotificationsEnabled(!notificationsEnabled)}
              className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                notificationsEnabled ? "bg-[#3A7D80]" : "bg-slate-300 dark:bg-slate-700"
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  notificationsEnabled ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          <div className="pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                clearStoredSession();
                window.location.href = "/login";
              }}
              className="w-full text-red-600 border-red-200 hover:bg-red-50 dark:border-red-900/50 dark:hover:bg-red-950/30 rounded-xl"
            >
              <LogOut className="w-4 h-4 mr-2" />
              <span>Sign Out of Campus Session</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
