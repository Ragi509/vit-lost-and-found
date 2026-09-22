/**
 * bootstrap-admin.ts
 * One-time administrative bootstrap CLI script.
 * Run via: pnpm bootstrap-admin
 */

import { createClient } from "@supabase/supabase-js";
import * as readline from "readline";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const setupKey = process.env.ADMIN_BOOTSTRAP_SETUP_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error("Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.");
  process.exit(1);
}

if (!setupKey) {
  console.error("Error: ADMIN_BOOTSTRAP_SETUP_KEY environment variable is required.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function prompt(query: string): Promise<string> {
  return new Promise((resolve) => rl.question(query, resolve));
}

async function run() {
  console.log("\n=== VIT Lost & Found: Admin Bootstrap CLI ===");
  console.log("This is a single-use procedure to create the first approved staff administrator.\n");

  const email = (await prompt("Enter target admin VIT email: ")).trim();
  const department = (await prompt("Enter department (e.g. Campus Security): ")).trim() || "Campus Security";
  const staffId = (await prompt("Enter Staff ID / PRN (e.g. VIT-STAFF-001): ")).trim() || "VIT-STAFF-001";
  rl.close();

  console.log(`\nLooking up user record for: ${email}...`);
  const { data: user, error: userError } = await supabase
    .from("users")
    .select("id, vit_email")
    .eq("vit_email", email)
    .single();

  if (userError || !user) {
    console.error(`User with email "${email}" was not found in the users table.`);
    console.error("Please have the user complete institutional OTP signup once before bootstrapping.");
    process.exit(1);
  }

  console.log(`Found User ID: ${user.id}. Invoking bootstrap_first_admin RPC...`);

  const { data: result, error: rpcError } = await supabase.rpc("bootstrap_first_admin", {
    p_setup_key: setupKey,
    p_target_user_id: user.id,
    p_department: department,
    p_staff_id: staffId,
  });

  if (rpcError) {
    console.error("Bootstrap RPC Error:", rpcError.message);
    process.exit(1);
  }

  console.log("\nSUCCESS!");
  console.log(result.message);
  console.log("Action: Delete or rotate ADMIN_BOOTSTRAP_SETUP_KEY from your local and production environments now.\n");
}

run().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
