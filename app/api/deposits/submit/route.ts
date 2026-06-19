/**
 * POST /api/deposits/submit
 *
 * User submits their crypto transaction hash after sending funds.
 * Moves deposit from PENDING → status stays PENDING but payment_reference is set.
 * (Schema uses approval_status enum: PENDING/APPROVED/REJECTED/CANCELLED)
 * The deposit is now visible in the admin queue for approval.
 *
 * Schema column mapping:
 *   payment_reference  ← where we store the tx hash
 *   notes              ← where we store proof URL
 *   metadata           ← where contract_id linkage lives
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/supabase/server";
import { adminClient } from "@/lib/ledger";

export async function POST(req: NextRequest) {
  // 1. Auth
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Parse body
  let body: { deposit_id: string; tx_hash: string; proof_url?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { deposit_id, tx_hash, proof_url } = body;
  if (!deposit_id || !tx_hash) {
    return NextResponse.json(
      { error: "deposit_id and tx_hash are required" },
      { status: 400 }
    );
  }

  // Sanitize tx hash — strip 0x prefix if present, lowercase, validate hex
  const txHashClean = tx_hash.trim().toLowerCase().replace(/^0x/, "");
  if (!/^[0-9a-f]{40,128}$/.test(txHashClean)) {
    return NextResponse.json(
      { error: "tx_hash must be a valid hex transaction hash (40–128 characters)" },
      { status: 400 }
    );
  }

  // 3. Fetch deposit — must belong to this user
  const { data: deposit, error: fetchError } = await adminClient
    .from("wc_deposits")
    .select("id, user_id, status, payment_reference, metadata")
    .eq("id", deposit_id)
    .single();

  if (fetchError || !deposit) {
    return NextResponse.json({ error: "Deposit not found" }, { status: 404 });
  }
  if (deposit.user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Only PENDING deposits can have tx hash submitted
  // (APPROVED and REJECTED are terminal for this action)
  if (deposit.status !== "PENDING") {
    return NextResponse.json(
      { error: `Deposit is already '${deposit.status}' — cannot update` },
      { status: 409 }
    );
  }

  // Already has a tx hash submitted
  if (deposit.payment_reference) {
    return NextResponse.json(
      { error: "A transaction hash has already been submitted for this deposit. Contact support if you need to update it." },
      { status: 409 }
    );
  }

  // 4. Check for duplicate tx hash across all deposits (prevents reuse)
  const { data: duplicate } = await adminClient
    .from("wc_deposits")
    .select("id")
    .eq("payment_reference", txHashClean)
    .maybeSingle();

  if (duplicate) {
    return NextResponse.json(
      { error: "This transaction hash is already linked to another deposit" },
      { status: 409 }
    );
  }

  // 5. Update deposit — payment_reference = tx hash, notes updated with proof URL
  const updatedMetadata = {
    ...(deposit.metadata as object),
    proof_url: proof_url ?? null,
    tx_submitted_at: new Date().toISOString(),
  };

  const { data: updated, error: updateError } = await adminClient
    .from("wc_deposits")
    .update({
      payment_reference: txHashClean,
      notes: proof_url
        ? `TX: ${txHashClean} | Proof: ${proof_url}`
        : `TX: ${txHashClean}`,
      metadata: updatedMetadata,
    })
    .eq("id", deposit_id)
    .select("id, status, payment_reference, updated_at")
    .single();

  if (updateError || !updated) {
    console.error("Deposit submit update error:", updateError);
    return NextResponse.json(
      { error: "Failed to submit transaction hash. Please try again." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    message: "Transaction hash submitted. Your deposit is now queued for admin review.",
    deposit: {
      id: updated.id,
      status: updated.status,
      tx_hash: updated.payment_reference,
      submitted_at: updated.updated_at,
    },
  });
}
