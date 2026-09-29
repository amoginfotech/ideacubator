const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { GoogleGenerativeAI } = require("@google/generative-ai");

admin.initializeApp();

/**
 * 1. SECURE AI REVIEW CALLABLE FUNCTION
 * Receives founder profile and idea details from authenticated user.
 * Calls Gemini 1.5 Pro / Flash securely using server-side GEMINI_API_KEY.
 * Never exposes the Gemini key to the browser or client-side JavaScript.
 */
exports.reviewIdeaWithAI = functions
  .runWith({ secrets: ["GEMINI_API_KEY"], timeoutSeconds: 60 })
  .https.onCall(async (data, context) => {
    // Enforce authentication
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Authentication is required to request an AI idea review."
      );
    }

    const { profile, idea, extra } = data || {};
    if (!idea || !idea.description) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Idea description is required for review."
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("GEMINI_API_KEY secret not set. Returning structured fallback review.");
      return generateHeuristicReview(idea);
    }

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: "gemini-1.5-flash",
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.4
        },
        systemInstruction: `You are Ideacubator's founder-assistance reviewer. Review the founder's idea for clarity and completeness. Be constructive, concise, and specific. Identify what is clear, what is unclear, what assumptions need testing, and one practical next experiment. Do not assess investment-worthiness, promise funding, issue a valuation, give legal advice, or predict success. Return valid JSON matching the exact requested schema:
{
  "clarityScore": 1-10 number,
  "oneLineSummary": "string",
  "problemAssessment": "string",
  "customerAssessment": "string",
  "promisingPoints": ["string"],
  "openQuestions": ["string"],
  "nextExperiment": "string",
  "recommendedFounderActions": ["string"]
}`
      });

      const prompt = `Review this startup proposal:
Working Title: ${idea.title || "Untitled"}
Idea Description: ${idea.description}
Problem to Solve: ${idea.problem || "Not specified"}
Target Customer: ${idea.customer || "Not specified"}
Current Stage: ${idea.currentStage || "Idea only"}
Traction / Evidence: ${idea.traction || "None"}
Monetization Strategy: ${idea.monetization || "Not specified"}
Geography: ${idea.geography || "Not specified"}
Founder Background: ${profile?.role || "Not specified"}, ${profile?.experienceYears || "0"} years experience
User Situation: ${profile?.userType || "General founder"}
Additional Context: ${JSON.stringify(extra || {})}`;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      const parsed = JSON.parse(responseText);

      return parsed;
    } catch (err) {
      console.error("Gemini API execution error:", err);
      // Fallback cleanly so the founder flow is never halted
      return generateHeuristicReview(idea);
    }
  });

function generateHeuristicReview(idea) {
  const desc = idea.description || "";
  const wordCount = desc.split(/\s+/).filter(Boolean).length;
  const clarity = Math.min(9, Math.max(5, Math.floor(wordCount / 15) + (idea.problem ? 2 : 0)));

  return {
    clarityScore: clarity,
    oneLineSummary: `${idea.title || "The Venture"}: A solution targeting ${idea.customer || "key customers"} to solve ${idea.problem ? idea.problem.slice(0, 80) : "workflow inefficiencies"}.`,
    problemAssessment: idea.problem
      ? `The problem statement is articulated as: "${idea.problem.slice(0, 150)}". We recommend validating how urgently this pain is felt by current buyers.`
      : "The problem needs sharper definition. Explain exactly what is broken, slow, or expensive today.",
    customerAssessment: idea.customer
      ? `Target customer identified as "${idea.customer}". Confirming their budget authority and decision-making cycle is recommended.`
      : "Specify the exact user persona who feels this pain most acutely and who will pay for the solution.",
    promisingPoints: [
      "Addresses a clear domain workflow opportunity.",
      `Positioned at the ${idea.currentStage || "early"} development stage.`,
      "Clean initial founder articulation."
    ],
    openQuestions: [
      "What is the single most compelling reason a customer switches from their existing workaround today?",
      "What does the first 30-day user journey look like before full automation?",
      "What is your unfair advantage in reaching the first 10 paying customers?"
    ],
    nextExperiment: "Conduct 5 structured 20-minute discovery interviews with target buyers without pitching the solution—test only whether the problem is in their top 3 priorities this quarter.",
    recommendedFounderActions: [
      "Document the exact manual steps of how users currently solve this.",
      "Define a lightweight MVP scope that can be tested in 2–4 weeks.",
      "Refine the pricing hypothesis before building custom infrastructure."
    ]
  };
}

/**
 * 2. ADMIN CUSTOM CLAIM MANAGER
 * Allows verified existing admins to assign or revoke admin custom claims.
 */
exports.setAdminClaim = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Authentication required.");
  }

  const callerUid = context.auth.uid;
  const caller = await admin.auth().getUser(callerUid);
  const callerClaims = caller.customClaims || {};

  // Check if caller is admin or matches primary admin email
  if (!callerClaims.admin && caller.email !== "admin@ideacubator.in") {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Only verified administrators can assign admin privileges."
    );
  }

  const targetEmail = data.email;
  const isAdmin = data.isAdmin === true;

  if (!targetEmail) {
    throw new functions.https.HttpsError("invalid-argument", "Target email is required.");
  }

  try {
    const targetUser = await admin.auth().getUserByEmail(targetEmail);
    await admin.auth().setCustomUserClaims(targetUser.uid, { admin: isAdmin });

    // Also update users collection for quick lookup
    await admin.firestore().collection("users").doc(targetUser.uid).set(
      { role: isAdmin ? "admin" : "founder" },
      { merge: true }
    );

    return {
      success: true,
      uid: targetUser.uid,
      message: `Admin claim ${isAdmin ? "granted" : "revoked"} for ${targetEmail}`
    };
  } catch (err) {
    throw new functions.https.HttpsError("unknown", err.message, err);
  }
});

/**
 * 3. APPLICATION STATUS AUDIT LOG TRIGGER
 * Automatically logs every status change to status_history collection.
 */
exports.onApplicationStatusChange = functions.firestore
  .document("applications/{appId}")
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();

    const oldStatus = before?.metadata?.status;
    const newStatus = after?.metadata?.status;

    if (!oldStatus || !newStatus || oldStatus === newStatus) {
      return null;
    }

    try {
      await admin.firestore().collection("status_history").add({
        applicationId: context.params.appId,
        oldStatus: oldStatus,
        newStatus: newStatus,
        changedAt: admin.firestore.FieldValue.serverTimestamp(),
        applicantUid: after.applicantUid || null
      });
      console.log(`Application ${context.params.appId} status updated: ${oldStatus} -> ${newStatus}`);
    } catch (err) {
      console.error("Failed to append status_history:", err);
    }

    return null;
  });

/**
 * 4. NOTIFY ON APPLICATION SUBMISSION (submitidea@ideacubator.in)
 */
exports.onApplicationCreated = functions.firestore
  .document("applications/{appId}")
  .onCreate(async (snap, context) => {
    const data = snap.data();
    const founderName = data?.profile?.fullName || "Founder";
    const founderEmail = data?.profile?.email || "No email";
    const ideaTitle = data?.idea?.title || "Untitled";

    console.log(`[ALERT] New Application submitted: "${ideaTitle}" by ${founderName} (${founderEmail})`);
    console.log(`[TARGET NOTIFICATION EMAIL] -> submitidea@ideacubator.in`);

    // Record notification event in notifications collection
    try {
      await admin.firestore().collection("notifications").add({
        targetEmail: "submitidea@ideacubator.in",
        type: "new_application",
        applicationId: context.params.appId,
        title: `New Idea Submission: ${ideaTitle}`,
        body: `Submitted by ${founderName} (${founderEmail})`,
        read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
    } catch (err) {
      console.error("Failed to write notification:", err);
    }

    return null;
  });

/**
 * 5. NOTIFY ON INVESTOR INQUIRY (invest@ideacubator.in)
 */
exports.onInvestorInquiryCreated = functions.firestore
  .document("investorInquiries/{inqId}")
  .onCreate(async (snap, context) => {
    const data = snap.data();
    const name = data?.name || "Investor";
    const firm = data?.firm || "Individual";
    const email = data?.email || "No email";

    console.log(`[ALERT] New Investor Inquiry from ${name} (${firm}) - ${email}`);
    console.log(`[TARGET NOTIFICATION EMAIL] -> invest@ideacubator.in`);

    try {
      await admin.firestore().collection("notifications").add({
        targetEmail: "invest@ideacubator.in",
        type: "investor_inquiry",
        inquiryId: context.params.inqId,
        title: `New Investor Profile: ${name} (${firm})`,
        body: `Contact: ${email} · Ticket size: ${data?.ticketSize || 'Not specified'}`,
        read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
    } catch (err) {
      console.error("Failed to write investor notification:", err);
    }

    return null;
  });

