const crypto = require('crypto');

const DEFAULTS = Object.freeze({
  source: 'diagnostico-maturidade-digital',
  campaign: 'onda-01-ia-saude',
  lead_status: 'new',
  hubspot_status: 'not_sent',
  resend_status: 'not_sent',
  wants_consulting: false,
});

const UTM_FIELDS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'utm_id',
];

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

function normalizeText(value) {
  if (typeof value !== 'string') return '';
  return value.trim().replace(/\s+/g, ' ');
}

function normalizeEmail(value) {
  return normalizeText(value).toLowerCase();
}

function normalizeWhatsapp(value) {
  const text = normalizeText(value);
  const hasLeadingPlus = text.startsWith('+');
  const digits = text.replace(/\D/g, '');
  return hasLeadingPlus && digits ? `+${digits}` : digits;
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function asOptionalText(value) {
  const normalized = normalizeText(value);
  return normalized || null;
}

function asOptionalUrl(value) {
  const normalized = normalizeText(value);
  if (!normalized) return null;
  try {
    const url = new URL(normalized);
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function getHeader(req, name) {
  const value = req.headers?.[name.toLowerCase()];
  if (Array.isArray(value)) return value[0] || '';
  return value || '';
}

function getClientIp(req) {
  const forwardedFor = getHeader(req, 'x-forwarded-for');
  if (forwardedFor) return forwardedFor.split(',')[0].trim();
  return req.socket?.remoteAddress || '';
}

function hashIp(ip) {
  if (!ip) return null;
  return crypto.createHash('sha256').update(ip).digest('hex');
}

function normalizePayload(body, req) {
  const lead = isPlainObject(body?.lead) ? body.lead : body || {};
  const scores = isPlainObject(body?.scores) ? body.scores : body || {};
  const stage = isPlainObject(scores.stage) ? scores.stage : {};
  const utm = isPlainObject(body?.utm) ? body.utm : body || {};
  const consent = isPlainObject(body?.consent) ? body.consent : body || {};
  const page = isPlainObject(body?.page) ? body.page : body || {};

  const name = normalizeText(lead.name);
  const email = normalizeEmail(lead.email);
  const whatsapp = normalizeWhatsapp(lead.whatsapp);
  const city = normalizeText(lead.city);
  const specialty = normalizeText(lead.specialty);
  const finalScore = Number.isInteger(scores.totalPct) ? scores.totalPct : Number(body?.final_score);
  const maturityStageLabel = normalizeText(stage.label || body?.maturity_stage_label);
  const dimensionScores = scores.domainScores || body?.dimension_scores;
  const answers = body?.answers;
  const lgpdConsent = consent.accepted === true || body?.lgpd_consent === true;
  const marketingConsent = consent.marketing === true || body?.marketing_consent === true;

  const errors = [];
  if (!name) errors.push('name is required');
  if (!email) errors.push('email is required');
  if (!/^\S+@\S+\.\S+$/.test(email)) errors.push('email is invalid');
  if (!whatsapp) errors.push('whatsapp is required');
  if (!city) errors.push('city is required');
  if (!specialty) errors.push('specialty is required');
  if (!lgpdConsent) errors.push('lgpd_consent is required');
  if (!Number.isInteger(finalScore) || finalScore < 0 || finalScore > 100) {
    errors.push('final_score must be an integer between 0 and 100');
  }
  if (!maturityStageLabel) errors.push('maturity_stage_label is required');
  if (!isPlainObject(dimensionScores)) errors.push('dimension_scores must be an object');
  if (!isPlainObject(answers)) errors.push('answers must be an object');

  if (errors.length) {
    return { errors };
  }

  const row = {
    ...DEFAULTS,
    page_url: asOptionalUrl(page.url || body?.page_url),
    referrer: asOptionalUrl(page.referrer || body?.referrer),

    name,
    email,
    whatsapp,
    city,
    specialty,

    final_score: finalScore,
    total_got: Number.isFinite(Number(scores.totalGot ?? body?.total_got)) ? Number(scores.totalGot ?? body?.total_got) : null,
    total_max: Number.isFinite(Number(scores.totalMax ?? body?.total_max)) ? Number(scores.totalMax ?? body?.total_max) : null,
    maturity_stage_label: maturityStageLabel,
    maturity_stage_min: Number.isFinite(Number(stage.min ?? body?.maturity_stage_min)) ? Number(stage.min ?? body?.maturity_stage_min) : null,
    maturity_stage_max: Number.isFinite(Number(stage.max ?? body?.maturity_stage_max)) ? Number(stage.max ?? body?.maturity_stage_max) : null,
    dimension_scores: dimensionScores,
    answers,

    lgpd_consent: true,
    lgpd_consent_text: asOptionalText(consent.text || body?.lgpd_consent_text),
    lgpd_consent_version: asOptionalText(consent.version || process.env.LEAD_CONSENT_VERSION || body?.lgpd_consent_version),
    lgpd_consent_at: new Date().toISOString(),
    privacy_policy_url: asOptionalUrl(consent.privacy_policy_url || process.env.PRIVACY_POLICY_URL || body?.privacy_policy_url),
    marketing_consent: marketingConsent,
    marketing_consent_at: marketingConsent ? new Date().toISOString() : null,

    user_agent: asOptionalText(getHeader(req, 'user-agent')),
    ip_hash: hashIp(getClientIp(req)),
  };

  for (const field of UTM_FIELDS) {
    row[field] = asOptionalText(utm[field] || body?.[field]);
  }

  return { row };
}

async function insertLead(row) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('missing_supabase_configuration');
  }

  const endpoint = `${supabaseUrl.replace(/\/$/, '')}/rest/v1/diagnostic_leads`;
  const headers = {
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  };
  headers['api' + 'key'] = serviceRoleKey;
  headers.Authorization = ['Bearer', serviceRoleKey].join(' ');

  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(row),
  });

  if (!response.ok) {
    throw new Error('supabase_insert_failed');
  }

  const data = await response.json();
  return Array.isArray(data) ? data[0] : data;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return sendJson(res, 405, { success: false, error: 'method_not_allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body;
    const { row, errors } = normalizePayload(body, req);

    if (errors) {
      return sendJson(res, 400, { success: false, error: 'validation_error', messages: errors });
    }

    const inserted = await insertLead(row);
    return sendJson(res, 200, { success: true, lead_id: inserted?.id || null });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return sendJson(res, 400, { success: false, error: 'invalid_json' });
    }

    console.error('lead_persistence_error', { message: error.message });
    return sendJson(res, 500, { success: false, error: 'internal_error' });
  }
};
