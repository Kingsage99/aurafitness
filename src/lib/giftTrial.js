import { supabase } from './supabase'

// Grants (idempotently) the automatic 7-day "gift" Pro trial every new user
// receives the moment onboarding completes, or finalizes their choice once
// it lapses. Both actions run through the gift-trial edge function's
// service-role write path -- profiles has a BEFORE UPDATE trigger
// (protect_billing_columns) that reverts pro_until/subscription_status/
// gift_trial_granted_at for any request not authenticated as service_role,
// so this can never be a direct client `.update()` or a plain `supabase.rpc(...)`.
async function callGiftTrial(action) {
  const { data, error } = await supabase.functions.invoke('gift-trial', { body: { action } })
  if (error) throw new Error(error?.message || `Could not ${action} gift trial`)
  return { proUntil: data?.proUntil || null, status: data?.status || null }
}

export const grantGiftTrial = () => callGiftTrial('grant')
export const declineGiftTrial = () => callGiftTrial('decline')
