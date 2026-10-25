// The ONLY file that knows about the AI provider (Replicate, running the IDM-VTON model).
// To change the provider, rewrite startTryOn and checkTryOn here. Nothing else needs to change.
//
// The provider works asynchronously: startTryOn returns a job id immediately,
// and checkTryOn asks later whether the job has finished.
const environment = require('../config/environment');
const AppError = require('../utils/AppError');

const REPLICATE_API_URL = 'https://api.replicate.com/v1';
const REQUEST_TIMEOUT_MS = 30000;

function assertConfigured() {
  const { replicateApiToken, replicateModelVersion } = environment.tryOn;
  if (!replicateApiToken || !replicateModelVersion) {
    throw new AppError(
      'Virtual Try-On is not set up on this server. The administrator must set REPLICATE_API_TOKEN and REPLICATE_MODEL_VERSION in backend/.env.',
      503,
      'TRYON_NOT_CONFIGURED'
    );
  }
}

async function callReplicate(apiPath, options = {}) {
  let response;
  try {
    response = await fetch(`${REPLICATE_API_URL}${apiPath}`, {
      ...options,
      headers: { Authorization: `Bearer ${environment.tryOn.replicateApiToken}`, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    throw new AppError('The AI service could not be reached. Please try again later.', 503, 'TRYON_PROVIDER_UNREACHABLE');
  }

  if (!response.ok) {
    const details = await response.text().catch(() => '');
    console.error('Replicate error:', response.status, details.slice(0, 300));
    const message = response.status === 401
      ? 'The AI service rejected the server credentials. Please contact the administrator.'
      : 'The AI service returned an error. Please try again later.';
    throw new AppError(message, 502, 'TRYON_PROVIDER_ERROR');
  }
  return response.json();
}

// personImage is a JPEG buffer. garmentImageUrl must be a public URL the provider can download.
async function startTryOn({ personImage, garmentImageUrl, garmentDescription, category }) {
  assertConfigured();
  const prediction = await callReplicate('/predictions', {
    method: 'POST',
    body: JSON.stringify({
      version: environment.tryOn.replicateModelVersion,
      input: {
        human_img: `data:image/jpeg;base64,${personImage.toString('base64')}`,
        garm_img: garmentImageUrl,
        garment_des: garmentDescription,
        category, // upper_body, lower_body or dresses
        crop: false,
        steps: 30,
      },
    }),
  });
  return { jobId: prediction.id };
}

async function downloadResultImage(url) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
    if (!response.ok) throw new Error(`status ${response.status}`);
    return Buffer.from(await response.arrayBuffer());
  } catch (error) {
    console.error('Could not download the generated image:', error.message);
    throw new AppError('The generated image could not be downloaded. Please try again.', 502, 'TRYON_PROVIDER_ERROR');
  }
}

// Returns { status: 'processing' } or { status: 'failed', message } or { status: 'completed', image }.
async function checkTryOn(jobId) {
  assertConfigured();
  const prediction = await callReplicate(`/predictions/${jobId}`);

  if (prediction.status === 'succeeded') {
    const imageUrl = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;
    return { status: 'completed', image: await downloadResultImage(imageUrl) };
  }
  if (prediction.status === 'failed' || prediction.status === 'canceled') {
    console.error('Try-on job failed:', prediction.error);
    return { status: 'failed', message: 'The AI could not create a preview. Try a clear, front-facing photo with plain clothing.' };
  }
  return { status: 'processing' };
}

module.exports = { assertConfigured, startTryOn, checkTryOn };
