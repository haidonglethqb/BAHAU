import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { tsImport } from "tsx/esm/api";

async function loadApiModule(relTsPath) {
  return tsImport(relTsPath, import.meta.url);
}

async function runTests() {
  console.log("================================================================================");
  console.log("  BAHAU AI Agent (MORI Pattern) Comprehensive Verification Suite");
  console.log("================================================================================");

  const { AiSsrfValidator, isPrivateOrReservedIp } = await loadApiModule(
    "../apps/api/src/services/ai/ai-ssrf-validator.ts"
  );
  const { AiConfigService } = await loadApiModule(
    "../apps/api/src/services/ai/ai-config.service.ts"
  );
  const { AiQuotaService } = await loadApiModule(
    "../apps/api/src/services/ai/ai-quota.service.ts"
  );
  const { getToolsForUser, ALL_AGENT_TOOLS } = await loadApiModule(
    "../apps/api/src/services/ai/agent-tool-registry.ts"
  );
  const { AgentToolExecutorService } = await loadApiModule(
    "../apps/api/src/services/ai/agent-tool-executor.service.ts"
  );
  const { parseOpenAiSseStream } = await loadApiModule(
    "../apps/api/src/services/ai/agent-stream-parser.ts"
  );
  const { AgentLoopService } = await loadApiModule(
    "../apps/api/src/services/ai/agent-loop.service.ts"
  );
  const { runAgentDeterministicFallback, searchPoliciesLocalAndDb } = await loadApiModule(
    "../apps/api/src/services/ai/agent-fallback.ts"
  );

  // --------------------------------------------------------------------------
  // 1. SSRF Validator
  // --------------------------------------------------------------------------
  console.log("\n-> TC-AI-01: SSRF validation (protocol, private IP, host allowlist)...");

  assert.strictEqual(isPrivateOrReservedIp("127.0.0.1"), true);
  assert.strictEqual(isPrivateOrReservedIp("10.0.0.5"), true);
  assert.strictEqual(isPrivateOrReservedIp("172.16.0.1"), true);
  assert.strictEqual(isPrivateOrReservedIp("192.168.1.10"), true);
  assert.strictEqual(isPrivateOrReservedIp("169.254.169.254"), true);
  assert.strictEqual(isPrivateOrReservedIp("::1"), true);
  assert.strictEqual(isPrivateOrReservedIp("8.8.8.8"), false);

  const httpCheck = await AiSsrfValidator.validateTargetUrl("http://api.openai.com/v1");
  assert.strictEqual(httpCheck.valid, false, "HTTP must be rejected");

  const localhostCheck = await AiSsrfValidator.validateTargetUrl("https://localhost/v1");
  assert.strictEqual(localhostCheck.valid, false, "localhost must be rejected");

  const loopbackCheck = await AiSsrfValidator.validateTargetUrl("https://127.0.0.1/v1");
  assert.strictEqual(loopbackCheck.valid, false, "127.0.0.1 must be rejected");

  const metadataCheck = await AiSsrfValidator.validateTargetUrl("https://169.254.169.254/latest/meta-data");
  assert.strictEqual(metadataCheck.valid, false, "Metadata IP must be rejected");

  const evilHostCheck = await AiSsrfValidator.validateTargetUrl("https://evil.example.com/v1");
  assert.strictEqual(evilHostCheck.valid, false, "Non-whitelisted host must be rejected");

  console.log("   ✓ SSRF protection blocks http://, localhost, 127.0.0.1, 169.254.169.254, and unwhitelisted hosts");

  // --------------------------------------------------------------------------
  // 2. AiConfigService Secret Masking & AES-256-GCM Persistence Across Restart
  // --------------------------------------------------------------------------
  console.log("\n-> TC-AI-02: AiConfigService AES-256-GCM encryption & persistence across restart...");

  const tempDir = mkdtempSync(join(tmpdir(), "bahau-ai-cfg-"));
  const cfgPath = join(tempDir, "ai-config.json");
  const quotaPath = join(tempDir, "ai-quota.json");

  try {
    const cfgService = new AiConfigService(cfgPath);
    cfgService.updateConfig({
      provider: "CODEX",
      codexApiKey: "sk-test-secret-key-987654321",
      groqApiKey: "gsk_test_groq_key_123456789",
      codexBaseUrl: "https://api.openai.com/v1",
      codexPrimaryModel: "gpt-4o",
      defaultUserDailyLimit: 25,
    });

    const masked = cfgService.getMaskedConfig();
    assert.strictEqual(masked.hasCodexApiKey, true);
    assert.strictEqual(masked.hasGroqApiKey, true);
    assert.ok(!masked.codexApiKeyMasked.includes("987654321"), "Masked key must not expose middle secret");
    assert.ok(masked.codexApiKeyMasked.endsWith("4321"));
    assert.ok(masked.groqApiKeyMasked.endsWith("6789"));
    assert.strictEqual(masked.defaultUserDailyLimit, 25);

    assert.ok(existsSync(cfgPath), "Config file must be persisted");
    const diskContent = readFileSync(cfgPath, "utf-8");
    assert.ok(!diskContent.includes("sk-test-secret-key"), "Plaintext codexApiKey must NEVER be written to disk");
    assert.ok(!diskContent.includes("gsk_test_groq_key"), "Plaintext groqApiKey must NEVER be written to disk");

    const parsedDisk = JSON.parse(diskContent);
    assert.strictEqual(parsedDisk.codexApiKey, undefined, "codexApiKey must not be in disk JSON");
    assert.strictEqual(parsedDisk.groqApiKey, undefined, "groqApiKey must not be in disk JSON");
    assert.ok(typeof parsedDisk.codexApiKeyEnc === "string" && parsedDisk.codexApiKeyEnc.startsWith("enc:v1:"), "codexApiKeyEnc must be AES-256-GCM encrypted");
    assert.ok(typeof parsedDisk.groqApiKeyEnc === "string" && parsedDisk.groqApiKeyEnc.startsWith("enc:v1:"), "groqApiKeyEnc must be AES-256-GCM encrypted");
    assert.strictEqual(parsedDisk.codexPrimaryModel, "gpt-4o");

    // Simulate server restart: create a new AiConfigService instance with same config path
    const restartedCfgService = new AiConfigService(cfgPath);
    const restartedMasked = restartedCfgService.getMaskedConfig();
    assert.strictEqual(restartedMasked.hasCodexApiKey, true, "Recovered config must know codexApiKey is set");
    assert.strictEqual(restartedMasked.hasGroqApiKey, true, "Recovered config must know groqApiKey is set");
    assert.ok(restartedMasked.codexApiKeyMasked.endsWith("4321"));
    assert.ok(restartedMasked.groqApiKeyMasked.endsWith("6789"));

    const decryptedRuntimeConfig = restartedCfgService.getConfig();
    assert.strictEqual(decryptedRuntimeConfig.codexApiKey, "sk-test-secret-key-987654321", "Decrypted codexApiKey must match original key");
    assert.strictEqual(decryptedRuntimeConfig.groqApiKey, "gsk_test_groq_key_123456789", "Decrypted groqApiKey must match original key");

    console.log("   ✓ Plaintext keys are stripped from disk; AES-256-GCM encrypted keys survive server restart");

    // --------------------------------------------------------------------------
    // 3. AiQuotaService Daily Limits & Persistence Across Restart
    // --------------------------------------------------------------------------
    console.log("\n-> TC-AI-03: AiQuotaService daily rate limiting & persistence across restart...");

    const testUserQuotaId = "usr-test-quota-emp";
    restartedCfgService.setUserDailyLimit(testUserQuotaId, 2);

    const quotaService1 = new AiQuotaService(restartedCfgService, quotaPath);
    const firstReserve = quotaService1.reserve(testUserQuotaId);
    assert.strictEqual(firstReserve.used, 1);
    assert.strictEqual(firstReserve.limit, 2);

    const secondReserve = quotaService1.reserve(testUserQuotaId);
    assert.strictEqual(secondReserve.used, 2);
    assert.strictEqual(secondReserve.limit, 2);

    // Verify persisted on disk
    assert.ok(existsSync(quotaPath), "Quota file must exist on disk");
    const quotaDiskRaw = readFileSync(quotaPath, "utf-8");
    const quotaParsed = JSON.parse(quotaDiskRaw);
    const matchingKey = Object.keys(quotaParsed).find((k) => k.startsWith(`${testUserQuotaId}:`));
    assert.ok(matchingKey, "Quota disk file must contain entry for user bucket");
    assert.strictEqual(quotaParsed[matchingKey], 2, "Persisted usage count must be 2");

    // Simulate server restart: instantiate a new AiQuotaService from the same quotaPath
    const restartedQuotaService = new AiQuotaService(restartedCfgService, quotaPath);
    const usageAfterRestart = restartedQuotaService.getUsage(testUserQuotaId);
    assert.strictEqual(usageAfterRestart.used, 2, "Usage count must survive server restart");
    assert.strictEqual(usageAfterRestart.limit, 2);

    // Exceeding quota must throw 429 AI_QUOTA_EXCEEDED
    let quotaExceededThrown = false;
    try {
      restartedQuotaService.reserve(testUserQuotaId);
    } catch (err) {
      quotaExceededThrown = true;
      assert.strictEqual(err.statusCode, 429);
      assert.strictEqual(err.code, "AI_QUOTA_EXCEEDED");
    }
    assert.strictEqual(quotaExceededThrown, true, "Must throw 429 AI_QUOTA_EXCEEDED when daily limit is reached");

    console.log("   ✓ AiQuotaService persists daily counters and strictly enforces 429 AI_QUOTA_EXCEEDED");
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }

  // --------------------------------------------------------------------------
  // 4. Vietnamese Accent-Insensitive RAG Policy Matching
  // --------------------------------------------------------------------------
  console.log("\n-> TC-AI-04: Accent-insensitive Vietnamese RAG matching...");

  // Query 1: Unaccented query for attendance / late arrival
  const attPolicies = await searchPoliciesLocalAndDb("di tre bi tru luong");
  assert.ok(attPolicies.length > 0, "Must return policy results for 'di tre bi tru luong'");
  assert.strictEqual(
    attPolicies[0].documentNo,
    "CC-DAU-2026",
    `Top policy for 'di tre bi tru luong' must be CC-DAU-2026, got ${attPolicies[0].documentNo}`
  );

  // Query 2: Unaccented query for personal income tax
  const taxPolicies = await searchPoliciesLocalAndDb("thue tncn");
  assert.ok(taxPolicies.length > 0, "Must return policy results for 'thue tncn'");
  assert.strictEqual(
    taxPolicies[0].documentNo,
    "TNCN-TT111",
    `Top policy for 'thue tncn' must be TNCN-TT111, got ${taxPolicies[0].documentNo}`
  );

  console.log("   ✓ Unaccented queries 'di tre bi tru luong' -> CC-DAU-2026 and 'thue tncn' -> TNCN-TT111 match accurately");

  // --------------------------------------------------------------------------
  // 5. RBAC Enforcement on 13 Agent Tools & Attendance Adjustment Draft
  // --------------------------------------------------------------------------
  console.log("\n-> TC-AI-05: RBAC enforcement on 13 tools, HR-only tools & Attendance Adjustment draft...");

  assert.strictEqual(ALL_AGENT_TOOLS.length, 13, "Total agent tools registered must be exactly 13");

  const employeeUser = {
    id: "usr-emp-1",
    email: "employee@dau.edu.vn",
    employeeId: "DAU260003-ID",
    employeeCode: "DAU260003",
    fullName: "ThS. Nguyễn Văn An",
    roles: ["ROLE_EMPLOYEE"],
    permissions: ["ai:chat"],
    unitsManaged: [],
  };

  const hrUser = {
    id: "usr-hr-1",
    email: "hrspecialist@dau.edu.vn",
    employeeId: "DAU260008-ID",
    employeeCode: "DAU260008",
    fullName: "ThS. Lê Minh Cường",
    roles: ["ROLE_HR_OFFICER"],
    permissions: ["ai:chat"],
    unitsManaged: [],
  };

  const empTools = getToolsForUser(employeeUser);
  const empToolNames = empTools.map((t) => t.function.name);
  assert.strictEqual(empTools.length, 8, "Employee must have exactly 8 non-HR tools");
  assert.ok(!empToolNames.includes("search_employee_info"), "Employee must NOT have search_employee_info");
  assert.ok(!empToolNames.includes("get_employee_payroll_attendance"), "Employee must NOT have get_employee_payroll_attendance");
  assert.ok(empToolNames.includes("propose_attendance_adjustment"), "Employee must have propose_attendance_adjustment");

  const hrTools = getToolsForUser(hrUser);
  const hrToolNames = hrTools.map((t) => t.function.name);
  assert.strictEqual(hrTools.length, 13, "HR Officer must have all 13 tools");
  assert.ok(hrToolNames.includes("search_employee_info"), "HR Officer must have search_employee_info");
  assert.ok(hrToolNames.includes("get_employee_payroll_attendance"), "HR Officer must have get_employee_payroll_attendance");

  const executor = new AgentToolExecutorService();

  // Test unauthorized execution attempts by employee
  const empExecSearch = await executor.execute("search_employee_info", { query: "Nguyễn" }, employeeUser);
  assert.ok(empExecSearch.output.error, "Employee execution of search_employee_info must return error");
  assert.ok(String(empExecSearch.output.error).includes("FORBIDDEN"));

  const empExecPayroll = await executor.execute(
    "get_employee_payroll_attendance",
    { employeeCode: "DAU260001", month: 9, year: 2026 },
    employeeUser
  );
  assert.ok(empExecPayroll.output.error, "Employee execution of get_employee_payroll_attendance must return error");
  assert.ok(String(empExecPayroll.output.error).includes("FORBIDDEN"));

  // Test authorized execution by HR Officer (with unaccented fallback dataset when DB offline)
  const hrExecSearch = await executor.execute("search_employee_info", { query: "Nguyen Van An" }, hrUser);
  assert.ok(!hrExecSearch.output.error, "HR execution of search_employee_info must succeed");
  assert.ok(Array.isArray(hrExecSearch.output.employees), "Should return employees array");
  assert.ok(hrExecSearch.output.employees.length > 0, "Unaccented search 'Nguyen Van An' must return at least 1 match");
  assert.strictEqual(hrExecSearch.output.employees[0].employeeCode, "DAU260003");

  const hrExecPayroll = await executor.execute(
    "get_employee_payroll_attendance",
    { employeeCode: "DAU260001", month: 9, year: 2026 },
    hrUser
  );
  assert.ok(!hrExecPayroll.output.error, "HR execution of get_employee_payroll_attendance must succeed");
  assert.ok(hrExecPayroll.output.employee, "Should return employee profile");
  assert.ok(hrExecPayroll.output.payslip?.insurableBase !== undefined, "Payslip must include insurableBase");
  assert.ok(hrExecPayroll.output.payslip?.actualWorkDays !== undefined, "Payslip must include actualWorkDays");

  // Test propose_attendance_adjustment rejects invalid time "25:99"
  const invalidTimeAdjust = await executor.execute(
    "propose_attendance_adjustment",
    {
      workDate: "2026-11-20",
      requestedCheckIn: "25:99",
      reason: "Quên quẹt thẻ vào sáng",
    },
    employeeUser
  );
  assert.ok(invalidTimeAdjust.output.error, "Invalid time '25:99' must be rejected with error");

  // Test propose_attendance_adjustment for employee
  const adjustResult = await executor.execute(
    "propose_attendance_adjustment",
    {
      workDate: "2026-11-20",
      requestedCheckIn: "08:00",
      requestedCheckOut: "17:00",
      reason: "Quên quẹt thẻ do tiếp khách Đoàn công tác ĐH Kiến trúc Hà Nội",
    },
    employeeUser
  );
  assert.strictEqual(adjustResult.action?.type, "ATTENDANCE_ADJUSTMENT_DRAFT");
  assert.strictEqual(adjustResult.action?.status, "CONFIRMATION_REQUIRED");
  assert.strictEqual(adjustResult.action?.payload?.workDate, "2026-11-20");
  assert.strictEqual(adjustResult.action?.payload?.requestedCheckIn, "08:00");
  assert.strictEqual(adjustResult.action?.payload?.requestedCheckOut, "17:00");

  console.log("   ✓ RBAC verified on 13 tools, employee access denied, HR officer queries work, and attendance draft generated");

  // --------------------------------------------------------------------------
  // 6. Live SSE Streaming Text Delta & Followups Suppression
  // --------------------------------------------------------------------------
  console.log("\n-> TC-AI-06: Live SSE streaming text delta & followups tag suppression...");

  const deltaChunks = [
    'data: {"choices":[{"delta":{"content":"Chào bạn, theo quy định "}}]}\n\n',
    'data: {"choices":[{"delta":{"content":"CC-DAU-2026, đi muộn phải làm "}}]}\n\n',
    'data: {"choices":[{"delta":{"content":"giải trình trong 48 giờ.\\n"}}]}\n\n',
    'data: {"choices":[{"delta":{"content":"[followups: Làm giải trình công | Xem quy chế]"}}]}\n\n',
    "data: [DONE]\n\n",
  ];

  const encoder = new TextEncoder();
  const textStream = new ReadableStream({
    start(controller) {
      for (const chunk of deltaChunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });

  const streamedTextDeltas = [];
  const statusHints = [];
  const parsedStreamResult = await parseOpenAiSseStream(
    textStream,
    (msg) => statusHints.push(msg),
    undefined,
    (deltaText) => streamedTextDeltas.push(deltaText)
  );

  const fullReceivedTextDelta = streamedTextDeltas.join("");
  assert.ok(
    fullReceivedTextDelta.includes("Chào bạn, theo quy định CC-DAU-2026, đi muộn phải làm giải trình trong 48 giờ."),
    "Full stream text delta should contain clean content"
  );
  assert.ok(
    !fullReceivedTextDelta.includes("[FOLLOWUPS:"),
    "Streamed text deltas must NOT expose [FOLLOWUPS: tag to client"
  );
  assert.ok(
    !fullReceivedTextDelta.includes("Làm giải trình công"),
    "Followups options must be suppressed from live text stream"
  );
  assert.ok(
    parsedStreamResult.content.toUpperCase().includes("[FOLLOWUPS:"),
    "Returned content property retains full content for downstream extractor"
  );

  console.log("   ✓ Live text delta callback receives clean text and completely filters out [FOLLOWUPS:...]");

  // --------------------------------------------------------------------------
  // 7. SSE Tool Call Chunking + Multi-Step ReAct Agent Loop + Deterministic Fallback
  // --------------------------------------------------------------------------
  console.log("\n-> TC-AI-07: SSE chunked tool calls, ReAct loop & Tier-4 fallback...");

  // 7a. Test parseOpenAiSseStream with chunked tool_calls SSE
  const sseChunks = [
    'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"id":"call_1","type":"function","function":{"name":"search_dau_policies","arguments":"{\\"query\\":\\"giờ"}}]}}]}\n\n',
    'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"function":{"arguments":" chuẩn\\"}"}}]}}]}\n\n',
    "data: [DONE]\n\n",
  ];
  const mockStream = new ReadableStream({
    start(controller) {
      for (const chunk of sseChunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
  const streamStatuses = [];
  const parsedSse = await parseOpenAiSseStream(mockStream, (msg) => streamStatuses.push(msg));
  assert.strictEqual(parsedSse.toolCalls.length, 1);
  assert.strictEqual(parsedSse.toolCalls[0].function.name, "search_dau_policies");
  assert.deepStrictEqual(JSON.parse(parsedSse.toolCalls[0].function.arguments), { query: "giờ chuẩn" });
  assert.ok(streamStatuses.length >= 1, "Parser should emit Vietnamese status hint");

  // 7b. Test AgentLoopService with mock multi-step gateway
  let callCount = 0;
  const mockGateway = {
    async executeToolStep(_messages, _tools, onProgress, onTextDelta) {
      callCount++;
      if (callCount === 1) {
        onProgress?.("Đang tra cứu quy chế & văn bản nội bộ ĐH Kiến trúc Đà Nẵng...");
        return {
          content: "",
          toolCalls: [
            {
              id: "call_policy_1",
              type: "function",
              function: {
                name: "search_dau_policies",
                arguments: JSON.stringify({ query: "giờ chuẩn" }),
              },
            },
          ],
          modelUsed: "mock-gpt-6.1-sol",
          fallbackTier: 1,
          latencyMs: 25,
        };
      }
      for (const tok of ["Theo", " Quyết", " định", " 128/QĐ-ĐHKT,", " định", " mức", " 270 giờ."]) {
        onTextDelta?.(tok);
      }
      return {
        content:
          "Theo Quyết định 128/QĐ-ĐHKT, định mức 270 giờ.\n[FOLLOWUPS: Xem quy đổi đồ án KTS | Kiểm tra số dư phép | Mở bảng chấm công]",
        toolCalls: [],
        modelUsed: "mock-gpt-6.1-sol",
        fallbackTier: 1,
        latencyMs: 30,
      };
    },
  };

  const agentLoop = new AgentLoopService(mockGateway, executor);
  const events = [];
  const loopRes = await agentLoop.run(
    employeeUser,
    { message: "Định mức giờ chuẩn giảng viên là bao nhiêu?", history: [], confirmDraft: false },
    (ev) => events.push(ev)
  );

  const eventTypes = events.map((e) => e.type);
  assert.ok(eventTypes.includes("status"));
  assert.ok(eventTypes.includes("tool_start"));
  assert.ok(eventTypes.includes("tool_done"));
  assert.ok(eventTypes.includes("delta"));
  assert.ok(eventTypes.indexOf("tool_start") < eventTypes.indexOf("tool_done"));
  assert.ok(eventTypes.indexOf("tool_done") < eventTypes.indexOf("delta"));

  const streamedDeltasJoined = events
    .filter((e) => e.type === "delta")
    .map((e) => e.text)
    .join("");
  assert.strictEqual(
    streamedDeltasJoined,
    "Theo Quyết định 128/QĐ-ĐHKT, định mức 270 giờ.",
    "Live streamed tokens must preserve leading/trailing spaces between words"
  );

  assert.ok(loopRes.reply.includes("270 giờ"), "Final reply should contain model response");
  assert.ok(!loopRes.reply.includes("[FOLLOWUPS:"), "Inline followups tag must be stripped from reply");
  assert.strictEqual(loopRes.quickFollowUps?.length, 3);
  assert.strictEqual(loopRes.toolTraces?.length, 1);
  assert.strictEqual(loopRes.toolTraces[0].tool, "search_dau_policies");
  assert.strictEqual(loopRes.meta?.modelUsed, "mock-gpt-6.1-sol");
  assert.strictEqual(loopRes.meta?.fallbackTier, 1);

  // 7c. Test Tier 4 Deterministic Fallback when Gateway throws (e.g. LOCAL_ONLY or no API key)
  const failingGateway = {
    async executeToolStep() {
      throw new Error("Configured to use LOCAL_ONLY fallback");
    },
  };
  const offlineLoop = new AgentLoopService(failingGateway, executor);
  const offlineRes = await offlineLoop.run(employeeUser, {
    message: "Soạn đơn xin nghỉ phép 2 ngày đi việc gia đình",
    history: [],
    confirmDraft: false,
  });
  assert.strictEqual(offlineRes.meta?.fallbackTier, 4);
  assert.strictEqual(offlineRes.meta?.provider, "LOCAL_ONLY");
  assert.strictEqual(offlineRes.draftProposal?.type, "LEAVE");
  assert.strictEqual(offlineRes.draftProposal?.status, "CONFIRMATION_REQUIRED");
  assert.strictEqual(offlineRes.proposedActions?.[0]?.type, "LEAVE_DRAFT");

  // Direct deterministic policy lookup check
  const directFallback = await runAgentDeterministicFallback(
    employeeUser,
    { message: "Quy định BHXH 10.5% và 21.5%?", history: [], confirmDraft: false },
    5
  );
  assert.ok(directFallback.sources?.length >= 1, "Fallback should cite BHXH policy");

  console.log("   ✓ Multi-step ReAct loop and Tier-4 local fallback fully verified");

  console.log("\n================================================================================");
  console.log("  ALL 7 VERIFICATION TEST CASES (MORI PATTERN) PASSED SUCCESSFULLY!");
  console.log("================================================================================");
}

runTests().catch((err) => {
  console.error("Test suite failed:", err);
  process.exit(1);
});
