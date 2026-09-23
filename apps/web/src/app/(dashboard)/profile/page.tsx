"use client";

import React, { useState, useEffect } from "react";
import { User, ShieldCheck, Moon, Sun, Bell, CheckCircle2, History, Building2, Edit3, Save, Check, LogOut } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Input } from "@vit/ui";
import { ThemeToggle } from "@/components/ThemeToggle";
import { getStoredSession, setStoredSession, clearStoredSession, UserSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/client";

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserSession | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<UserSession | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

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
            window.location.href = "/login?redirect=/profile";
          }
        })
        .catch(() => {
          window.location.href = "/login?redirect=/profile";
        });
    }
  }, []);

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
      <div className="max-w-3xl mx-auto py-12 text-center text-sm text-slate-500">
        Loading profile credentials...
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
            Student Profile & Identity
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Verified institutional credentials and recovery preferences.
          </p>
        </div>

        <button
          onClick={() => {
            if (isEditing) {
              setEditForm(profile);
            }
            setIsEditing(!isEditing);
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          <Edit3 className="w-3.5 h-3.5" />
          <span>{isEditing ? "Cancel Editing" : "Edit Profile"}</span>
        </button>
      </div>

      {saveMessage && (
        <div className="p-3.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-xs text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{saveMessage}</span>
        </div>
      )}

      {/* Identity Card */}
      <Card className="border-border">
        <CardHeader className="flex flex-row items-center gap-4 pb-4">
          <div className="w-16 h-16 rounded-full bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 flex items-center justify-center font-bold text-xl shadow-md">
            {getInitials(profile.fullName)}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-xl">{profile.fullName}</CardTitle>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-teal-100 text-teal-900 dark:bg-teal-950 dark:text-teal-300">
                {profile.role}
              </span>
            </div>
            <CardDescription className="text-xs mt-0.5">{profile.email}</CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 pt-2 border-t border-border text-xs">
          {!isEditing ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-border">
                  <span className="text-slate-400 block font-semibold uppercase text-[10px] mb-0.5">
                    Institutional ID / PRN
                  </span>
                  <span className="text-foreground font-mono font-medium">{profile.prn}</span>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-border">
                  <span className="text-slate-400 block font-semibold uppercase text-[10px] mb-0.5">
                    Campus Location
                  </span>
                  <span className="text-foreground font-medium">{profile.campus}</span>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-border">
                <span className="text-slate-400 block font-semibold uppercase text-[10px] mb-0.5">
                  Academic Department
                </span>
                <span className="text-foreground font-medium">{profile.department}</span>
              </div>
            </>
          ) : (
            <form onSubmit={handleSaveProfile} className="space-y-4 pt-2">
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
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
                  <span>Cancel</span>
                </Button>
                <Button type="submit" variant="primary" size="sm">
                  <Save className="w-3.5 h-3.5 mr-1" />
                  <span>Save Changes</span>
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      {/* Recovery Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="p-4 border-border flex items-center gap-4">
          <div className="p-3 rounded-xl bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300">
            <History className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-muted-foreground font-medium">Active Submissions</span>
            <h4 className="text-xl font-bold text-foreground">1 report</h4>
          </div>
        </Card>

        <Card className="p-4 border-border flex items-center gap-4">
          <div className="p-3 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-muted-foreground font-medium">Belongings Recovered</span>
            <h4 className="text-xl font-bold text-foreground">42 items returned</h4>
          </div>
        </Card>
      </div>

      {/* System Preferences & Theme */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">System Preferences</CardTitle>
          <CardDescription className="text-xs">Configure theme appearance and alert notifications.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-xs">
          <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-card">
            <div>
              <span className="font-semibold text-foreground block">Appearance Mode</span>
              <span className="text-muted-foreground text-[11px]">
                Toggle between light and dark charcoal themes (WCAG AA compliant).
              </span>
            </div>
            <ThemeToggle />
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-card">
            <div>
              <span className="font-semibold text-foreground block">Match Alerts & Push Notifications</span>
              <span className="text-muted-foreground text-[11px]">
                Receive instant browser push notifications when a candidate match is found.
              </span>
            </div>
            <button
              onClick={() => setNotificationsEnabled(!notificationsEnabled)}
              className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                notificationsEnabled ? "bg-teal-600" : "bg-slate-300 dark:bg-slate-700"
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
              className="w-full text-red-600 border-red-200 hover:bg-red-50 dark:border-red-900/50 dark:hover:bg-red-950/30"
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
