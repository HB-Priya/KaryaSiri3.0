/**
 * Thin wrapper around Bhashini — the Government of India's translation/
 * speech API built under the National Language Translation Mission,
 * specifically for Indian languages. Free, but requires an approved
 * account (see .env.example for how to get BHASHINI_USER_ID/BHASHINI_API_KEY).
 *
 * How Bhashini's API works, in short: you first call a "pipeline config"
 * endpoint with your account credentials, which hands back (a) a short-lived
 * inference API key and (b) which underlying model ("serviceId") to use for
 * each source→target language pair on this pipeline. You then send the text
 * to the inference endpoint using that key and serviceId. This module caches
 * the pipeline config in memory so that lookup only happens once per server
 * run, not once per translation request.
 */

const PIPELINE_CONFIG_ENDPOINT = 'https://meity-auth.ulcacontrib.org/ulca/apis/v0/model/getModelsPipeline';
const DEFAULT_INFERENCE_ENDPOINT = 'https://dhruva-api.bhashini.gov.in/services/inference/pipeline';
// Bhashini's well-known public "default" translation pipeline. Same one used
// by most community integrations; covers all 22 scheduled Indian languages.
const PIPELINE_ID = '64392f96daac500b55c543cd';

// Node's built-in fetch (undici) does NOT automatically pick up
// HTTP_PROXY/HTTPS_PROXY the way npm/most other tools do — a very common
// cause of a bare "fetch failed" on a school/office network or behind a
// VPN, even though `npm install` itself worked fine. If a proxy is set in
// the environment, route fetch through it explicitly.
try {
  // eslint-disable-next-line global-require
  const { setGlobalDispatcher, ProxyAgent } = require('undici');
  const proxyUrl =
    process.env.HTTPS_PROXY || process.env.https_proxy || process.env.HTTP_PROXY || process.env.http_proxy;
  if (proxyUrl) {
    setGlobalDispatcher(new ProxyAgent(proxyUrl));
    // eslint-disable-next-line no-console
    console.log(`[translate] Routing requests through proxy from env: ${proxyUrl}`);
  }
} catch (e) {
  // undici not installed, or npm install hasn't been run — fetch just
  // proceeds without proxy support; the error message below still points
  // at the likely cause if a request then fails.
}

function diagnoseNetworkError(err) {
  const causeCode = err?.cause?.code || err?.code;
  const hints = {
    ENOTFOUND: 'DNS lookup failed — check your internet connection, or a firewall/DNS filter may be blocking the Bhashini API.',
    ECONNREFUSED: 'Connection refused — a firewall or antivirus may be blocking outbound Node.js connections.',
    ETIMEDOUT: 'Connection timed out — check your internet connection, or a firewall may be silently dropping the request.',
    ECONNRESET: 'Connection reset partway through — often a proxy or antivirus SSL-inspection interfering with the request.',
    CERT_HAS_EXPIRED: "The remote server's certificate looks expired to your machine — check your system clock is correct.",
    DEPTH_ZERO_SELF_SIGNED_CERT:
      'Your antivirus or a network proxy appears to be intercepting HTTPS with its own certificate, which Node rejects. Try temporarily disabling HTTPS/SSL scanning in your antivirus (common with Avast/AVG/Kaspersky/Bitdefender), or add an exception for Node.js.',
    UNABLE_TO_VERIFY_LEAF_SIGNATURE:
      'Same as above — something between your machine and the internet (antivirus SSL scanning, or a corporate/school proxy) is intercepting HTTPS in a way Node does not trust.',
    SELF_SIGNED_CERT_IN_CHAIN:
      'Same as above — something between your machine and the internet (antivirus SSL scanning, or a corporate/school proxy) is intercepting HTTPS in a way Node does not trust.',
  };
  if (causeCode && hints[causeCode]) return `${hints[causeCode]} (${causeCode})`;
  if (causeCode) return `Underlying error code: ${causeCode}. This is usually a local network/firewall/antivirus/proxy issue, not a problem with the code.`;
  return null;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithDiagnostics(url, options, attempt = 1) {
  try {
    return await fetch(url, options);
  } catch (err) {
    const diagnosis = diagnoseNetworkError(err);
    if (attempt < 3 && !diagnosis) {
      // Unknown/transient failure — brief backoff and one retry before giving up.
      await delay(400 * attempt);
      return fetchWithDiagnostics(url, options, attempt + 1);
    }
    const wrapped = new Error(
      `Could not reach Bhashini (${url.split('?')[0]}). ${
        diagnosis ||
        'This is almost always local (internet connection, firewall, antivirus HTTPS scanning, or a proxy/VPN Node did not pick up), not a bug in this code.'
      } If HTTP_PROXY/HTTPS_PROXY isn't already set in your environment and you're on a school/office network or VPN, try setting it and re-running. Raw error: ${err.message}`
    );
    wrapped.code = 'NETWORK_ERROR';
    wrapped.cause = err;
    throw wrapped;
  }
}

// The 5 South Indian languages this app targets. Bhashini follows ISO-639
// codes — Konkani is "gom" (Goan Konkani), same as everywhere else in ISO-639.
const SOUTH_INDIAN_LANGS = {
  ta: 'Tamil',
  te: 'Telugu',
  kn: 'Kannada',
  ml: 'Malayalam',
  gom: 'Konkani',
};

const MAX_SENTENCES_PER_CALL = 40; // keep individual requests small & fast

function credentials() {
  const userID = process.env.BHASHINI_USER_ID;
  const ulcaApiKey = process.env.BHASHINI_API_KEY;
  if (!userID || !ulcaApiKey) {
    const err = new Error(
      'BHASHINI_USER_ID / BHASHINI_API_KEY are not set in server/.env. ' +
        'Get them from your approved account at https://bhashini.gov.in — "My Profile" > generate API key.'
    );
    err.code = 'NO_API_KEY';
    throw err;
  }
  return { userID, ulcaApiKey };
}

// Cached across requests for the life of the server process.
let pipelineCache = null;
let pipelineFetchInFlight = null;

async function getPipelineConfig() {
  if (pipelineCache) return pipelineCache;
  if (pipelineFetchInFlight) return pipelineFetchInFlight;

  const { userID, ulcaApiKey } = credentials();

  pipelineFetchInFlight = (async () => {
    const res = await fetchWithDiagnostics(PIPELINE_CONFIG_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', userID, ulcaApiKey },
      body: JSON.stringify({
        pipelineTasks: [{ taskType: 'translation' }],
        pipelineRequestConfig: { pipelineId: PIPELINE_ID },
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      const err = new Error(data?.message || `Bhashini pipeline config error (HTTP ${res.status})`);
      err.code = 'TRANSLATE_API_ERROR';
      throw err;
    }

    const inferenceApiKey = data?.pipelineInferenceAPIEndPoint?.inferenceApiKey?.value;
    const callbackUrl = data?.pipelineInferenceAPIEndPoint?.callbackUrl || DEFAULT_INFERENCE_ENDPOINT;
    if (!inferenceApiKey) {
      throw new Error('Bhashini pipeline config response did not include an inference API key.');
    }

    // Map { sourceLang: { targetLang: serviceId } } from the config Bhashini returns.
    const services = {};
    for (const pipeline of data.pipelineResponseConfig || []) {
      if (pipeline.taskType !== 'translation') continue;
      for (const langConfig of pipeline.config || []) {
        const src = langConfig.language.sourceLanguage;
        const tgt = langConfig.language.targetLanguage;
        services[src] = services[src] || {};
        services[src][tgt] = langConfig.serviceId;
      }
    }

    pipelineCache = { inferenceApiKey, callbackUrl, services };
    return pipelineCache;
  })();

  try {
    return await pipelineFetchInFlight;
  } finally {
    pipelineFetchInFlight = null;
  }
}

async function translateChunk(texts, target, source, pipeline) {
  const serviceId = pipeline.services[source] && pipeline.services[source][target];
  if (!serviceId) {
    const available = Object.keys(pipeline.services[source] || {}).join(', ') || '(none)';
    const err = new Error(
      `Bhashini has no translation service configured for "${source}" -> "${target}" on this pipeline. ` +
        `Available targets from "${source}": ${available}`
    );
    err.code = 'TRANSLATE_API_ERROR';
    throw err;
  }

  const payload = {
    pipelineTasks: [
      {
        taskType: 'translation',
        config: { language: { sourceLanguage: source, targetLanguage: target }, serviceId },
      },
    ],
    inputData: { input: texts.map((t) => ({ source: t })) },
  };

  const res = await fetchWithDiagnostics(pipeline.callbackUrl, {
    method: 'POST',
    headers: { Accept: '*/*', Authorization: pipeline.inferenceApiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data?.message || `Bhashini translation error (HTTP ${res.status})`);
    err.code = 'TRANSLATE_API_ERROR';
    throw err;
  }

  const outputs = data?.pipelineResponse?.[0]?.output || [];
  return texts.map((_, i) => outputs[i]?.target || '');
}

/**
 * Translates an array of strings. Empty entries are skipped (Bhashini errors
 * on blank input) and spliced back in as empty strings, matching the shape
 * of the input array. Large arrays are sent in chunks to keep each HTTP
 * request small.
 */
async function translateBatch(texts, target, source = 'en') {
  const nonEmptyIdx = [];
  const nonEmptyTexts = [];
  texts.forEach((t, i) => {
    if (t && t.trim()) {
      nonEmptyIdx.push(i);
      nonEmptyTexts.push(t);
    }
  });

  const out = new Array(texts.length).fill('');
  if (nonEmptyTexts.length === 0) return out;

  const pipeline = await getPipelineConfig();

  for (let start = 0; start < nonEmptyTexts.length; start += MAX_SENTENCES_PER_CALL) {
    const chunk = nonEmptyTexts.slice(start, start + MAX_SENTENCES_PER_CALL);
    const translatedChunk = await translateChunk(chunk, target, source, pipeline);
    translatedChunk.forEach((tr, j) => {
      out[nonEmptyIdx[start + j]] = tr;
    });
  }

  return out;
}

/** Translates a single string. */
async function translateText(text, target, source = 'en') {
  if (!text || !text.trim()) return text || '';
  const [result] = await translateBatch([text], target, source);
  return result;
}

module.exports = { translateText, translateBatch, SOUTH_INDIAN_LANGS };
