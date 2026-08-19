import type {
  AnalyticsSummary,
  ChatTurnResponse,
  CoachingSuggestion,
  KnowledgeDocument,
  Report,
  RetrievedChunk,
  Session,
  SessionConfig,
  Settings,
} from "./types";

export const mockSessions: Session[] = [
  {
    id: "sess_a91k2",
    config: {
      mode: "simulator",
      persona: "Angry",
      scenario: "Refund dispute — order arrived damaged",
      product: "Orbit Wireless Earbuds",
      difficulty: "Hard",
      language: "English",
    },
    started_at: new Date(Date.now() - 1000 * 60 * 26).toISOString(),
    status: "active",
    turn_count: 8,
    resolution_score: null,
  },
  {
    id: "sess_88f0x",
    config: {
      mode: "manual",
      persona: "Technical",
      scenario: "Payment failure — card charged twice",
      product: "Clario Developer Platform",
      difficulty: "Expert",
      language: "English",
    },
    started_at: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    status: "completed",
    turn_count: 14,
    resolution_score: 87,
  },
  {
    id: "sess_770cd",
    config: {
      mode: "simulator",
      persona: "Confused",
      scenario: "Account locked after failed password reset",
      product: "Clario Web App",
      difficulty: "Easy",
      language: "English",
    },
    started_at: new Date(Date.now() - 1000 * 60 * 60 * 20).toISOString(),
    status: "completed",
    turn_count: 6,
    resolution_score: 92,
  },
  {
    id: "sess_5511a",
    config: {
      mode: "replay",
      persona: "VIP Customer",
      scenario: "Delayed delivery — enterprise order overdue",
      product: "Clario Enterprise",
      difficulty: "Expert",
      language: "English",
    },
    started_at: new Date(Date.now() - 1000 * 60 * 60 * 40).toISOString(),
    status: "completed",
    turn_count: 22,
    resolution_score: 74,
  },
];

/** Sessions created at runtime so history / past conversations stay in sync. */
export function registerMockSession(session: Session) {
  mockSessions.unshift(session);
  sessionConfigs.set(session.id, session.config);
}

const sessionConfigs = new Map<string, SessionConfig>(
  mockSessions.map((s) => [s.id, s.config] as const),
);

// ---------------------------------------------------------------------------
// Issue playbooks — every issue produces its own customer voice, knowledge and
// coaching guidance so no two scenarios feel alike.
// ---------------------------------------------------------------------------

type IssueKey =
  | "refund"
  | "payment"
  | "tracking"
  | "delivery"
  | "account"
  | "password"
  | "subscription"
  | "damaged"
  | "technical"
  | "billing"
  | "shipping"
  | "vip"
  | "complaint";

interface Playbook {
  label: string;
  intent: string;
  chunks: RetrievedChunk[];
  openers: string[];
  pressers: string[];
  softeners: string[];
  coaching: string[];
  empathy: string[];
  professional: string[];
  clarity: string[];
  tips: string[];
  nextActions: string[];
  troubleshooting: string;
  escalation: string;
}

const kb = (
  id: string,
  title: string,
  source: string,
  preview: string,
  similarity: number,
  type: RetrievedChunk["type"],
): RetrievedChunk => ({ id, title, source, preview, similarity, type });

const PLAYBOOKS: Record<IssueKey, Playbook> = {
  refund: {
    label: "Refund Request",
    intent: "Refund request",
    chunks: [
      kb("kb_refund_01", "Refund eligibility & timelines", "policies/refund-policy-v3.pdf", "Refunds approved before 5pm are queued the same business day and settle to the original payment method within 3–5 business days. Bank posting time is outside our control.", 0.93, "Policy"),
      kb("kb_refund_02", "Issuing a goodwill credit", "playbooks/goodwill.md", "Agents may issue up to $15 of store credit without approval when a refund exceeds the published SLA. Always state the credit amount and expiry.", 0.86, "FAQ"),
      kb("kb_refund_03", "Refund exceptions and escalation path", "policies/refund-exceptions.pdf", "Orders paid by bank transfer or split payment need finance approval. Escalate with the order ID and a screenshot of the payment ledger.", 0.79, "Troubleshooting"),
    ],
    openers: [
      "I requested a refund {days} days ago for my {product} and there's still nothing in my account. What is going on?",
      "I was told the refund for my {product} was approved. My bank shows nothing. Can you actually check it this time?",
      "This is my {nth} time asking about the refund on order for the {product}. Nobody gives me a straight answer.",
    ],
    pressers: [
      "Three to five business days is what the last person said too. Can you give me a reference number I can actually track?",
      "I don't want another 'we're looking into it'. Has the refund been issued — yes or no?",
      "If it's been approved, why can't you tell me the exact date it leaves your system?",
    ],
    softeners: [
      "Okay, that reference number helps. If it lands by Friday I'll leave it there.",
      "Alright — thank you for actually checking instead of reading me the policy.",
      "That's the first clear answer I've had. I'll watch for the confirmation email.",
    ],
    coaching: [
      "Confirm the refund reference number and the exact settlement window before anything else — this customer has already been given a vague timeline.",
      "Lead with the refund status you can see on screen, then state the policy: refunds settle in 3–5 business days from approval.",
      "Own the delay explicitly, give the ledger date, and offer the goodwill credit you're authorised to approve.",
    ],
    empathy: [
      "Name the wait out loud — 'waiting this long for your own money back isn't acceptable'.",
      "Avoid apologising twice; one specific apology plus an action beats repeated sorrys.",
    ],
    professional: [
      "Quote the refund policy section rather than paraphrasing it — accuracy builds trust here.",
      "Share the refund reference ID proactively so the customer can chase their bank.",
    ],
    clarity: [
      "State the date, then the amount, then the method — in that order.",
      "Replace 'should be' with a committed date the ledger confirms.",
    ],
    tips: [
      "Offer the $15 goodwill credit before the customer asks for compensation.",
      "Close by confirming which card the refund lands on — customers often watch the wrong account.",
    ],
    nextActions: [
      "Pull the refund ledger entry, share the reference ID, and confirm the settlement date in writing.",
      "Approve the goodwill credit and email the refund confirmation while the customer is still on the line.",
    ],
    troubleshooting: "If the refund is stuck in 'approved' with no ledger entry, re-trigger the payout job and flag finance with the order ID.",
    escalation: "Escalate to finance if the refund is over 7 days past approval or the payment was split across methods.",
  },
  payment: {
    label: "Payment Failure",
    intent: "Payment failure",
    chunks: [
      kb("kb_pay_01", "Duplicate charge investigation", "policies/payments-duplicates.pdf", "Duplicate authorisations usually drop off within 48h. If both charges have settled, raise a payment reversal with the transaction reference from the gateway.", 0.94, "Policy"),
      kb("kb_pay_02", "Declined payment error codes", "faqs/payment-errors.md", "Code 51 is insufficient funds, 05 is issuer decline, 65 is 3-D Secure required. Ask for the last four digits and the timestamp of the attempt.", 0.88, "FAQ"),
      kb("kb_pay_03", "Retrying a failed payment safely", "playbooks/payment-retry.md", "Never retry more than twice in a session. Send a secure payment link instead so the customer's issuer sees a fresh authorisation.", 0.81, "Troubleshooting"),
    ],
    openers: [
      "My card was charged twice for the {product} and the order still says payment failed. Which is it?",
      "The payment keeps getting declined but my bank says nothing is wrong on their side. I've tried {nth} times now.",
      "I've got two pending charges on my statement for one {product} order. I need one of them gone today.",
    ],
    pressers: [
      "I already gave you the last four digits. What else do you need to actually see the transaction?",
      "Telling me it'll 'drop off automatically' isn't good enough when it's this much money.",
      "Can you send me something in writing that says the second charge is being reversed?",
    ],
    softeners: [
      "Okay, the reversal reference is what I needed. Thanks for pulling that up.",
      "Fine — if the pending one drops off in 48 hours as you say, we're good.",
      "That makes sense now. I didn't realise it was an authorisation rather than a charge.",
    ],
    coaching: [
      "Ask for the transaction reference and timestamp first, then confirm whether the second charge is an authorisation or a settlement — the distinction changes the whole answer.",
      "Explain the error code in plain language, then send a secure payment link rather than retrying the card again.",
      "Confirm the reversal in writing with the gateway reference; this customer needs proof, not reassurance.",
    ],
    empathy: [
      "Acknowledge the money is genuinely out of their account right now — that's the real anxiety here.",
      "Skip generic sympathy and validate the specific financial impact.",
    ],
    professional: [
      "Never ask for full card numbers — last four digits and the timestamp are enough.",
      "Record the gateway reference on the ticket before you end the conversation.",
    ],
    clarity: [
      "Distinguish 'pending authorisation' from 'settled charge' in one short sentence.",
      "Give the 48-hour window with a concrete calendar date attached.",
    ],
    tips: [
      "Offer the secure payment link proactively instead of asking them to retry blindly.",
      "Summarise both charges by amount and date so the customer can match them on their statement.",
    ],
    nextActions: [
      "Raise the reversal with the gateway reference and email confirmation immediately.",
      "Send the secure payment link and stay on the line while the customer completes it.",
    ],
    troubleshooting: "If both charges have settled, open a reversal ticket with the gateway; if one is pending, show the customer the authorisation expiry date.",
    escalation: "Escalate to the payments team if both charges settled over 72 hours ago or the amount exceeds the agent reversal limit.",
  },
  tracking: {
    label: "Order Tracking",
    intent: "Order tracking",
    chunks: [
      kb("kb_track_01", "Tracking states explained", "faqs/tracking.md", "'Label created' means the carrier has not scanned the parcel yet. Escalate to logistics when there is no scan for 48 hours after dispatch.", 0.91, "FAQ"),
      kb("kb_track_02", "Carrier SLA reference", "policies/carrier-sla.pdf", "Standard delivery is 3–5 working days after the first scan; express is next working day when dispatched before 3pm.", 0.85, "Policy"),
      kb("kb_track_03", "Reissuing tracking links", "playbooks/tracking-links.md", "Tracking links expire after 30 days. Regenerate from the order view and send by email, never by SMS for international orders.", 0.77, "Troubleshooting"),
    ],
    openers: [
      "The tracking for my {product} hasn't moved in {days} days. Is it actually shipped or not?",
      "My tracking link doesn't work and support chat keeps timing out. Where is my {product}?",
      "It says 'label created' since last week. I need to know if this order even exists.",
    ],
    pressers: [
      "So the carrier has it but nobody scanned it? That doesn't tell me when it arrives.",
      "Can you give me a delivery date rather than a tracking status I can already see?",
      "What happens if there's still no scan tomorrow — do I get a replacement or a refund?",
    ],
    softeners: [
      "Okay, so a fresh scan by tomorrow or you re-ship it. That works for me.",
      "Thanks — the new tracking link opens fine now.",
      "Good, at least I know where it actually is.",
    ],
    coaching: [
      "Explain what 'label created' actually means, then commit to a checkpoint: if there's no scan in 24 hours, you re-ship.",
      "Regenerate the tracking link and read the latest scan aloud — the customer can't see what you see.",
      "Give a delivery estimate with a date, and name the fallback if the parcel doesn't move.",
    ],
    empathy: [
      "Recognise the uncertainty is the problem, not the wait itself.",
      "Reflect their deadline back if they mentioned one.",
    ],
    professional: [
      "Give the carrier name and consignment number so the customer can chase directly if they want to.",
      "Set a specific follow-up time rather than 'we'll be in touch'.",
    ],
    clarity: ["One status, one date, one fallback — keep it to three sentences.", "Avoid carrier jargon like 'in transit to sortation'."],
    tips: [
      "Proactively offer the re-ship threshold before the customer demands it.",
      "Send the regenerated tracking link during the conversation, not after.",
    ],
    nextActions: [
      "Regenerate the tracking link, confirm the latest scan, and set a 24-hour re-ship checkpoint.",
      "Open a carrier trace and give the customer the trace reference.",
    ],
    troubleshooting: "No scan for 48h after dispatch → open a carrier trace and prepare a replacement dispatch.",
    escalation: "Escalate to logistics if the parcel has no scan after the trace window or the order is time-critical.",
  },
  delivery: {
    label: "Delayed Delivery",
    intent: "Delivery delay",
    chunks: [
      kb("kb_del_01", "Late delivery compensation", "policies/delivery-compensation.pdf", "Express orders delivered late qualify for a shipping refund. Standard orders qualify after 3 working days past the promised window.", 0.92, "Policy"),
      kb("kb_del_02", "Re-dispatch decision tree", "playbooks/redispatch.md", "Re-dispatch immediately when the parcel is time-critical, marked damaged in transit, or has no scan for 48 hours.", 0.87, "Troubleshooting"),
      kb("kb_del_03", "Setting delivery expectations", "training/expectations.md", "Give a date, not a duration. Confirm the cut-off time and what happens if that date slips.", 0.78, "Article"),
    ],
    openers: [
      "My {product} was promised {days} days ago and it still isn't here. I needed it for a specific date.",
      "This is the second delay on the same order. At what point do you just send a new one?",
      "Nobody told me the delivery slipped — I found out by checking myself. That's not good service.",
    ],
    pressers: [
      "A shipping refund doesn't help me if the item still doesn't arrive this week.",
      "Can you re-dispatch today rather than waiting on the original parcel?",
      "What's the actual date it lands on my doorstep?",
    ],
    softeners: [
      "Overnight re-dispatch works. Send me the tracking when it's out.",
      "Alright, that's a fair resolution. Thanks for sorting it.",
      "Okay — refunded shipping and a firm date. I can live with that.",
    ],
    coaching: [
      "Give a committed delivery date and the compensation the policy already entitles them to, without waiting to be asked.",
      "Offer re-dispatch now rather than defending the original parcel — the customer's deadline matters more than the logistics.",
      "Apologise once for the missed communication, then move straight to the new date and tracking.",
    ],
    empathy: ["Mirror their deadline explicitly rather than the generic 'sorry for the wait'.", "Acknowledge they had to chase this themselves."],
    professional: ["Refund the shipping cost proactively where the policy allows.", "Confirm the replacement dispatch reference before closing."],
    clarity: ["Say the date first, then the compensation, then the tracking.", "Avoid conditional phrasing — 'should arrive' undermines the commitment."],
    tips: ["Set a proactive update at the next milestone so they never chase again.", "Name the carrier change if you re-dispatch by a faster service."],
    nextActions: ["Re-dispatch by express, refund the original shipping, and share the new tracking number.", "Book a proactive update for the delivery date and tell the customer when to expect it."],
    troubleshooting: "If the original parcel is still in the network, re-dispatch and mark the first as return-to-sender.",
    escalation: "Escalate to logistics leadership for repeat delays on the same account.",
  },
  account: {
    label: "Account Locked",
    intent: "Account access issue",
    chunks: [
      kb("kb_acc_01", "Account lockout policy", "policies/account-security.pdf", "Accounts lock after 5 failed attempts and auto-unlock after 30 minutes. Manual unlock requires two identity checks.", 0.93, "Policy"),
      kb("kb_acc_02", "Identity verification steps", "playbooks/identity-verification.md", "Verify with the registered email plus one of: last order reference, billing postcode, or the last four digits of the payment method.", 0.89, "Troubleshooting"),
      kb("kb_acc_03", "Securing a compromised account", "training/account-compromise.md", "If lockout follows unrecognised login attempts, force a password reset, revoke sessions and enable 2FA.", 0.8, "Article"),
    ],
    openers: [
      "I'm locked out of my {product} account and the reset email never arrives. I've tried {nth} times.",
      "My account got locked in the middle of work and now I can't get to anything. Can you unlock it?",
      "It says too many failed attempts — but I only tried twice. Something's wrong on your side.",
    ],
    pressers: [
      "I've checked spam. There's nothing there. Can you send it to a different address?",
      "Waiting 30 minutes isn't realistic, I need access now.",
      "How do I know someone else isn't trying to get into my account?",
    ],
    softeners: [
      "Got it, the reset link came through this time. Logging in now.",
      "Okay, 2FA is on and I can see my sessions. That's reassuring.",
      "Thanks for verifying me properly instead of just unlocking it.",
    ],
    coaching: [
      "Run the two identity checks before unlocking, and say why you're asking — security questions feel like obstruction unless you explain them.",
      "Send the reset link to the verified address on file and confirm receipt in-session rather than assuming it arrived.",
      "If lockout followed unrecognised attempts, treat it as a security event: force reset, revoke sessions, enable 2FA.",
    ],
    empathy: ["Acknowledge being locked out mid-work is disruptive, not just inconvenient.", "Reassure them their data is intact before troubleshooting."],
    professional: ["Never bypass identity verification, even under pressure.", "Log the verification method used on the ticket."],
    clarity: ["Number the reset steps — locked-out customers are already flustered.", "State exactly which email the link is going to."],
    tips: ["Offer to stay on the line until they're logged back in.", "Recommend 2FA once access is restored, not before."],
    nextActions: ["Verify identity, unlock the account, and confirm successful login before closing.", "Force a password reset and revoke active sessions if the attempts were unrecognised."],
    troubleshooting: "Reset email missing → check bounce logs and the suppression list before resending.",
    escalation: "Escalate to the security team if there are unrecognised login attempts from new regions.",
  },
  password: {
    label: "Password Reset",
    intent: "Password reset",
    chunks: [
      kb("kb_pwd_01", "Password reset flow", "faqs/password-reset.md", "Reset links expire after 60 minutes and can only be used once. Request a new link if the page shows 'token expired'.", 0.92, "FAQ"),
      kb("kb_pwd_02", "Password requirements", "policies/password-policy.pdf", "Minimum 12 characters with one number and one symbol. Previous five passwords cannot be reused.", 0.84, "Policy"),
      kb("kb_pwd_03", "Reset email deliverability", "playbooks/email-deliverability.md", "Corporate filters frequently quarantine reset mail. Ask the customer to allowlist the sending domain or use a personal address.", 0.79, "Troubleshooting"),
    ],
    openers: [
      "The password reset link for my {product} account says expired every single time. I've requested it {nth} times.",
      "I reset my password and it still won't let me in. What am I doing wrong?",
      "It won't accept my new password and won't tell me why. Very helpful.",
    ],
    pressers: [
      "I clicked it within a minute. How is that expired?",
      "What exactly does the password need to contain? Just tell me the rules.",
      "Can you reset it from your side instead of sending me in circles?",
    ],
    softeners: [
      "That worked — it was the symbol requirement.",
      "Okay, using my personal email got the link through. Thanks.",
      "In. Appreciate you walking me through it.",
    ],
    coaching: [
      "State the password rules up front — most 'won't accept' cases are silent validation failures, not bugs.",
      "Explain the one-time link behaviour before resending; requesting twice invalidates the first link.",
      "Check deliverability (corporate filters) rather than resending the same email a third time.",
    ],
    empathy: ["Reassure them nothing is wrong with their account — this is a common flow issue.", "Avoid language that implies user error."],
    professional: ["Never read a password back or ask them to share it.", "Confirm the successful login before closing the ticket."],
    clarity: ["List the password requirements as a short numbered set.", "Say 'the newest link is the only valid one' explicitly."],
    tips: ["Suggest a personal address when a corporate filter is suspected.", "Offer a passkey or 2FA setup once they're back in."],
    nextActions: ["Send a fresh reset link, state the requirements, and confirm login in-session.", "Check bounce logs and advise allowlisting if the mail is being quarantined."],
    troubleshooting: "Token expired immediately → a newer link was requested; only the latest one works.",
    escalation: "Escalate to platform support if reset mail is bouncing at the domain level.",
  },
  subscription: {
    label: "Subscription Cancellation",
    intent: "Subscription cancellation",
    chunks: [
      kb("kb_sub_01", "Cancellation and proration", "policies/subscriptions.pdf", "Cancellations take effect at the end of the current billing period. Mid-term cancellations are prorated only on annual plans.", 0.93, "Policy"),
      kb("kb_sub_02", "Retention offers", "playbooks/retention.md", "A one-month pause or a 20% loyalty discount may be offered once per account before cancellation is processed.", 0.85, "Article"),
      kb("kb_sub_03", "Post-cancellation data retention", "policies/data-retention.pdf", "Account data is retained for 90 days after cancellation and can be exported at any time in that window.", 0.78, "Policy"),
    ],
    openers: [
      "I want to cancel my {product} subscription. I've tried in the app and there's no option anywhere.",
      "Cancel my plan please — I was charged again after I asked to stop last month.",
      "I'm cancelling. Before you pitch me anything, I just want the date it ends and confirmation in writing.",
    ],
    pressers: [
      "I'm not interested in a discount. Just process the cancellation.",
      "So I still get charged for this month? That doesn't seem right.",
      "What happens to my data after it ends?",
    ],
    softeners: [
      "Okay, one month paused instead of cancelling. Let's try that.",
      "Confirmation email received. That's all I needed.",
      "Good to know I can export my data. Thanks for being straightforward.",
    ],
    coaching: [
      "Process the cancellation first, then mention the retention option once — pushing twice damages trust irreversibly.",
      "State the exact end date and what they keep access to until then.",
      "If they were charged after requesting cancellation, refund it without being asked.",
    ],
    empathy: ["Respect the decision — don't over-apologise or interrogate the reason.", "Acknowledge the frustration of not finding the option in-app."],
    professional: ["Send written confirmation with the end date immediately.", "Mention the 90-day data export window unprompted."],
    clarity: ["End date, final charge, data window — three facts, one message.", "Avoid conditional retention language once they've declined."],
    tips: ["Offer the pause only once, and only if they haven't already refused.", "Confirm whether the refund is for the last cycle or prorated."],
    nextActions: ["Process the cancellation, email confirmation with the end date, and refund the disputed charge.", "Offer the pause option once, then honour whichever they choose."],
    troubleshooting: "No cancel option in-app usually means the plan is managed through an app store — direct them to the correct portal.",
    escalation: "Escalate to billing if a charge occurred after a documented cancellation request.",
  },
  damaged: {
    label: "Damaged Product",
    intent: "Damaged product report",
    chunks: [
      kb("kb_dmg_01", "Damaged item claims", "policies/damaged-goods.pdf", "Damage reported within 30 days qualifies for a full refund or free replacement. Photos are required for items over $50.", 0.94, "Policy"),
      kb("kb_dmg_02", "Return label issuance", "playbooks/returns.md", "Issue a prepaid return label within 24 hours. Do not require the customer to return damaged items under $25.", 0.87, "Troubleshooting"),
      kb("kb_dmg_03", "Warranty coverage", "products/warranty.docx", "All units carry a 12-month warranty covering battery, driver and hinge defects with no RMA fee.", 0.8, "Article"),
    ],
    openers: [
      "My {product} arrived cracked. The box was fine so this was damaged before it shipped.",
      "The {product} I got is faulty out of the box and I've already wasted {days} days on this.",
      "Second damaged unit in a row. I'm starting to think this is a packaging problem on your end.",
    ],
    pressers: [
      "I've sent the photos twice already. Does anyone actually look at them?",
      "I don't want another replacement that arrives broken — can you check it before it ships?",
      "Do I have to pay to send this one back?",
    ],
    softeners: [
      "Prepaid label and a checked replacement — that's fair.",
      "Okay, I can see the photos went through this time. Thanks.",
      "Appreciate you not making me argue for it.",
    ],
    coaching: [
      "Confirm the photos are on the ticket, then decide refund or replacement in the same message — don't make them ask twice.",
      "Issue the prepaid return label immediately and say it's free before they ask about return cost.",
      "For a repeat damage case, flag packaging QA and tell the customer you've done it.",
    ],
    empathy: ["Acknowledge the disappointment of unboxing a broken product, not just the inconvenience.", "Validate the repeat failure if this isn't the first unit."],
    professional: ["Reference the 30-day damage policy by name.", "Record the QA flag so the pattern is visible to the product team."],
    clarity: ["Offer refund or replacement as a clear choice, not an open question.", "State the label arrives by email within 24 hours."],
    tips: ["Confirm the replacement will be quality-checked before dispatch.", "Waive the return for low-value items instead of shipping them back."],
    nextActions: ["Confirm photo receipt, issue the prepaid label, and dispatch a QA-checked replacement.", "Refund in full and raise a packaging QA flag on the SKU."],
    troubleshooting: "Repeat damage on the same SKU → raise a packaging defect ticket with photos attached.",
    escalation: "Escalate to product QA when the same SKU is damaged twice for one customer.",
  },
  technical: {
    label: "Technical Support",
    intent: "Technical support",
    chunks: [
      kb("kb_tech_01", "Diagnostic information checklist", "playbooks/diagnostics.md", "Collect the app version, device/OS, exact error text, timestamp and whether it reproduces in a private window before escalating.", 0.93, "Troubleshooting"),
      kb("kb_tech_02", "Known issues — current release", "release-notes/2.4.1.md", "2.4.1 patches the upload handler timeout and the intermittent 429 on batch endpoints. Recommend upgrading before deeper debugging.", 0.88, "Article"),
      kb("kb_tech_03", "Rate limit reference", "docs/api-limits.md", "Default limit is 60 requests/minute per key with a burst of 100. 429 responses include a Retry-After header.", 0.82, "FAQ"),
    ],
    openers: [
      "The {product} keeps throwing an error every time I try to sync. I've restarted everything already.",
      "We're getting 429s on the {product} API since this morning and nothing changed on our side.",
      "Uploads fail at around 80% every time. I've tried {nth} different files.",
    ],
    pressers: [
      "I already cleared cache and reinstalled. What's the next actual step?",
      "Can you check your logs rather than asking me to try things at random?",
      "Is this a known issue? Because it started right after your last update.",
    ],
    softeners: [
      "2.4.1 fixed it — uploads complete first time now.",
      "Okay, the Retry-After header explains it. We'll add backoff.",
      "Good, that log reference confirms it wasn't us. Thanks for digging.",
    ],
    coaching: [
      "Collect the diagnostic set — version, OS, exact error text, timestamp — before suggesting any fix.",
      "Check known issues for the current release first; recommending the 2.4.1 upgrade may resolve it outright.",
      "Say plainly whether you can see it in the logs; technical customers value honesty over reassurance.",
    ],
    empathy: ["Acknowledge the time they've already spent troubleshooting before you suggest anything.", "Don't repeat steps they've told you they've tried."],
    professional: ["Give the log reference or incident ID so they can follow up.", "Commit to a callback time if engineering needs to investigate."],
    clarity: ["Number the troubleshooting steps and stop after three.", "Use their exact error string rather than paraphrasing it."],
    tips: ["Confirm whether it reproduces in a private window to rule out extensions.", "Share the Retry-After guidance rather than only the limit number."],
    nextActions: ["Collect the diagnostic set, check the release notes, and raise an engineering ticket with the log reference.", "Recommend the 2.4.1 upgrade and verify the error clears in-session."],
    troubleshooting: "Reproduce with the customer's exact payload; if it fails server-side, attach the trace ID to the engineering ticket.",
    escalation: "Escalate to engineering when the error appears in server logs or affects more than one account.",
  },
  billing: {
    label: "Billing Issue",
    intent: "Billing dispute",
    chunks: [
      kb("kb_bill_01", "Invoice and proration rules", "policies/billing.pdf", "Plan upgrades are prorated to the day; downgrades apply at the next renewal. Invoices are regenerated within one hour of a plan change.", 0.92, "Policy"),
      kb("kb_bill_02", "Disputed charge workflow", "playbooks/billing-disputes.md", "Log the invoice number, confirm the charge line, and issue a credit note rather than a raw refund for VAT-registered accounts.", 0.86, "Troubleshooting"),
      kb("kb_bill_03", "Tax and VAT handling", "policies/tax.pdf", "VAT is applied by billing country. A valid VAT ID on the account removes the charge from the next invoice onwards, not retroactively.", 0.79, "Policy"),
    ],
    openers: [
      "My invoice for {product} is higher than the plan price and there's no explanation on it.",
      "You've billed me for a plan I downgraded from last month. Why?",
      "There's a tax line on my invoice that shouldn't be there — we have a VAT ID on file.",
    ],
    pressers: [
      "Prorated to the day doesn't explain a difference this size. Can you break down the lines?",
      "I need a corrected invoice, not a verbal explanation, for our accounts team.",
      "Will the VAT be credited back for the previous invoices too?",
    ],
    softeners: [
      "The credit note came through and the numbers match now.",
      "Okay, that breakdown makes sense — the proration line was the confusing part.",
      "Thanks for correcting it properly rather than just refunding a lump sum.",
    ],
    coaching: [
      "Break the invoice down line by line before defending the total — the customer needs to see the maths.",
      "Issue a credit note rather than a raw refund for a VAT-registered account, and explain why.",
      "Be explicit that VAT changes apply from the next invoice, not retroactively.",
    ],
    empathy: ["Recognise that unexplained charges feel like being overcharged, even when correct.", "Acknowledge their accounts team needs documentation, not reassurance."],
    professional: ["Reference the invoice number in every message.", "Attach the corrected invoice rather than describing the change."],
    clarity: ["Show the arithmetic: base, proration, tax, total.", "Avoid billing jargon like 'true-up' without explaining it."],
    tips: ["Offer to walk the accounts team through the invoice directly.", "Confirm whether they need a credit note or a refund — they are not interchangeable."],
    nextActions: ["Send a line-by-line breakdown and issue a corrected invoice or credit note.", "Add the VAT ID to the account and confirm the effective date."],
    troubleshooting: "Invoice mismatch after a plan change → regenerate the invoice; changes take up to an hour to propagate.",
    escalation: "Escalate to finance for retroactive tax adjustments or disputes over one billing cycle old.",
  },
  shipping: {
    label: "Shipping Complaint",
    intent: "Shipping complaint",
    chunks: [
      kb("kb_ship_01", "Carrier complaint handling", "policies/carrier-complaints.pdf", "Log the carrier, consignment number and complaint category. Carrier-caused failures are refunded by us first and reclaimed later.", 0.9, "Policy"),
      kb("kb_ship_02", "Delivery instruction failures", "faqs/delivery-instructions.md", "Instructions set after dispatch do not reach the driver. Reroute through the carrier portal instead.", 0.85, "FAQ"),
      kb("kb_ship_03", "Address correction process", "playbooks/address-change.md", "Address changes are only possible before the first carrier scan; after that, request an intercept.", 0.77, "Troubleshooting"),
    ],
    openers: [
      "The driver left my {product} outside in the rain despite my delivery instructions.",
      "Your carrier marked my {product} as delivered and it's nowhere to be found.",
      "This is the {nth} time a delivery has gone to the wrong address on this account.",
    ],
    pressers: [
      "Don't tell me to contact the carrier — I ordered from you, not them.",
      "What are you doing so this doesn't happen on the next order?",
      "Am I getting a replacement or am I chasing a refund now?",
    ],
    softeners: [
      "Replacement plus a note on the account for the driver. That works.",
      "Okay, you raising it with the carrier is what I wanted to hear.",
      "Thanks for owning it instead of passing me around.",
    ],
    coaching: [
      "Own the carrier failure — never redirect the customer to the carrier, raise the complaint yourself.",
      "Offer replacement or refund immediately, then log the carrier complaint with the consignment number.",
      "For repeat address failures, add a permanent delivery note to the account and say you've done it.",
    ],
    empathy: ["Acknowledge that being told to chase the carrier is exactly what they feared.", "Recognise the repeat pattern if there is one."],
    professional: ["Log the carrier complaint reference on the ticket.", "Confirm the account-level delivery note in writing."],
    clarity: ["Say who is doing what: you raise the complaint, they do nothing.", "Give the replacement dispatch date up front."],
    tips: ["Offer a preferred safe place or a collection point for the replacement.", "Mention the carrier claim is yours to file, not theirs."],
    nextActions: ["Dispatch a replacement, file the carrier claim, and add a delivery note to the account.", "Refund in full and confirm the carrier complaint reference."],
    troubleshooting: "Marked delivered but missing → request the carrier's GPS proof of delivery before deciding.",
    escalation: "Escalate to the logistics account manager after three carrier failures on one account.",
  },
  vip: {
    label: "VIP Customer",
    intent: "VIP account escalation",
    chunks: [
      kb("kb_vip_01", "Priority account handling", "policies/vip-handling.pdf", "VIP accounts get a named owner, a two-hour first response and direct escalation without tier-one triage.", 0.93, "Policy"),
      kb("kb_vip_02", "Goodwill authority for key accounts", "playbooks/vip-goodwill.md", "Agents may approve service credits up to 10% of monthly spend for VIP accounts without manager sign-off.", 0.86, "Article"),
      kb("kb_vip_03", "Executive escalation path", "playbooks/exec-escalation.md", "Loop in the account director for renewal-risk conversations within the same business day.", 0.8, "Troubleshooting"),
    ],
    openers: [
      "We spend a significant amount with you every year and this {product} issue has been open for {days} days.",
      "I shouldn't have to explain who we are every time we contact support about the {product}.",
      "Our renewal is coming up and this is exactly the kind of thing that decides it.",
    ],
    pressers: [
      "I'd like this handled by someone who can actually make decisions.",
      "What's the commitment here — a date, or another investigation?",
      "Who owns this account, and why haven't they contacted us?",
    ],
    softeners: [
      "Good — having a named owner is what we've been asking for.",
      "That commitment works. I'll expect the update by end of day.",
      "Thank you for treating it with the priority it deserves.",
    ],
    coaching: [
      "Name the account owner and give a same-day commitment — VIP customers escalate when they feel anonymous.",
      "Use your goodwill authority proactively; on this account you can approve a service credit without sign-off.",
      "Address the renewal risk directly rather than hoping it isn't mentioned again.",
    ],
    empathy: ["Acknowledge the relationship, not just the ticket.", "Avoid scripted language entirely — it reads as dismissive to key accounts."],
    professional: ["Confirm the escalation path and who is accountable.", "Commit to a written update with a time, not a day."],
    clarity: ["Owner, commitment, deadline — in the first two sentences.", "Never say 'I'll try' to a VIP account."],
    tips: ["Loop the account director in the same business day when renewal is mentioned.", "Summarise the history back so they don't have to repeat it."],
    nextActions: ["Assign a named owner, commit to a same-day update, and notify the account director.", "Approve the service credit and confirm it in writing."],
    troubleshooting: "Check the account history before responding so the customer never repeats context.",
    escalation: "Escalate to the account director immediately when renewal risk is voiced.",
  },
  complaint: {
    label: "Complaint Escalation",
    intent: "Formal complaint",
    chunks: [
      kb("kb_comp_01", "Formal complaints procedure", "policies/complaints.pdf", "Log the complaint, acknowledge within 24 hours, and provide a written outcome within 5 working days.", 0.91, "Policy"),
      kb("kb_comp_02", "De-escalation phrases", "training/de-escalation.pdf", "Lead with acknowledgment: 'I completely understand how frustrating that must be.' Follow with a concrete next step in the same breath.", 0.87, "Troubleshooting"),
      kb("kb_comp_03", "Supervisor handover checklist", "playbooks/handover.md", "Brief the supervisor with the history, what was already offered, and what the customer is asking for before transferring.", 0.8, "Article"),
    ],
    openers: [
      "I want to make a formal complaint about how this {product} issue has been handled.",
      "I've spoken to {nth} different people and every one of them told me something different.",
      "This has been going on for {days} days. I want it in writing and I want someone senior.",
    ],
    pressers: [
      "I don't want another apology. What is actually being done?",
      "Put me through to a supervisor please.",
      "When will I get the written outcome, and from whom?",
    ],
    softeners: [
      "Okay, a complaint reference and a written outcome in five days. That's acceptable.",
      "Thank you for not making me repeat the whole story again.",
      "Alright — I'll wait for the supervisor's call.",
    ],
    coaching: [
      "Log the formal complaint and give the reference immediately — that's the outcome this customer is actually asking for.",
      "Stop apologising and state what happens next: acknowledgment in 24 hours, written outcome in 5 working days.",
      "Brief the supervisor fully before transferring so the customer never repeats their history.",
    ],
    empathy: ["Acknowledge the number of times they've had to repeat themselves.", "Validate the complaint as legitimate rather than defending the process."],
    professional: ["Give the complaint reference number in writing.", "Name the person who will own the outcome."],
    clarity: ["Reference, timeline, owner — three concrete facts.", "Avoid process language that sounds like deflection."],
    tips: ["Summarise the history back to them once, accurately.", "Offer the supervisor call rather than waiting to be asked."],
    nextActions: ["Log the complaint, issue the reference, and arrange the supervisor callback today.", "Send the written acknowledgment with the outcome date before ending the conversation."],
    troubleshooting: "Conflicting information from multiple agents → consolidate the ticket history and issue one corrected statement.",
    escalation: "Escalate to a supervisor immediately when a formal complaint is requested.",
  },
};

const ISSUE_MATCHERS: [IssueKey, RegExp][] = [
  ["damaged", /damag|broken|crack|faulty|defect/i],
  ["refund", /refund|money back|reimburse/i],
  ["payment", /payment|charged|card|declin|transaction|double/i],
  ["tracking", /track|where is my|order status/i],
  ["delivery", /deliver|late|delay|overdue|arriv/i],
  ["account", /account|locked|lockout|access|sign in|login/i],
  ["password", /password|reset|credential/i],
  ["subscription", /subscri|cancel|plan|renew/i],
  ["technical", /technical|error|bug|api|sync|upload|crash|429/i],
  ["billing", /billing|invoice|vat|tax|overcharg/i],
  ["shipping", /shipping|carrier|courier|driver|address/i],
  ["vip", /vip|enterprise|key account|contract/i],
  ["complaint", /complaint|escalat|supervisor|manager/i],
];

function resolveIssue(text: string): IssueKey {
  for (const [key, re] of ISSUE_MATCHERS) if (re.test(text)) return key;
  return "complaint";
}

// ---------------------------------------------------------------------------
// Per-session simulation state — keeps conversations evolving and unrepeated.
// ---------------------------------------------------------------------------

interface SessionFacts {
  name: string;
  order: string;
  txn: string;
  days: number;
}

interface SimState {
  turn: number;
  frustration: number;
  usedCustomer: Set<string>;
  usedCores: Set<string>;
  usedCoaching: Set<string>;
  usedKb: Map<string, number>;
  scores: number[];
  facts: SessionFacts;
  /** Concrete commitments the agent made — the customer remembers these. */
  promises: string[];
}

const FIRST_NAMES = [
  "Priya", "Daniel", "Aisha", "Marcus", "Elena", "Tom", "Nadia", "Ravi", "Sofia", "Jonas",
];

function newFacts(): SessionFacts {
  const rand = (n: number) => Math.floor(Math.random() * n);
  return {
    name: FIRST_NAMES[rand(FIRST_NAMES.length)],
    order: `ORD-${10_000 + rand(89_999)}`,
    txn: `TXN-${100_000 + rand(899_999)}`,
    days: 3 + rand(11),
  };
}

const simStates = new Map<string, SimState>();

function stateFor(sessionId: string): SimState {
  let s = simStates.get(sessionId);
  if (!s) {
    s = {
      turn: 0,
      frustration: 0.7,
      usedCustomer: new Set(),
      usedCores: new Set(),
      usedCoaching: new Set(),
      usedKb: new Map(),
      scores: [],
      facts: newFacts(),
      promises: [],
    };
    simStates.set(sessionId, s);
  }
  return s;
}

export function resetMockSession(sessionId: string) {
  simStates.delete(sessionId);
}

function pickFresh(pool: string[], used: Set<string>): string {
  const fresh = pool.filter((p) => !used.has(p));
  const source = fresh.length ? fresh : pool;
  const choice = source[Math.floor(Math.random() * source.length)];
  used.add(choice);
  return choice;
}

const FILLERS = [
  "Honestly, I'm losing patience with this.",
  "I've had to explain this from scratch every time.",
  "I really don't have time for another back and forth.",
  "I just want someone to take ownership of it.",
  "This should not be this complicated.",
  "Every time I get in touch it starts again from zero.",
  "I've taken time off work for this, which is ridiculous.",
  "At this point I'd settle for a straight answer.",
  "You can probably tell I'm past being polite about it.",
  "I've already told two other people the same story.",
];
const CALM_FILLERS = [
  "I appreciate you looking into it.",
  "That's clearer than what I was told before.",
  "Okay, that's reasonable.",
  "Thanks for staying with it.",
  "That's the kind of answer I was hoping for.",
  "Right, that actually makes sense now.",
  "Good — I can work with that.",
  "Thanks for not fobbing me off.",
];

/** Hooks and follow-up beats so no two generated turns read the same. */
const HOT_HOOKS = ["Look — ", "Right, ", "Okay, so ", "Honestly? ", "See, ", ""];
const CALM_HOOKS = ["Okay — ", "Alright, ", "Right, ", "Thanks — ", ""];
const HOT_FOLLOWUPS = [
  "Can you confirm that in writing?",
  "Who exactly is handling this now?",
  "What's the actual date this gets resolved?",
  "And if that doesn't happen, then what?",
  "Is there a reference number I can quote?",
  "How long am I expected to wait this time?",
  "Why did nobody tell me any of this earlier?",
  "Can you check that properly rather than guessing?",
];
const CALM_FOLLOWUPS = [
  "Can you email me the confirmation?",
  "Should I do anything on my side?",
  "Is that reference something I can quote if I need to?",
  "And you'll follow up if anything changes?",
  "Do I need to keep this ticket open?",
  "",
];

/** Persona-specific vocabulary and expectations. */
const PERSONA_VOICE: Record<string, (s: string) => string> = {
  Angry: (s) => s,
  Frustrated: (s) => s,
  Impatient: (s) => s.replace(/\.$/, " — quickly, please."),
  Confused: (s) => `Sorry, I'm a bit lost here. ${s}`,
  Calm: (s) => s,
  Polite: (s) => `Sorry to chase, but ${s.charAt(0).toLowerCase()}${s.slice(1)}`,
  Friendly: (s) => `Thanks for your help — ${s.charAt(0).toLowerCase()}${s.slice(1)}`,
  Technical: (s) => s,
  "Technical User": (s) => `${s} I've already cleared cache and reinstalled, for the record.`,
  Developer: (s) => `${s} If it helps, I can send you the request ID and the 4xx response body.`,
  Beginner: (s) => `I'm not very technical, sorry. ${s}`,
  "VIP Customer": (s) => `${s} I've been on your top-tier plan for four years, so I expected better.`,
  "Business Owner": (s) => `${s} My team can't invoice clients while this is broken.`,
  Student: (s) => `${s} I'm on a student budget, so I can't just absorb this.`,
  "Senior Citizen": (s) => `${s} Please keep it simple for me — I'm not good with the online side.`,
  "First-Time Buyer": (s) => `${s} This is my first order with you, and it's not a great start.`,
  "Healthcare Customer": (s) => `${s} This is for a clinic, so we need it documented properly.`,
  "Returning Customer": (s) => `${s} I've ordered from you plenty of times before without this hassle.`,
};

const pick = <T,>(pool: T[]): T => pool[Math.floor(Math.random() * pool.length)];

/** Memory beats — the customer references details already established. */
function memoryBeat(state: SimState, calming: boolean): string {
  const f = state.facts;
  const promise = state.promises[state.promises.length - 1];
  const pool = calming
    ? [
        `Just so we're on the same page, that's order ${f.order}.`,
        `You said "${promise ?? "you'd sort it"}" — I'm holding you to that.`,
        `I've got ${f.txn} noted down from earlier.`,
        `You already have my details, so nothing else to send from my side, right?`,
      ]
    : [
        `It's still the same order — ${f.order} — I gave you that already.`,
        `I've told you my name is ${f.name} and it's been ${f.days} days.`,
        `Last time I was told "${promise ?? "someone would call me back"}" and nothing happened.`,
        `Please don't ask me for ${f.txn} again, I've sent it twice.`,
      ];
  return pick(pool);
}

/**
 * Compose a customer turn from a playbook core line plus randomised hooks,
 * memory beats and follow-up questions. Retries until the exact sentence has not
 * been used in this session, so replies never repeat within or across sessions.
 */
function composeCustomerLine(
  cores: string[],
  calming: boolean,
  state: SimState,
  substitute: (s: string) => string,
): string {
  const hooks = calming ? CALM_HOOKS : HOT_HOOKS;
  const followups = calming ? CALM_FOLLOWUPS : HOT_FOLLOWUPS;
  const fillers = calming ? CALM_FILLERS : FILLERS;
  const freshCores = cores.filter((c) => !state.usedCores.has(c));
  const corePool = freshCores.length ? freshCores : cores;

  let candidate = "";
  for (let attempt = 0; attempt < 14; attempt += 1) {
    const core = substitute(pick(corePool));
    const hook = pick(hooks);
    // Lowercase the first word after a hook unless it's "I" or a proper noun.
    const firstWord = core.split(" ")[0] ?? "";
    const joined =
      hook && firstWord.slice(1) === firstWord.slice(1).toLowerCase() && firstWord !== "I"
        ? hook + core.charAt(0).toLowerCase() + core.slice(1)
        : hook + core;
    const parts = [joined];
    if (Math.random() > 0.45) parts.push(pick(fillers));
    // From turn 2 onward the customer starts referencing what came before.
    if (state.turn > 1 && Math.random() > 0.45) parts.push(substitute(memoryBeat(state, calming)));
    if (Math.random() > 0.4) parts.push(pick(followups));
    candidate = parts.filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
    state.usedCores.add(core);
    if (!state.usedCustomer.has(candidate)) break;
  }
  state.usedCustomer.add(candidate);
  return candidate;
}

/** Extract concrete commitments from the agent reply so the customer can recall them. */
function rememberPromise(state: SimState, text: string) {
  const sentence = text
    .split(/(?<=[.!?])\s+/)
    .find((s) => /(i'll|i will|i've|we'll|sending|issued|refund|arrang|escalat|within|by \w+day)/i.test(s));
  if (sentence) {
    const trimmed = sentence.trim().replace(/\s+/g, " ").slice(0, 120);
    if (trimmed && !state.promises.includes(trimmed)) state.promises.push(trimmed);
  }
}


/** Quality of the agent's own message — drives coaching scores and emotion. */
function evaluateAgentMessage(text: string, kbTitles: string[]) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const len = words.length;
  const lower = text.toLowerCase();
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 2);
  const avgSentence = sentences.length ? len / sentences.length : len;

  const empathyWords = ["sorry", "understand", "apolog", "appreciate", "frustrat", "thank", "hear you"];
  const actionWords = ["will", "i've", "i have", "let me", "i'll", "processing", "issued", "sending", "confirm", "arrange"];
  const specificity = /\d/.test(text) || /(today|tomorrow|reference|within|by \w+day)/i.test(text);
  const politeness = /(please|thank|happy to|of course)/i.test(text);
  const grounded = kbTitles.some((t) =>
    t
      .toLowerCase()
      .split(/\W+/)
      .filter((w) => w.length > 4)
      .some((w) => lower.includes(w)),
  );

  const empathyHits = empathyWords.filter((w) => lower.includes(w)).length;
  const actionHits = actionWords.filter((w) => lower.includes(w)).length;

  const lengthFit = len < 6 ? 0.3 : len < 15 ? 0.7 : len <= 70 ? 1 : 0.75;
  const clean = (v: number) => Math.round(Math.max(60, Math.min(100, v)) * 10) / 10;

  const tone = clean(70 + empathyHits * 5 + (politeness ? 6 : 0) + lengthFit * 8 - (/(unfortunately|cannot|policy states)/i.test(text) ? 6 : 0));
  const empathy = clean(64 + empathyHits * 8 + (politeness ? 5 : 0) + lengthFit * 6);
  const grammar = clean(78 + (avgSentence <= 22 ? 10 : 0) + (/[.!?]$/.test(text.trim()) ? 6 : -3) + (/^[A-Z]/.test(text.trim()) ? 4 : -4));
  const clarity = clean(68 + (avgSentence <= 20 ? 12 : avgSentence <= 28 ? 5 : -4) + (specificity ? 10 : 0) + lengthFit * 6);
  const professionalism = clean(72 + actionHits * 4 + (specificity ? 8 : 0) + (politeness ? 4 : 0) + lengthFit * 5);
  const knowledge_grounding = clean(64 + (grounded ? 22 : 0) + (specificity ? 8 : 0) + actionHits * 2);
  const resolution_quality = clean(63 + actionHits * 6 + (specificity ? 12 : 0) + (empathyHits ? 4 : 0));

  const overall =
    Math.round(
      ((tone + empathy + grammar + clarity + professionalism + knowledge_grounding + resolution_quality) / 7) * 10,
    ) / 10;

  return {
    scores: { tone, clarity, grammar, professionalism, empathy, knowledge_grounding, resolution_quality },
    overall,
    empathyHits,
    actionHits,
    specificity,
    grounded,
    len,
  };
}

export const mockKnowledgeSearch = (query: string): RetrievedChunk[] =>
  PLAYBOOKS[resolveIssue(query)].chunks;

export const mockKnowledgeDocs: KnowledgeDocument[] = [
  { id: "doc_refund", filename: "refund-policy-v3.pdf", size_bytes: 184_223, chunks: 48, uploaded_at: new Date(Date.now() - 864e5 * 4).toISOString(), type: "PDF" },
  { id: "doc_shipping", filename: "shipping-faqs.md", size_bytes: 22_110, chunks: 12, uploaded_at: new Date(Date.now() - 864e5 * 8).toISOString(), type: "MD" },
  { id: "doc_orbit", filename: "orbit-earbuds-manual.docx", size_bytes: 341_002, chunks: 74, uploaded_at: new Date(Date.now() - 864e5 * 12).toISOString(), type: "DOCX" },
  { id: "doc_billing", filename: "billing-and-tax.pdf", size_bytes: 128_770, chunks: 33, uploaded_at: new Date(Date.now() - 864e5 * 18).toISOString(), type: "PDF" },
  { id: "doc_deesc", filename: "de-escalation-playbook.pdf", size_bytes: 96_540, chunks: 24, uploaded_at: new Date(Date.now() - 864e5 * 30).toISOString(), type: "PDF" },
];

function rankChunks(pb: Playbook, state: SimState): RetrievedChunk[] {
  // Penalise documents that were already surfaced so recommendations rotate.
  return pb.chunks
    .map((c) => {
      const uses = state.usedKb.get(c.id) ?? 0;
      const similarity = Math.max(0.42, Math.round((c.similarity - uses * 0.06) * 1000) / 1000);
      return { ...c, similarity };
    })
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 3)
    .map((c, i) => {
      if (i === 0) state.usedKb.set(c.id, (state.usedKb.get(c.id) ?? 0) + 1);
      return c;
    });
}

// ---------------------------------------------------------------------------
// AI Draft Response — a real, sendable customer-facing reply (never coaching
// instructions). Composed from an acknowledgement, an issue-specific action
// with a concrete commitment, and a closing line.
// ---------------------------------------------------------------------------

const DRAFT_OPENERS = [
  "Hi {name}, thanks for staying with me on this — I can see exactly what's gone wrong.",
  "Hi {name}, I'm sorry you've had to chase this for {days} days. Let me put it right.",
  "Thanks for the details, {name} — I've pulled up {order} and I can see the problem.",
  "Hi {name}, you're right to be frustrated, and I'd feel the same in your position.",
  "I appreciate your patience, {name}. I've checked {order} and I don't want to leave you waiting again.",
];

const DRAFT_CLOSERS = [
  "Once it's actioned you'll get written confirmation with the reference, and I'll stay on this until it's closed.",
  "I'll follow up personally tomorrow morning so you don't have to chase us again.",
  "If anything looks different on your side, just reply here and it comes straight back to me.",
  "I'm adding a note to your account so any colleague picking this up has the full history.",
  "You'll have written confirmation of whatever we agree, so you've got a record.",
];

// Drafts describe what the agent CAN do next. They never claim an action has
// already been completed, because no backend action has been performed.
const DRAFT_BODIES: Record<IssueKey, string[]> = {
  refund: [
    "I can start the full refund on {order} straight away — once it's raised it returns to your original card, and I'll confirm here the moment it's submitted.",
    "Rather than leave this with the returns queue, I can put the refund for {order} through myself and ask for the return postage to be waived.",
    "It looks like the refund on {order} is sitting at an approval step — I can push it forward now and tell you exactly where it stands.",
  ],
  payment: [
    "I can see the charge you're describing on {txn} — I can request that the duplicate authorisation is voided so the held amount is released back to you.",
    "If the second charge on {txn} hasn't settled, I can cancel it at our end and ask the bank for a release; I'll confirm what they come back with.",
    "I can raise the duplicate payment on {txn} for refund and flag the card record so it doesn't repeat on your next order.",
  ],
  tracking: [
    "Tracking for {order} looks stalled at the sorting hub — I can ask the carrier for a live scan and request a redelivery slot that suits you.",
    "{order} hasn't moved for {days} days, so instead of waiting on the search I can look at raising a replacement for you.",
    "It looks like {order} is sitting at the local depot; I can ask for it to be prioritised and get an updated tracking link sent to you.",
  ],
  delivery: [
    "I can request a faster service on {order} at no cost to you so it has the best chance of arriving before your deadline.",
    "The delay on {order} is on us — I can ask for it to go out on a priority service and look at what we can do to make up for it.",
    "I can request our fastest available service for {order} and check with the courier when collection is scheduled.",
  ],
  account: [
    "I can look at the lock on your account and clear the failed attempts so you can sign in with your existing password.",
    "Account locks like this are usually our security rules after repeated attempts — I can request the release and walk you through signing in.",
    "I can ask for the lock to be lifted and check the session settings so this doesn't keep happening.",
  ],
  password: [
    "I can walk you through requesting a fresh reset link and stay with you while you open it, so we know it works this time.",
    "If the earlier reset email has expired, the next one should arrive within a couple of minutes — check the promotions folder and tell me either way.",
    "I can look at why the reset request is getting stuck and guide you through it step by step until you're back in.",
  ],
  subscription: [
    "I can process the cancellation from today and check whether the charge on {txn} qualifies to come back to you.",
    "I can stop the renewal so nothing further is taken, and confirm how long your access runs.",
    "I can put the cancellation through and check the upcoming payment so you're not charged again.",
  ],
  damaged: [
    "That's not the condition {product} should arrive in — I can arrange a replacement and check whether you need to return the damaged one at all.",
    "I can request a free replacement for {order} on the quickest service available and log the damage with our packing team.",
    "I can look at a like-for-like replacement of {product}, or a refund with a prepaid label if you'd prefer that instead.",
  ],
  technical: [
    "As an immediate workaround, sign out and back in once — that clears the cached token. I can also raise the underlying issue with engineering and reference {order}.",
    "This looks like a known issue in the current build; updating to the latest version usually clears it, and I'll confirm here once I know more about a permanent fix.",
    "Let me try to reproduce the error on my side so we can rule out your setup, then get engineering involved and come back to you within 24 hours.",
  ],
  billing: [
    "I can raise the invoice on {txn} for correction and ask for the difference to be credited back to you, then send a revised invoice.",
    "The extra amount on {txn} looks like a rate applied in error — I can request the correction and check the rate on your account.",
    "I can request a reissued invoice with the right figures and check your next bill so nothing carries over.",
  ],
  shipping: [
    "You shouldn't have been charged express shipping for a standard delivery — I can raise that charge on {order} for refund.",
    "I can request the shipping cost on {order} back and look at the delivery option set on your account.",
    "I can put the shipping fee on {order} forward for refund and check what caused the wrong option to apply.",
  ],
  vip: [
    "As a priority account this should never have taken {days} days — I can get a named contact assigned and ask for {order} to be prioritised.",
    "I can escalate {order} to our senior team and ask what we can do to make up for the disruption.",
    "I'll handle {order} personally from here and check in with the fulfilment lead so it doesn't stall again.",
  ],
  complaint: [
    "You've had to repeat yourself and that's a failure on our side — I'll take ownership of {order} and can raise a formal complaint on your behalf.",
    "I can take this to the team lead so you get an outcome rather than another holding message.",
    "I'll document everything that's happened with {order} so you don't have to explain it again to anyone else.",
  ],
};

function buildDraftReply(
  issue: IssueKey,
  state: SimState,
  substitute: (t: string) => string,
  kbTitles: string[],
): string {
  const opener = pickFresh(DRAFT_OPENERS, state.usedCoaching);
  const action = pickFresh(DRAFT_BODIES[issue], state.usedCoaching);
  const closer = pickFresh(DRAFT_CLOSERS, state.usedCoaching);
  const grounded = kbTitles[0]
    ? ` I'm working from our "${kbTitles[0]}" guidance here, so you're getting the same answer anyone else would give you.`
    : "";
  return substitute(`${opener}\n\n${action}${grounded}\n\n${closer}`);
}

function buildCoaching(
  pb: Playbook,
  issue: IssueKey,
  state: SimState,
  evalResult: ReturnType<typeof evaluateAgentMessage>,
  kbTitles: string[],
  substitute: (t: string) => string,
): CoachingSuggestion {
  const stage = state.turn <= 1 ? 0 : state.turn <= 3 ? 1 : 2;
  const reasonBits: string[] = [];
  if (evalResult.empathyHits === 0) reasonBits.push("no explicit acknowledgement of how the customer feels");
  if (!evalResult.specificity) reasonBits.push("no concrete date, amount or reference number");
  if (!evalResult.grounded) reasonBits.push(`the retrieved article "${kbTitles[0] ?? "knowledge base"}" wasn't referenced`);
  if (evalResult.len < 12) reasonBits.push("the reply was very short for the weight of the issue");
  if (!reasonBits.length) reasonBits.push("the reply was empathetic, specific and grounded in the retrieved policy");

  return {
    suggested_response: buildDraftReply(issue, state, substitute, kbTitles),
    tone_notes: [
      pb.coaching[stage % pb.coaching.length],
      pb.coaching[(stage + 1) % pb.coaching.length],
    ],
    clarity_notes: [pickFresh(pb.clarity, state.usedCoaching)],
    grammar_notes: [
      evalResult.scores.grammar >= 90
        ? "Grammar and punctuation are clean — keep sentences at this length."
        : "Tighten punctuation and finish each sentence; a couple of run-ons crept in.",
    ],
    empathy_notes: [pickFresh(pb.empathy, state.usedCoaching)],
    professional_notes: [pickFresh(pb.professional, state.usedCoaching)],
    improvement_tips: [pickFresh(pb.tips, state.usedCoaching)],
    scores: evalResult.scores,
    coaching_score: evalResult.overall,
    score_reasoning: `Scored ${evalResult.overall}/100 for this ${pb.label.toLowerCase()} turn — ${reasonBits.join("; ")}. Knowledge grounding was measured against "${kbTitles.join('", "')}".`,
    next_best_action: pickFresh(pb.nextActions, state.usedCoaching),
    troubleshooting_recommendation: pb.troubleshooting,
    escalation_recommendation: pb.escalation,
  };
}


export function mockChatTurn(payload: {
  session_id: string;
  message: string;
  role: "customer" | "agent";
}): ChatTurnResponse {
  const now = new Date().toISOString();
  const state = stateFor(payload.session_id);
  state.turn += 1;

  const config = sessionConfigs.get(payload.session_id);
  const issue = resolveIssue(
    payload.role === "customer" ? payload.message : `${config?.scenario ?? ""} ${payload.message}`,
  );
  const pb = PLAYBOOKS[issue];
  const product = config?.product || "order";
  const persona = config?.persona || "Frustrated";
  const difficulty = config?.difficulty || "Medium";
  const difficultyWeight = difficulty === "Easy" ? 0.6 : difficulty === "Medium" ? 0.8 : difficulty === "Hard" ? 1 : 1.15;

  const knowledge = rankChunks(pb, state);
  const kbTitles = knowledge.map((c) => c.title);
  const evalResult = evaluateAgentMessage(payload.message, kbTitles);
  if (payload.role === "agent") rememberPromise(state, payload.message);

  // Emotional progression: good replies calm the customer, weak replies don't.
  const quality = (evalResult.overall - 60) / 40; // 0..1
  const delta = (0.22 * quality - 0.1) * (2 - difficultyWeight + 0.4);
  state.frustration = Math.max(0.08, Math.min(0.97, state.frustration - delta));
  state.scores.push(evalResult.overall);

  const calming = state.frustration < 0.4;
  const stagePool = state.turn <= 1 ? pb.openers : calming ? pb.softeners : pb.pressers;
  const substitute = (t: string) =>
    t
      .replace(/\{product\}/g, product)
      .replace(/\{order\}/g, state.facts.order)
      .replace(/\{txn\}/g, state.facts.txn)
      .replace(/\{name\}/g, state.facts.name)
      .replace(/\{days\}/g, String(state.facts.days))
      .replace(/\{nth\}/g, ["second", "third", "fourth", "fifth", "sixth"][(state.turn + Math.floor(Math.random() * 2)) % 5]);

  let line = composeCustomerLine(stagePool, calming, state, substitute);
  line = (PERSONA_VOICE[persona] ?? ((s: string) => s))(line);

  const simulatedCustomer =
    payload.role === "agent"
      ? {
          id: `m_${Math.random().toString(36).slice(2, 8)}`,
          role: "customer" as const,
          content: line,
          timestamp: new Date(Date.now() + 800).toISOString(),
        }
      : undefined;

  const frustration = Number(state.frustration.toFixed(2));
  const sentimentScore = Number((0.85 - frustration * 1.7).toFixed(2));
  const coaching = buildCoaching(pb, issue, state, evalResult, kbTitles, substitute);

  const probability = Number(Math.max(0.05, Math.min(0.96, frustration * 0.95 * difficultyWeight)).toFixed(2));
  const level: "low" | "medium" | "high" | "critical" =
    probability > 0.8 ? "critical" : probability > 0.6 ? "high" : probability > 0.35 ? "medium" : "low";

  return {
    turn: { id: `m_${Math.random().toString(36).slice(2, 8)}`, role: payload.role, content: payload.message, timestamp: now },
    simulated_customer_reply: simulatedCustomer,
    analysis: {
      intent: pb.intent,
      sentiment:
        sentimentScore < -0.4 ? "very_negative" : sentimentScore < 0 ? "negative" : sentimentScore < 0.3 ? "neutral" : "positive",
      sentiment_score: sentimentScore,
      frustration,
      urgency: Number(Math.min(0.97, 0.35 + frustration * 0.6 * difficultyWeight).toFixed(2)),
      confidence: Number((0.78 + Math.min(0.18, state.turn * 0.03)).toFixed(2)),
      satisfaction_trend:
        state.scores.length < 2
          ? "steady"
          : evalResult.overall >= state.scores[state.scores.length - 2]
            ? "improving"
            : "declining",
    },
    coaching,
    knowledge,
    risk: {
      probability,
      level,
      reasoning: `${pb.label}: frustration is at ${(frustration * 100).toFixed(0)}% on turn ${state.turn} with a ${difficulty.toLowerCase()} persona (${persona}). The agent's last reply scored ${evalResult.overall}/100${evalResult.specificity ? " and included a concrete commitment" : " but offered no concrete commitment"}.`,
      recommended_action: level === "low" ? pb.nextActions[0] : pb.escalation,
      repeated_complaints: Math.max(0, state.turn - 2),
      resolution_status: calming ? "in_progress" : "unresolved",
      signals: [
        `frustration ${(frustration * 100).toFixed(0)}%`,
        `turn ${state.turn}`,
        evalResult.grounded ? "knowledge grounded" : "no knowledge grounding",
      ],
    },
    agent_trace: [
      trace("Customer Simulator Agent", `Generated a ${persona.toLowerCase()} ${pb.label.toLowerCase()} reply (frustration ${(frustration * 100).toFixed(0)}%)`, 380),
      trace("Intent Detection Agent", `Detected ${pb.intent}`, 210),
      trace("Knowledge Recommendation Agent", `Ranked ${knowledge.length} documents, top match "${kbTitles[0]}"`, 160),
      trace("Coaching Agent", `Coaching score ${evalResult.overall}/100`, 540),
      trace("Escalation Risk Monitor Agent", `Escalation risk ${level} (${Math.round(probability * 100)}%)`, 190),
    ],
  };
}

function trace(agent: string, summary: string, base: number) {
  const ms = base + Math.floor(Math.random() * 120);
  const ts = new Date().toISOString();
  return {
    agent,
    status: "Completed" as const,
    execution_time: `${ms} ms`,
    execution_ms: ms,
    summary,
    timestamp: ts,
    started_at: ts,
    ended_at: ts,
  };
}

export function mockReport(session_id: string): Report {
  const state = simStates.get(session_id);
  const config = sessionConfigs.get(session_id);
  const pb = PLAYBOOKS[resolveIssue(config?.scenario ?? "complaint")];
  const avg = state?.scores.length
    ? Math.round(state.scores.reduce((a, b) => a + b, 0) / state.scores.length)
    : 87;
  return {
    session_id,
    summary: `${pb.label} raised on ${config?.product ?? "the customer's order"}. The conversation opened with high frustration and moved toward resolution as the agent gave concrete commitments. Average coaching score across the session was ${avg}/100.`,
    resolution_score: avg,
    sentiment_timeline: (state?.scores.length ? state.scores : [70, 74, 78, 83, 87]).map((s, i) => ({
      turn: i + 1,
      score: Number(((s - 75) / 25).toFixed(2)),
    })),
    intent_progression: [pb.intent, "Clarification", "Commitment request", "Resolution acceptance"],
    escalation_events: [
      { turn: 2, level: "high", reason: "Repeated frustration with no concrete commitment offered." },
      { turn: 4, level: "medium", reason: "Tone softened once a reference and date were given." },
    ],
    knowledge_used: pb.chunks,
    strengths: [pb.professional[0], pb.empathy[0]],
    weaknesses: [pb.clarity[0], "Knowledge base article was referenced late in the conversation."],
    improvements: pb.tips,
    recommendations: pb.nextActions,
  };
}

const days = (n: number) =>
  Array.from({ length: n }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (n - 1 - i));
    return d.toISOString().slice(5, 10);
  });

export const mockAnalytics: AnalyticsSummary = {
  total_sessions: 1247,
  avg_sentiment: 0.42,
  avg_resolution: 84,
  escalations: 38,
  csat: 4.6,
  sentiment_series: days(14).map((date, i) => ({ date, sentiment: 0.2 + Math.sin(i / 2) * 0.15 + i * 0.015 })),
  escalation_series: days(14).map((date, i) => ({
    date,
    escalations: Math.max(0, 8 - Math.floor(i / 2) + Math.floor(Math.random() * 3)),
  })),
  resolution_series: days(14).map((date, i) => ({ date, score: 70 + i * 1.1 + Math.random() * 6 })),
  intent_breakdown: [
    { intent: "Refund", count: 312 },
    { intent: "Technical", count: 268 },
    { intent: "Billing", count: 199 },
    { intent: "Account", count: 154 },
    { intent: "Shipping", count: 131 },
    { intent: "Other", count: 183 },
  ],
  knowledge_usage: [
    { source: "Refund Policy", uses: 421 },
    { source: "Shipping FAQs", uses: 318 },
    { source: "Product Manuals", uses: 264 },
    { source: "De-escalation", uses: 208 },
    { source: "Billing", uses: 141 },
  ],
  duration_series: days(14).map((date, i) => ({ date, minutes: 8 + Math.sin(i) * 2 + i * 0.1 })),
};

export const mockSettings: Settings = {
  gemini_api_key_masked: "••••••••••••7f2a",
  theme: "dark",
  language: "English",
  notifications: {
    escalation_alerts: true,
    session_summaries: true,
    weekly_digest: false,
  },
};
