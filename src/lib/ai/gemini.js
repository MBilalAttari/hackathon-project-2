import { GoogleGenAI } from "@google/genai";
import { AI_TOOL_DEFINITIONS, executeAITool } from "./tools";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

/**
 * Handle AI query using hosted LLM with tool calling, with graceful server fallback
 */
export async function processAIChat({ message, chatHistory = [], userSession }) {
  if (!userSession) {
    return {
      reply: "Please log in to use the HCM Lite AI Assistant.",
      draftAction: null,
    };
  }

  // 1. If GEMINI_API_KEY is configured, use official Google GenAI SDK
  if (GEMINI_API_KEY && GEMINI_API_KEY !== "your-gemini-api-key") {
    try {
      const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
      
      const systemInstruction = `You are HCM Lite Assistant, an intelligent HR and Human Capital Management copilot for ${userSession.name || "the user"} (Role: ${userSession.role || "Employee"}).
Rules:
1. Always enforce strict confidentiality and security. Employees can only view their own records. HR/Admin can view org-wide summaries.
2. When an employee asks to apply for or take leave, ALWAYS use the 'draft_leave_request' tool. You MUST NEVER state that the leave is submitted or approved; explain that a draft has been prepared for their confirmation.
3. Keep answers concise, helpful, and professional.
4. Current date is ${new Date().toISOString().slice(0, 10)}.`;

      // Format tools for GenAI SDK
      const functionDeclarations = AI_TOOL_DEFINITIONS.map(t => ({
        name: t.name,
        description: t.description,
        parameters: t.parameters,
      }));

      const model = "gemini-2.5-flash";
      const response = await ai.models.generateContent({
        model,
        contents: [
          ...chatHistory.slice(-6).map(h => ({
            role: h.role === "user" ? "user" : "model",
            parts: [{ text: h.content }],
          })),
          { role: "user", parts: [{ text: message }] },
        ],
        config: {
          systemInstruction,
          tools: [{ functionDeclarations }],
        },
      });

      // Check for tool call
      const candidate = response?.candidates?.[0];
      const functionCalls = candidate?.content?.parts?.filter(p => p.functionCall);

      if (functionCalls && functionCalls.length > 0) {
        const call = functionCalls[0].functionCall;
        const toolResult = await executeAITool(call.name, call.args || {}, userSession);

        if (toolResult.requiresUserConfirmation) {
          return {
            reply: toolResult.message || `I have prepared your ${toolResult.draft?.leaveType} leave draft. Please review and confirm below.`,
            draftAction: toolResult,
            toolUsed: call.name,
          };
        }

        // Return tool execution data formatted nicely
        const followUp = await ai.models.generateContent({
          model,
          contents: [
            { role: "user", parts: [{ text: message }] },
            { role: "model", parts: [{ functionCall: call }] },
            {
              role: "user",
              parts: [{
                functionResponse: {
                  name: call.name,
                  response: { result: toolResult },
                },
              }],
            },
          ],
          config: { systemInstruction },
        });

        return {
          reply: followUp?.text || JSON.stringify(toolResult, null, 2),
          toolUsed: call.name,
          toolData: toolResult,
          draftAction: null,
        };
      }

      if (response?.text) {
        return {
          reply: response.text,
          draftAction: null,
        };
      }
    } catch (err) {
      console.warn("Gemini API error, falling back to local processor:", err.message);
    }
  }

  // 2. Resilient Server-Side Intelligent Processor & Tool Executor
  return await processLocalAI(message, userSession);
}

/**
 * Intelligent Server-Side Rule & Pattern Processor
 * Guarantees that even without external API quotas/keys, tools execute accurately and leave forms draft securely!
 */
async function processLocalAI(message, userSession) {
  const text = message.toLowerCase().trim();

  // Pattern A: Leave Application / Drafting
  // Matches: "apply leave", "need leave", "sick leave", "casual leave", "take off", "days off"
  const isLeaveDraftQuery =
    (text.includes("leave") && (text.includes("apply") || text.includes("need") || text.includes("take") || text.includes("request"))) ||
    text.includes("day off") ||
    text.includes("off tomorrow") ||
    text.includes("flu") ||
    text.includes("fever") ||
    text.includes("sick");

  if (isLeaveDraftQuery && !text.includes("policy") && !text.includes("balance") && !text.includes("how many")) {
    let leaveType = "casual";
    if (text.includes("sick") || text.includes("ill") || text.includes("flu") || text.includes("fever") || text.includes("doctor")) {
      leaveType = "sick";
    } else if (text.includes("annual") || text.includes("vacation") || text.includes("holiday")) {
      leaveType = "annual";
    } else if (text.includes("unpaid")) {
      leaveType = "unpaid";
    }

    // Try to extract dates or default to tomorrow
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const dateMatches = message.match(/\b\d{4}-\d{2}-\d{2}\b/g);
    let startDate = dateMatches ? dateMatches[0] : tomorrow.toISOString().slice(0, 10);
    let endDate = dateMatches && dateMatches[1] ? dateMatches[1] : startDate;

    if (text.includes("2 days") || text.includes("two days")) {
      const end = new Date(startDate);
      end.setDate(end.getDate() + 1);
      endDate = end.toISOString().slice(0, 10);
    } else if (text.includes("3 days") || text.includes("three days")) {
      const end = new Date(startDate);
      end.setDate(end.getDate() + 2);
      endDate = end.toISOString().slice(0, 10);
    }

    const reason = message.replace(/(i need|i want to apply for|leave|please|from|to|\d{4}-\d{2}-\d{2})/gi, "").trim() ||
      `${leaveType.charAt(0).toUpperCase() + leaveType.slice(1)} leave request`;

    const toolResult = await executeAITool(
      "draft_leave_request",
      { leaveType, startDate, endDate, reason },
      userSession
    );

    return {
      reply: toolResult.message,
      draftAction: toolResult,
      toolUsed: "draft_leave_request",
    };
  }

  // Pattern B: Leave Balance Inquiry
  const isBalanceQuery =
    text.includes("balance") ||
    text.includes("quota") ||
    text.includes("remaining") ||
    (text.includes("how many") && (text.includes("leave") || text.includes("casual") || text.includes("sick") || text.includes("annual") || text.includes("left")));

  if (isBalanceQuery) {
    const data = await executeAITool("get_my_leave_balances", {}, userSession);
    if (data.error) return { reply: data.error };
    const b = data.balances || {};
    return {
      reply: `Here are your current leave balances, ${data.employeeName}:\n• **Annual Leave:** ${b.annual} days\n• **Casual Leave:** ${b.casual} days\n• **Sick Leave:** ${b.sick} days\n• **Unpaid Leave Taken:** ${b.unpaid || 0} days\n\nWould you like me to draft a leave application for you?`,
      toolUsed: "get_my_leave_balances",
      toolData: data,
    };
  }

  // Pattern C: Attendance summary
  if (text.includes("my attendance") || text.includes("attendance summary") || text.includes("hours worked") || text.includes("how many days was i late")) {
    const data = await executeAITool("get_my_attendance_summary", {}, userSession);
    return {
      reply: `Here is your attendance summary for ${data.month}:\n• **Present Days:** ${data.presentDays}\n• **Late Days:** ${data.lateDays}\n• **Half Days:** ${data.halfDays}\n• **Total Hours Logged:** ${data.totalHoursWorked} hrs\n• **Average Daily Hours:** ${data.averageHoursPerDay} hrs`,
      toolUsed: "get_my_attendance_summary",
      toolData: data,
    };
  }

  // Pattern D: Organization Summary (Authorized for HR/Admin)
  if (text.includes("org summary") || text.includes("headcount") || text.includes("how many employees") || text.includes("total staff") || text.includes("today's attendance")) {
    const data = await executeAITool("get_org_summary", {}, userSession);
    if (data.error) {
      return { reply: `🔒 ${data.error}` };
    }
    return {
      reply: `**Organization Overview:**\n• **Total Headcount:** ${data.totalHeadcount} employees (${data.activeEmployees} Active)\n• **Today's Attendance:** ${data.todayAttendanceCount} logged in (${data.todayAttendanceRate})\n• **Pending Leave Requests:** ${data.pendingLeaveRequests}\n• **Processed Payroll Runs:** ${data.totalPayrollRuns}`,
      toolUsed: "get_org_summary",
      toolData: data,
    };
  }

  // Pattern E: Tax & Salary calculation
  if (text.includes("tax") || text.includes("salary formula") || text.includes("slab") || text.includes("deduction")) {
    const numMatch = text.match(/\d{5,8}/);
    const gross = numMatch ? Number(numMatch[0]) : 200000;
    const data = await executeAITool("explain_tax_and_salary", { monthlyGross: gross }, userSession);
    return {
      reply: `**Salary & Tax Breakdown for PKR ${gross.toLocaleString()} / month:**\n\n• **Annual Income:** PKR ${data.annualIncome.toLocaleString()}\n• **Applicable Slab:** ${data.taxSlab}\n• **Estimated Monthly Tax:** PKR ${data.monthlyTaxDeduction.toLocaleString()}\n• **Estimated Net Take-Home:** PKR ${data.netTakeHome.toLocaleString()}\n\n**Standard Allowances Structure:**\n- Basic Salary (60%): PKR ${data.salaryBreakdown.basicSalary.toLocaleString()}\n- House Rent (20%): PKR ${data.salaryBreakdown.houseRentAllowance.toLocaleString()}\n- Medical (10%): PKR ${data.salaryBreakdown.medicalAllowance.toLocaleString()}`,
      toolUsed: "explain_tax_and_salary",
      toolData: data,
    };
  }

  // Pattern F: Company Policy & Office Hours
  if (text.includes("policy") || text.includes("timing") || text.includes("hours") || text.includes("grace period") || text.includes("half day") || text.includes("rules")) {
    const data = await executeAITool("get_company_policy", {}, userSession);
    return {
      reply: `**${data.companyName} Policies:**\n\n• **Standard Hours:** ${data.workHours}\n• **Grace Period:** ${data.gracePeriod}\n• **Half-Day Cutoff:** ${data.halfDayHours}\n• **Annual Quotas:** ${data.annualLeaveQuota} Annual, ${data.casualLeaveQuota} Casual, ${data.sickLeaveQuota} Sick\n• **Payroll Cycle:** ${data.payrollCycle}\n• **Taxation:** Progressive Pakistani / standard slabs`,
      toolUsed: "get_company_policy",
      toolData: data,
    };
  }

  // Fallback general assistance
  return {
    reply: `Hello ${userSession.name || "there"}! I am your HCM Lite AI Assistant. You can ask me to:\n\n1. **Draft a leave request:** "I need 2 days sick leave from tomorrow due to flu"\n2. **Check your leave balances:** "How many casual leaves do I have left?"\n3. **View attendance summary:** "Show my attendance for this month"\n4. **Company policies:** "What are the office hours and grace period?"\n5. **Tax & salary explanation:** "How is tax calculated on 250,000?"${userSession.role !== "Employee" ? '\n6. **Org stats (HR/Admin):** "Give me headcount and attendance summary"' : ""}`,
    draftAction: null,
  };
}
