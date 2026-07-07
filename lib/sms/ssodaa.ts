import { formatPhoneNumber, normalizePhoneNumber } from "@/lib/phone";
import { prisma } from "@/lib/prisma";
import { createDryRunProvider } from "@/lib/sms/dryRunProvider";
import { decryptSecret, maskSecret } from "@/lib/sms/secureSettings";
import type { SmsProvider, SmsProviderStatus, SmsRecipientPayload, SmsSendResult } from "@/lib/sms/types";

const SSODAA_BASE_URL = process.env.SSODAA_API_BASE_URL?.trim() || "https://apis.ssodaa.com";
const SSODAA_PROVIDER = "SSODAA";

export type SsodaaConfig = {
  apiKey: string;
  tokenKey: string;
  defaultSendPhone: string;
  unsubPhone: string;
  senderName: string;
  testReceiverPhone: string;
  isMarketingDefault: boolean;
  source: "database" | "environment";
  lastConnectionStatus?: string | null;
  lastConnectionMessage?: string | null;
  lastConnectionCheckedAt?: Date | null;
};

export async function getSsodaaConfig(academyId: string): Promise<SsodaaConfig | null> {
  const setting = await prisma.smsProviderSetting.findUnique({
    where: { academyId_provider: { academyId, provider: SSODAA_PROVIDER } },
  });

  if (setting?.apiKeyEncrypted || setting?.tokenKeyEncrypted || setting?.defaultSendPhone) {
    const apiKey = decryptSecret(setting.apiKeyEncrypted);
    const tokenKey = decryptSecret(setting.tokenKeyEncrypted);
    return {
      apiKey,
      tokenKey,
      defaultSendPhone: normalizePhoneNumber(setting.defaultSendPhone),
      unsubPhone: normalizePhoneNumber(setting.unsubPhone),
      senderName: setting.senderName?.trim() || process.env.SSODAA_SENDER_NAME?.trim() || "ASC",
      testReceiverPhone: normalizePhoneNumber(setting.testReceiverPhone),
      isMarketingDefault: setting.isMarketingDefault,
      source: "database",
      lastConnectionStatus: setting.lastConnectionStatus,
      lastConnectionMessage: setting.lastConnectionMessage,
      lastConnectionCheckedAt: setting.lastConnectionCheckedAt,
    };
  }

  const apiKey = process.env.SSODAA_API_KEY?.trim() || "";
  const tokenKey = process.env.SSODAA_TOKEN_KEY?.trim() || "";
  const defaultSendPhone = normalizePhoneNumber(process.env.SSODAA_DEFAULT_SEND_PHONE);
  if (!apiKey && !tokenKey && !defaultSendPhone) return null;

  return {
    apiKey,
    tokenKey,
    defaultSendPhone,
    unsubPhone: normalizePhoneNumber(process.env.SSODAA_UNSUB_PHONE),
    senderName: process.env.SSODAA_SENDER_NAME?.trim() || "ASC",
    testReceiverPhone: normalizePhoneNumber(process.env.SSODAA_TEST_RECEIVER_PHONE),
    isMarketingDefault: false,
    source: "environment",
  };
}

export async function getSsodaaProviderStatus(academyId: string): Promise<SmsProviderStatus> {
  let config: SsodaaConfig | null = null;
  let configError: string | null = null;
  try {
    config = await getSsodaaConfig(academyId);
  } catch (error) {
    configError = normalizeSsodaaError(error);
  }

  const dryRun = process.env.SMS_DRY_RUN !== "false";
  const hasApiKey = Boolean(config?.apiKey);
  const hasApiSecret = Boolean(config?.tokenKey);
  const hasSenderNumber = Boolean(config?.defaultSendPhone);
  const canSendActual = !dryRun && hasApiKey && hasApiSecret && hasSenderNumber && config?.lastConnectionStatus !== "FAILED";
  const reason = configError ?? ssodaaDisabledReason({ dryRun, hasApiKey, hasApiSecret, hasSenderNumber, connectionStatus: config?.lastConnectionStatus });

  return {
    provider: "ssodaa",
    dryRun,
    senderNumber: config?.defaultSendPhone || null,
    hasSenderNumber,
    hasApiKey,
    hasApiSecret,
    canSendActual,
    marketingDisabled: false,
    reason: canSendActual ? null : reason,
    connectionStatus: (config?.lastConnectionStatus as SmsProviderStatus["connectionStatus"]) ?? (config ? "NEEDS_CHECK" : null),
    connectionMessage: config?.lastConnectionMessage ?? null,
    checkedAt: config?.lastConnectionCheckedAt?.toISOString() ?? null,
    maskedApiKey: config?.apiKey ? maskSecret(config.apiKey) : null,
    maskedTokenKey: config?.tokenKey ? maskSecret(config.tokenKey) : null,
    unsubPhone: config?.unsubPhone || null,
    senderName: config?.senderName || null,
    testReceiverPhone: config?.testReceiverPhone || null,
    isMarketingDefault: config?.isMarketingDefault ?? false,
    source: config?.source ?? "none",
  };
}

export async function listSendPhones(academyId: string) {
  const config = await requireSsodaaConfig(academyId);
  const response = await ssodaaRequestWithConfig(config, "/sms/sendphone/list", {});
  const phones = extractPhoneList(response);
  if (phones.length === 0 && config.defaultSendPhone) phones.push(config.defaultSendPhone);
  return Array.from(new Set(phones)).map(formatPhoneNumber);
}

export async function getRemainingAmount(academyId: string) {
  const response = await ssodaaRequest(academyId, "/sms/remaining/amount", {});
  return extractAmount(response);
}

export async function getSentMessages(academyId: string, filters: Record<string, string | number | undefined> = {}) {
  return ssodaaRequest(academyId, "/sms/sent/list", filters);
}

export async function sendSms(academyId: string, payload: {
  recipient: SmsRecipientPayload;
  subject?: string;
  sendTime?: string;
  sendPhone?: string;
}) {
  const config = await requireSsodaaConfig(academyId);
  const requestPayload = buildSsodaaSendPayload(config, [payload.recipient], {
    sendPhone: payload.sendPhone,
    sendTime: payload.sendTime,
  });

  const response = await ssodaaRequestWithConfig(config, "/sms/send/sms", requestPayload);
  return {
    response,
    providerMessageId: extractProviderMessageId(response),
    requestPayload,
  };
}

async function sendBulkSms(academyId: string, messages: SmsRecipientPayload[]) {
  const config = await requireSsodaaConfig(academyId);
  const resultByLocalId = new Map<string, SmsSendResult>();

  for (const group of groupBulkMessages(config, messages)) {
    const requestPayload = buildSsodaaSendPayload(config, group);
    try {
      const response = await ssodaaRequestWithConfig(config, "/sms/send/sms", requestPayload);
      const fallbackId = extractProviderMessageId(response);
      const idsByPhone = extractSentMessageIdsByPhone(response);
      for (const message of group) {
        resultByLocalId.set(message.localId, {
          localId: message.localId,
          status: "SUCCESS",
          providerMessageId: idsByPhone.get(message.normalizedPhone) ?? fallbackId,
          requestPayload,
          responsePayload: response,
        });
      }
    } catch (error) {
      const errorMessage = normalizeSsodaaError(error);
      for (const message of group) {
        resultByLocalId.set(message.localId, {
          localId: message.localId,
          status: "FAILED",
          errorMessage,
          requestPayload,
        });
      }
    }
  }

  return messages.map((message) => resultByLocalId.get(message.localId) ?? ({
    localId: message.localId,
    status: "FAILED",
    errorMessage: "쏘다 발송 결과를 확인할 수 없습니다.",
  } satisfies SmsSendResult));
}

export function createSsodaaProvider(academyId: string, status: SmsProviderStatus): SmsProvider {
  if (status.dryRun || !status.canSendActual) return createDryRunProvider({ ...status, dryRun: true, canSendActual: false });

  return {
    name: "ssodaa",
    getProviderStatus() {
      return status;
    },
    async sendMessage(message: SmsRecipientPayload) {
      try {
        const sent = await sendSms(academyId, { recipient: message, subject: message.subject });
        return {
          localId: message.localId,
          status: "SUCCESS",
          providerMessageId: sent.providerMessageId,
          requestPayload: sent.requestPayload,
          responsePayload: sent.response,
        } satisfies SmsSendResult;
      } catch (error) {
        return {
          localId: message.localId,
          status: "FAILED",
          errorMessage: normalizeSsodaaError(error),
        } satisfies SmsSendResult;
      }
    },
    async sendBulkMessages(messages: SmsRecipientPayload[]) {
      return sendBulkSms(academyId, messages);
    },
  };
}

async function requireSsodaaConfig(academyId: string) {
  const config = await getSsodaaConfig(academyId);
  if (!config?.apiKey) throw new Error("쏘다 API Key 값이 설정되어 있지 않습니다.");
  if (!config.tokenKey) throw new Error("쏘다 Token Key 값이 설정되어 있지 않습니다.");
  if (!config.defaultSendPhone) throw new Error("쏘다 기본 발신번호가 설정되어 있지 않습니다.");
  return config;
}

async function ssodaaRequest(academyId: string, path: string, body: Record<string, unknown>) {
  const config = await requireSsodaaConfig(academyId);
  return ssodaaRequestWithConfig(config, path, body);
}

async function ssodaaRequestWithConfig(config: SsodaaConfig, path: string, body: Record<string, unknown>) {
  const response = await fetch(`${SSODAA_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "x-api-key": config.apiKey,
    },
    body: JSON.stringify({ token_key: config.tokenKey, ...body }),
    cache: "no-store",
  });

  const text = await response.text();
  let json: unknown = text;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text };
  }

  if (!response.ok || isSsodaaFailure(json)) {
    throw new SsodaaApiError(response.status, json);
  }

  return json;
}

function buildSsodaaSendPayload(config: SsodaaConfig, messages: SmsRecipientPayload[], options: { sendTime?: string; sendPhone?: string } = {}) {
  const first = messages[0];
  if (!first) throw new Error("쏘다 발송 대상이 없습니다.");
  const isMarketing = Boolean(first.isMarketing);
  return {
    msg_type: "sms",
    dest_phone: messages.map((message) => message.normalizedPhone).join("|"),
    send_phone: normalizePhoneNumber(options.sendPhone) || config.defaultSendPhone,
    msg_body: buildSsodaaMessageBody(first.messageText, isMarketing, config.unsubPhone),
    send_time: options.sendTime || "",
    msg_ad: isMarketing ? "Y" : "N",
    unsub_phone: isMarketing ? config.unsubPhone : "",
  };
}

function groupBulkMessages(config: SsodaaConfig, messages: SmsRecipientPayload[]) {
  const groups = new Map<string, SmsRecipientPayload[]>();
  for (const message of messages) {
    const isMarketing = Boolean(message.isMarketing);
    const key = JSON.stringify({
      body: buildSsodaaMessageBody(message.messageText, isMarketing, config.unsubPhone),
      sendPhone: config.defaultSendPhone,
      msgAd: isMarketing ? "Y" : "N",
      unsubPhone: isMarketing ? config.unsubPhone : "",
    });
    const group = groups.get(key) ?? [];
    group.push(message);
    groups.set(key, group);
  }
  return [...groups.values()];
}

function isSsodaaFailure(value: unknown) {
  if (!value || typeof value !== "object") return false;
  const obj = value as Record<string, unknown>;
  const code = String(obj.code ?? obj.result_code ?? obj.resultCode ?? obj.status ?? "").toLowerCase();
  const success = obj.success;
  if (success === false) return true;
  return Boolean(code && !["0", "00", "0000", "success", "ok", "200"].includes(code));
}

class SsodaaApiError extends Error {
  constructor(public status: number, public payload: unknown) {
    super("Ssodaa API request failed");
  }
}

export function normalizeSsodaaError(error: unknown) {
  if (error instanceof SsodaaApiError) {
    const message = extractMessage(error.payload);
    if (message) return message;
    if (error.status === 401 || error.status === 403) return "API Key, Token Key 또는 서버 IP 등록 상태를 확인해주세요.";
    return `쏘다 API 요청에 실패했습니다. 상태 코드: ${error.status}`;
  }
  if (error instanceof Error) return error.message;
  return "쏘다 API 요청에 실패했습니다.";
}

function extractMessage(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  const obj = value as Record<string, unknown>;
  const candidates = [obj.message, obj.msg, obj.error, obj.errorMessage, obj.result_msg, obj.resultMessage];
  const found = candidates.find((item) => typeof item === "string" && item.trim());
  return typeof found === "string" ? found : null;
}

function extractPhoneList(value: unknown): string[] {
  const phones = new Set<string>();
  const arrays: unknown[] = [];
  if (Array.isArray(value)) arrays.push(value);
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    for (const key of ["content", "data", "list", "items", "sendphones", "sendPhones", "send_phone", "sendPhone", "send_phone_list", "sendPhoneList"]) {
      if (Array.isArray(obj[key])) arrays.push(obj[key]);
    }
  }

  for (const items of arrays) collectPhones(items, phones);
  if (phones.size === 0) collectPhones(value, phones);
  return [...phones];
}

function collectPhones(value: unknown, phones: Set<string>) {
  if (typeof value === "string" || typeof value === "number") {
    addPhoneCandidate(value, phones);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectPhones(item, phones);
    return;
  }
  if (!value || typeof value !== "object") return;

  const row = value as Record<string, unknown>;
  for (const key of ["send_phone", "sendPhone", "phone", "number", "send_phone_number", "sendPhoneNumber", "callback", "callbackPhone"]) {
    addPhoneCandidate(row[key], phones);
  }
  for (const key of ["content", "data", "list", "items", "sendphones", "sendPhones", "send_phone_list", "sendPhoneList"]) {
    collectPhones(row[key], phones);
  }
}

function addPhoneCandidate(value: unknown, phones: Set<string>) {
  if (typeof value !== "string" && typeof value !== "number") return;
  const normalized = normalizePhoneNumber(String(value));
  if (normalized.length >= 8 && normalized.length <= 11) phones.add(normalized);
}

function extractAmount(value: unknown): number | null {
  const candidates: number[] = [];
  collectAmounts(value, candidates);
  return candidates.find((number) => number > 0) ?? candidates[0] ?? null;
}

function collectAmounts(value: unknown, candidates: number[]) {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    for (const item of value) collectAmounts(item, candidates);
    return;
  }

  const obj = value as Record<string, unknown>;
  for (const key of [
    "amount",
    "remaining_amount",
    "remainingAmount",
    "remain_amount",
    "remainAmount",
    "point",
    "points",
    "remaining_point",
    "remainingPoint",
    "remain_point",
    "remainPoint",
    "currentPoint",
    "usablePoint",
    "balance",
    "cash",
    "money",
    "sms_point",
    "smsPoint",
  ]) {
    const number = parseAmount(obj[key]);
    if (number !== null) candidates.push(number);
  }

  for (const key of ["content", "data", "result", "results", "item", "items", "info", "account", "balance"]) {
    collectAmounts(obj[key], candidates);
  }
}

function parseAmount(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const parsed = Number(value.replace(/,/g, "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function extractProviderMessageId(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const obj = value as Record<string, unknown>;
  const nested = obj.data && typeof obj.data === "object" ? (obj.data as Record<string, unknown>) : obj;
  const content = obj.content && typeof obj.content === "object" ? (obj.content as Record<string, unknown>) : null;
  const sentMessages = Array.isArray(content?.sent_messages) ? content.sent_messages : Array.isArray(content?.sentMessages) ? content.sentMessages : null;
  const firstSentMessage = sentMessages?.[0] && typeof sentMessages[0] === "object" ? (sentMessages[0] as Record<string, unknown>) : null;
  const id =
    nested.msg_id ??
    nested.messageId ??
    nested.message_id ??
    nested.id ??
    nested.group_id ??
    nested.groupId ??
    content?.msg_id ??
    content?.messageId ??
    content?.message_id ??
    firstSentMessage?.msg_id ??
    firstSentMessage?.messageId ??
    firstSentMessage?.message_id;
  return id ? String(id) : null;
}

function extractSentMessageIdsByPhone(value: unknown) {
  const idsByPhone = new Map<string, string>();
  if (!value || typeof value !== "object") return idsByPhone;
  const obj = value as Record<string, unknown>;
  const content = obj.content && typeof obj.content === "object" ? (obj.content as Record<string, unknown>) : null;
  const data = obj.data && typeof obj.data === "object" ? (obj.data as Record<string, unknown>) : null;
  const sentMessages = [
    ...(Array.isArray(content?.sent_messages) ? content.sent_messages : []),
    ...(Array.isArray(content?.sentMessages) ? content.sentMessages : []),
    ...(Array.isArray(data?.sent_messages) ? data.sent_messages : []),
    ...(Array.isArray(data?.sentMessages) ? data.sentMessages : []),
  ];

  for (const item of sentMessages) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const phone = normalizePhoneNumber(String(row.dest_phone ?? row.destPhone ?? ""));
    const id = row.msg_id ?? row.messageId ?? row.message_id;
    if (phone && id) idsByPhone.set(phone, String(id));
  }
  return idsByPhone;
}

function buildSsodaaMessageBody(message: string, isMarketing: boolean, unsubPhone: string) {
  if (!isMarketing) return message;
  const prefix = message.trimStart().startsWith("(광고)") ? "" : "(광고) ";
  const unsub = unsubPhone ? `\n무료수신거부 ${formatPhoneNumber(unsubPhone)}` : "";
  return `${prefix}${message}${message.includes("무료수신거부") ? "" : unsub}`;
}

function ssodaaDisabledReason({ dryRun, hasApiKey, hasApiSecret, hasSenderNumber, connectionStatus }: {
  dryRun: boolean;
  hasApiKey: boolean;
  hasApiSecret: boolean;
  hasSenderNumber: boolean;
  connectionStatus?: string | null;
}) {
  if (dryRun) return "SMS_DRY_RUN 값이 false가 아니므로 실제 발송이 차단되어 있습니다.";
  if (!hasApiKey) return "쏘다 API Key 값이 설정되어 있지 않습니다.";
  if (!hasApiSecret) return "쏘다 Token Key 값이 설정되어 있지 않습니다.";
  if (!hasSenderNumber) return "쏘다 기본 발신번호가 설정되어 있지 않습니다.";
  if (connectionStatus === "FAILED") return "쏘다 API 연결 테스트가 실패 상태입니다.";
  return "쏘다 API 설정 확인이 필요합니다.";
}
