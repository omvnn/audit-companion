import { confidenceBand } from './import-quality.mjs';

export function canInvokeAiFallback(settings={},quality={},confidence=0){
  return Boolean(settings.ai_fallback_enabled&&quality.passed&&confidenceBand(confidence)==='medium');
}

export async function requestAiFallback(){
  const error=new Error('AI fallback is not configured for this workspace. Reupload a clearer plan or use Create manually.');
  error.code='AI_FALLBACK_UNAVAILABLE';
  throw error;
}
